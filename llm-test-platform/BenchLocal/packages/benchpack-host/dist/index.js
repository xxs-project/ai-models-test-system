import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants as fsConstants, promises as fs } from "node:fs";
import { createServer } from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { expandHomePath, getConfigPath, saveConfigFile } from "@benchlocal/core";
import { DEFAULT_BENCHLOCAL_GENERATION } from "@benchlocal/core";
const execFileAsync = promisify(execFile);
let dockerExecutablePathPromise = null;
const verifierContainerLocks = new Map();
const runSummaryLocks = new Map();
const SUPPORTED_BENCHLOCAL_HOST_FEATURES = ["inferenceEndpoints", "dockerInferenceEndpoints"];
async function readJsonFile(targetPath) {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw);
}
function isStringArray(value) {
    return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
function isBenchPackCompatibilityRequirements(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value;
    const benchlocal = candidate.benchlocal;
    if (benchlocal !== undefined) {
        if (typeof benchlocal !== "object" || benchlocal === null) {
            return false;
        }
        const runtime = benchlocal;
        if (runtime.minVersion !== undefined && typeof runtime.minVersion !== "string") {
            return false;
        }
        if (runtime.maxVersionExclusive !== undefined && typeof runtime.maxVersionExclusive !== "string") {
            return false;
        }
    }
    if (candidate.hostFeatures !== undefined && !isStringArray(candidate.hostFeatures)) {
        return false;
    }
    return true;
}
function parseSemanticVersion(input) {
    const normalized = input.trim();
    if (!normalized) {
        return null;
    }
    const [coreAndPrerelease] = normalized.split("+", 1);
    const [core, prereleaseRaw] = coreAndPrerelease.split("-", 2);
    const parts = core.split(".");
    if (parts.length > 3 || parts.length === 0) {
        return null;
    }
    const [majorRaw, minorRaw = "0", patchRaw = "0"] = parts;
    if (![majorRaw, minorRaw, patchRaw].every((entry) => /^\d+$/.test(entry))) {
        return null;
    }
    return {
        major: Number(majorRaw),
        minor: Number(minorRaw),
        patch: Number(patchRaw),
        prerelease: prereleaseRaw ? prereleaseRaw.split(".").filter(Boolean) : []
    };
}
function comparePrereleaseIdentifiers(left, right) {
    const maxLength = Math.max(left.length, right.length);
    for (let index = 0; index < maxLength; index += 1) {
        const leftValue = left[index];
        const rightValue = right[index];
        if (leftValue === undefined) {
            return -1;
        }
        if (rightValue === undefined) {
            return 1;
        }
        const leftNumeric = /^\d+$/.test(leftValue);
        const rightNumeric = /^\d+$/.test(rightValue);
        if (leftNumeric && rightNumeric) {
            const difference = Number(leftValue) - Number(rightValue);
            if (difference !== 0) {
                return difference < 0 ? -1 : 1;
            }
            continue;
        }
        if (leftNumeric !== rightNumeric) {
            return leftNumeric ? -1 : 1;
        }
        const comparison = leftValue.localeCompare(rightValue);
        if (comparison !== 0) {
            return comparison < 0 ? -1 : 1;
        }
    }
    return 0;
}
function compareSemanticVersions(leftRaw, rightRaw) {
    const left = parseSemanticVersion(leftRaw);
    const right = parseSemanticVersion(rightRaw);
    if (!left || !right) {
        return null;
    }
    for (const key of ["major", "minor", "patch"]) {
        if (left[key] !== right[key]) {
            return left[key] < right[key] ? -1 : 1;
        }
    }
    if (left.prerelease.length === 0 && right.prerelease.length === 0) {
        return 0;
    }
    if (left.prerelease.length === 0) {
        return 1;
    }
    if (right.prerelease.length === 0) {
        return -1;
    }
    return comparePrereleaseIdentifiers(left.prerelease, right.prerelease);
}
function getBenchLocalHostFeatures(runtime) {
    return new Set(runtime?.hostFeatures?.length ? runtime.hostFeatures : SUPPORTED_BENCHLOCAL_HOST_FEATURES);
}
function getBenchPackCompatibilityError(manifest, runtime) {
    const requirements = manifest.requirements;
    if (!requirements) {
        return undefined;
    }
    const benchLocalVersion = runtime?.benchLocalVersion?.trim();
    const minVersion = requirements.benchlocal?.minVersion?.trim();
    const maxVersionExclusive = requirements.benchlocal?.maxVersionExclusive?.trim();
    if (minVersion) {
        if (!benchLocalVersion) {
            return `This Bench Pack requires BenchLocal >= ${minVersion}.`;
        }
        const comparison = compareSemanticVersions(benchLocalVersion, minVersion);
        if (comparison === null) {
            return `This Bench Pack declares an invalid minimum BenchLocal version requirement: ${minVersion}.`;
        }
        if (comparison < 0) {
            return `This Bench Pack requires BenchLocal >= ${minVersion}. Current client: ${benchLocalVersion}.`;
        }
    }
    if (maxVersionExclusive) {
        if (!benchLocalVersion) {
            return `This Bench Pack requires BenchLocal < ${maxVersionExclusive}.`;
        }
        const comparison = compareSemanticVersions(benchLocalVersion, maxVersionExclusive);
        if (comparison === null) {
            return `This Bench Pack declares an invalid maximum BenchLocal version requirement: ${maxVersionExclusive}.`;
        }
        if (comparison >= 0) {
            return `This Bench Pack requires BenchLocal < ${maxVersionExclusive}. Current client: ${benchLocalVersion}.`;
        }
    }
    const requiredHostFeatures = requirements.hostFeatures?.map((feature) => feature.trim()).filter(Boolean) ?? [];
    if (requiredHostFeatures.length > 0) {
        const availableFeatures = getBenchLocalHostFeatures(runtime);
        const missingFeatures = requiredHostFeatures.filter((feature) => !availableFeatures.has(feature));
        if (missingFeatures.length > 0) {
            return `This Bench Pack requires unsupported BenchLocal host features: ${missingFeatures.join(", ")}.`;
        }
    }
    return undefined;
}
function isBenchPackRegistryEntry(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value;
    const source = candidate.source;
    return (typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.version === "string" &&
        typeof source === "object" &&
        source !== null &&
        ((source.type === "github" && typeof source.repo === "string" && typeof source.tag === "string") ||
            (source.type === "archive" && typeof source.url === "string")));
}
function isBenchPackRegistry(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value;
    return candidate.schemaVersion === 1 && Array.isArray(candidate.packs) && candidate.packs.every(isBenchPackRegistryEntry);
}
async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
async function isExecutableFile(targetPath) {
    try {
        await fs.access(targetPath, fsConstants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
function getNormalizedPathEnv() {
    const pathEntries = new Set((process.env.PATH ?? "")
        .split(path.delimiter)
        .map((entry) => entry.trim())
        .filter(Boolean));
    for (const candidate of [
        "/usr/local/bin",
        "/opt/homebrew/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
        "/Applications/Docker.app/Contents/Resources/bin",
        "/Applications/OrbStack.app/Contents/MacOS/xbin",
        "/Applications/OrbStack.app/Contents/MacOS/bin"
    ]) {
        pathEntries.add(candidate);
    }
    return Array.from(pathEntries).join(path.delimiter);
}
async function resolveDockerExecutable() {
    if (!dockerExecutablePathPromise) {
        dockerExecutablePathPromise = (async () => {
            const candidates = [
                ...getNormalizedPathEnv()
                    .split(path.delimiter)
                    .filter(Boolean)
                    .map((directory) => path.join(directory, "docker")),
                "/usr/local/bin/docker",
                "/opt/homebrew/bin/docker",
                "/Applications/Docker.app/Contents/Resources/bin/docker",
                "/Applications/OrbStack.app/Contents/MacOS/xbin/docker",
                "/Applications/OrbStack.app/Contents/MacOS/bin/docker"
            ];
            const seen = new Set();
            for (const candidate of candidates) {
                if (seen.has(candidate)) {
                    continue;
                }
                seen.add(candidate);
                if (await isExecutableFile(candidate)) {
                    return candidate;
                }
            }
            return null;
        })();
    }
    return dockerExecutablePathPromise;
}
function getBenchLocalWorkspaceRoot() {
    return process.cwd();
}
async function resolveBenchLocalRuntimeRoot() {
    const resourcesPath = process.resourcesPath;
    const packagedRoot = resourcesPath ? path.join(resourcesPath, "benchlocal-runtime") : undefined;
    if (packagedRoot && (await pathExists(packagedRoot))) {
        return packagedRoot;
    }
    const workspaceRoot = getBenchLocalWorkspaceRoot();
    if (await pathExists(workspaceRoot)) {
        return workspaceRoot;
    }
    throw new Error("BenchLocal runtime resources are unavailable for Bench Pack installation.");
}
function sanitizeRuntimeName(input) {
    return input.replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
function getVerifierContainerName(benchPackId, verifierId) {
    return `benchlocal-${sanitizeRuntimeName(benchPackId)}-${sanitizeRuntimeName(verifierId)}`;
}
function getGitHubArchiveUrl(repo, tag) {
    return `https://ghproxy.net/https://github.com/${repo}/archive/refs/tags/${tag}.tar.gz`;
}
function getBenchPackBaseDir(config, benchPackId) {
    return path.join(expandHomePath(config.benchpack_storage_dir), benchPackId);
}
function getBenchPackVersionsDir(baseDir) {
    return path.join(baseDir, "versions");
}
function getBenchPackCurrentPointerPath(baseDir) {
    return path.join(baseDir, "current.json");
}
async function readBenchPackCurrentVersion(baseDir) {
    const pointerPath = getBenchPackCurrentPointerPath(baseDir);
    if (!(await pathExists(pointerPath))) {
        return null;
    }
    const parsed = await readJsonFile(pointerPath);
    return typeof parsed.version === "string" && parsed.version.trim() ? parsed.version.trim() : null;
}
async function writeBenchPackCurrentVersion(baseDir, version) {
    const pointerPath = getBenchPackCurrentPointerPath(baseDir);
    const tempPath = `${pointerPath}.tmp-${randomUUID().slice(0, 8)}`;
    await fs.writeFile(tempPath, JSON.stringify({
        version,
        updatedAt: new Date().toISOString()
    }, null, 2), "utf8");
    await fs.rename(tempPath, pointerPath);
}
async function removeBenchPackCurrentVersion(baseDir) {
    await fs.rm(getBenchPackCurrentPointerPath(baseDir), { force: true });
}
async function cleanupBenchPackStaging(baseDir) {
    if (!(await pathExists(baseDir))) {
        return;
    }
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    await Promise.all(entries
        .filter((entry) => entry.name.startsWith(".staging-"))
        .map((entry) => fs.rm(path.join(baseDir, entry.name), { recursive: true, force: true })));
}
function sanitizeBenchPackVersion(input) {
    return input.replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "") || randomUUID().slice(0, 8);
}
function createAbortError(signal) {
    const reason = signal?.reason;
    if (reason instanceof Error) {
        return reason;
    }
    return new Error("Run cancelled by user.");
}
async function waitForPromiseWithAbort(promise, signal) {
    if (!signal) {
        return promise;
    }
    throwIfAborted(signal);
    return await new Promise((resolve, reject) => {
        const onAbort = () => {
            signal.removeEventListener("abort", onAbort);
            reject(createAbortError(signal));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then((value) => {
            signal.removeEventListener("abort", onAbort);
            resolve(value);
        }, (error) => {
            signal.removeEventListener("abort", onAbort);
            reject(error);
        });
    });
}
async function waitForAbortableDelay(delayMs, signal) {
    if (delayMs <= 0) {
        throwIfAborted(signal);
        return;
    }
    if (!signal) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return;
    }
    throwIfAborted(signal);
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, delayMs);
        const onAbort = () => {
            clearTimeout(timeout);
            signal.removeEventListener("abort", onAbort);
            reject(createAbortError(signal));
        };
        signal.addEventListener("abort", onAbort, { once: true });
    });
}
async function runDockerCommand(args, options) {
    const dockerExecutable = await resolveDockerExecutable();
    if (!dockerExecutable) {
        const error = new Error("Docker CLI is not installed.");
        error.code = "ENOENT";
        throw error;
    }
    const { stdout } = await execFileAsync(dockerExecutable, args, {
        env: {
            ...process.env,
            PATH: getNormalizedPathEnv()
        },
        maxBuffer: 4 * 1024 * 1024,
        signal: options?.abortSignal
    });
    return stdout.trim();
}
async function runDockerCliVersionCheck() {
    try {
        const dockerExecutable = await resolveDockerExecutable();
        if (!dockerExecutable) {
            return false;
        }
        await execFileAsync(dockerExecutable, ["--version"], {
            env: {
                ...process.env,
                PATH: getNormalizedPathEnv()
            },
            maxBuffer: 1024 * 1024
        });
        return true;
    }
    catch (error) {
        if (error?.code === "ENOENT") {
            return false;
        }
        return true;
    }
}
function normalizeDockerErrorMessage(error) {
    if (!(error instanceof Error)) {
        return "Docker is unavailable.";
    }
    const candidate = error.message.trim();
    return candidate || "Docker is unavailable.";
}
function getSimulatedDockerAvailability() {
    const raw = process.env.BENCHLOCAL_SIMULATE_DOCKER?.trim().toLowerCase();
    if (!raw) {
        return null;
    }
    if (raw === "not_installed" || raw === "missing") {
        return {
            state: "not_installed",
            available: false,
            details: "Simulated: Docker is not installed on this machine.",
            simulated: true
        };
    }
    if (raw === "not_running" || raw === "stopped") {
        return {
            state: "not_running",
            available: false,
            details: "Simulated: Docker is installed but not running.",
            simulated: true
        };
    }
    return null;
}
async function maybeDelayVerifierPreparation(abortSignal) {
    const raw = process.env.BENCHLOCAL_SIMULATE_VERIFIER_PREP_MS?.trim();
    if (!raw) {
        return;
    }
    const durationMs = Number(raw);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
        return;
    }
    await waitForAbortableDelay(durationMs, abortSignal);
}
async function runTarCommand(args, options) {
    const { stdout } = await execFileAsync("tar", args, {
        cwd: options?.cwd,
        maxBuffer: 8 * 1024 * 1024
    });
    return stdout.trim();
}
async function detectDockerAvailability() {
    const simulated = getSimulatedDockerAvailability();
    if (simulated) {
        return simulated;
    }
    try {
        const version = await runDockerCommand(["version", "--format", "{{.Server.Version}}"]);
        return {
            state: "ready",
            available: true,
            details: version || "Docker available"
        };
    }
    catch (error) {
        const dockerCliInstalled = await runDockerCliVersionCheck();
        const details = normalizeDockerErrorMessage(error);
        if (!dockerCliInstalled) {
            return {
                state: "not_installed",
                available: false,
                details: "Docker is not installed."
            };
        }
        return {
            state: "not_running",
            available: false,
            details: /cannot connect to the docker daemon|is the docker daemon running|error during connect|connection refused/i.test(details)
                ? "Docker is installed but not running."
                : details
        };
    }
}
async function inspectDockerContainer(containerName) {
    try {
        const stdout = await runDockerCommand([
            "inspect",
            containerName,
            "--format",
            "{{.State.Running}}"
        ]);
        return {
            exists: true,
            running: stdout === "true"
        };
    }
    catch {
        return {
            exists: false,
            running: false
        };
    }
}
async function inspectDockerPortBinding(containerName, listenPort) {
    try {
        const stdout = await runDockerCommand(["inspect", containerName]);
        const parsed = JSON.parse(stdout);
        const details = parsed[0];
        const running = Boolean(details?.State?.Running);
        const portRecord = details?.NetworkSettings?.Ports?.[`${listenPort}/tcp`];
        const hostPortRaw = Array.isArray(portRecord) ? portRecord[0]?.HostPort : undefined;
        const hostPort = hostPortRaw ? Number(hostPortRaw) : undefined;
        return {
            exists: true,
            running,
            hostPort
        };
    }
    catch {
        return {
            exists: false,
            running: false
        };
    }
}
async function allocateLocalPort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.once("listening", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                server.close(() => reject(new Error("Failed to allocate local port.")));
                return;
            }
            const { port } = address;
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(port);
            });
        });
        server.listen(0);
    });
}
async function inspectDockerImage(image) {
    try {
        await runDockerCommand(["image", "inspect", image]);
        return true;
    }
    catch {
        return false;
    }
}
async function stopDockerVerifierContainer(containerName) {
    try {
        await runDockerCommand(["rm", "-f", containerName]);
    }
    catch {
        // Treat missing containers as already stopped.
    }
}
async function withVerifierContainerLock(containerName, operation, options) {
    const previous = verifierContainerLocks.get(containerName) ?? Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    const tail = previous.catch(() => undefined).then(() => gate);
    verifierContainerLocks.set(containerName, tail);
    try {
        await waitForPromiseWithAbort(previous.catch(() => undefined), options?.abortSignal);
        return await operation();
    }
    finally {
        release();
        if (verifierContainerLocks.get(containerName) === tail) {
            verifierContainerLocks.delete(containerName);
        }
    }
}
async function withRunSummaryLock(runKey, operation) {
    const previous = runSummaryLocks.get(runKey) ?? Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    const tail = previous.catch(() => undefined).then(() => gate);
    runSummaryLocks.set(runKey, tail);
    await previous.catch(() => undefined);
    try {
        return await operation();
    }
    finally {
        release();
        if (runSummaryLocks.get(runKey) === tail) {
            runSummaryLocks.delete(runKey);
        }
    }
}
async function startDockerVerifierContainer(containerName, image, hostPort, listenPort, options) {
    await stopDockerVerifierContainer(containerName);
    if (options?.pullImage !== false) {
        await runDockerCommand(["pull", image], { abortSignal: options?.abortSignal });
    }
    const dockerArgs = [
        "run",
        "-d",
        "--name",
        containerName,
        ...(process.platform === "linux" ? ["--add-host", "127.0.0.1:host-gateway"] : []),
        "-p",
        `${hostPort}:${listenPort}`,
        image
    ];
    await runDockerCommand(dockerArgs, { abortSignal: options?.abortSignal });
}
async function buildDockerVerifierImage(tag, contextPath, options) {
    await runDockerCommand(["build", "-t", tag, contextPath], { abortSignal: options?.abortSignal });
}
async function resolveInstalledBenchPackRoot(config, benchPackId) {
    const baseDir = getBenchPackBaseDir(config, benchPackId);
    if (!(await pathExists(baseDir))) {
        return undefined;
    }
    const currentVersion = await readBenchPackCurrentVersion(baseDir);
    if (currentVersion) {
        const versionDir = path.join(getBenchPackVersionsDir(baseDir), currentVersion);
        if (await pathExists(versionDir)) {
            return versionDir;
        }
    }
    const legacyManifestPath = path.join(baseDir, "benchlocal.pack.json");
    if (await pathExists(legacyManifestPath)) {
        return baseDir;
    }
    return undefined;
}
async function resolveConfiguredBenchPackRoot(config, benchPackId, benchPack) {
    if (benchPack.source === "local") {
        return benchPack.path ? expandHomePath(benchPack.path) : undefined;
    }
    if (benchPack.source === "registry" ||
        benchPack.source === "archive" ||
        benchPack.source === "github" ||
        benchPack.source === "git") {
        return resolveInstalledBenchPackRoot(config, benchPackId);
    }
    return undefined;
}
function isBenchPackManifest(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value;
    return (candidate.schemaVersion === 1 &&
        candidate.protocolVersion === 1 &&
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.version === "string" &&
        typeof candidate.entry === "string" &&
        (candidate.requirements === undefined || isBenchPackCompatibilityRequirements(candidate.requirements)) &&
        typeof candidate.capabilities === "object" &&
        candidate.capabilities !== null &&
        ("verification" in candidate.capabilities ||
            "sidecars" in candidate.capabilities));
}
async function readBenchPackManifest(rootDir) {
    const manifestPath = path.join(rootDir, "benchlocal.pack.json");
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isBenchPackManifest(parsed)) {
        throw new Error("Invalid benchlocal.pack.json manifest.");
    }
    return parsed;
}
function normalizeBenchPackModule(module) {
    let current = module;
    while (current.default &&
        typeof current.default === "object" &&
        current.default !== null &&
        typeof current.listScenarios !== "function") {
        current = current.default;
    }
    return current;
}
async function importFreshModule(entryPath) {
    const stats = await fs.stat(entryPath);
    const url = pathToFileURL(entryPath);
    url.searchParams.set("mtime", String(stats.mtimeMs));
    return (await import(url.href));
}
async function inspectBenchPack(benchPackId, config, benchPackConfig, runtime) {
    const rootDir = await resolveConfiguredBenchPackRoot(config, benchPackId, benchPackConfig);
    if (!rootDir) {
        return {
            id: benchPackId,
            source: benchPackConfig.source,
            status: "not_installed",
            error: "Bench Pack root could not be resolved from config."
        };
    }
    if (!(await pathExists(rootDir))) {
        return {
            id: benchPackId,
            source: benchPackConfig.source,
            rootDir,
            status: "not_installed",
            error: "Bench Pack install directory does not exist."
        };
    }
    const manifestPath = path.join(rootDir, "benchlocal.pack.json");
    if (!(await pathExists(manifestPath))) {
        return {
            id: benchPackId,
            source: benchPackConfig.source,
            rootDir,
            status: "manifest_missing",
            error: "benchlocal.pack.json is missing."
        };
    }
    let manifest;
    try {
        manifest = await readBenchPackManifest(rootDir);
    }
    catch (error) {
        return {
            id: benchPackId,
            source: benchPackConfig.source,
            rootDir,
            status: "invalid_manifest",
            error: error instanceof Error ? error.message : "Failed to parse Bench Pack manifest."
        };
    }
    const compatibilityError = getBenchPackCompatibilityError(manifest, runtime);
    if (compatibilityError) {
        return {
            id: benchPackId,
            source: benchPackConfig.source,
            rootDir,
            status: "incompatible",
            manifest,
            error: compatibilityError
        };
    }
    const entryPath = path.resolve(rootDir, manifest.entry);
    if (!(await pathExists(entryPath))) {
        return {
            id: benchPackId,
            source: benchPackConfig.source,
            rootDir,
            status: "entry_missing",
            manifest,
            error: `Bench Pack entry is missing: ${entryPath}`
        };
    }
    try {
        const loaded = normalizeBenchPackModule(await importFreshModule(entryPath));
        const listScenarios = loaded.listScenarios;
        const runtimeManifest = isBenchPackManifest(loaded.manifest) ? loaded.manifest : manifest;
        const runtimeCompatibilityError = getBenchPackCompatibilityError(runtimeManifest, runtime);
        if (runtimeCompatibilityError) {
            return {
                id: benchPackId,
                source: benchPackConfig.source,
                rootDir,
                status: "incompatible",
                manifest: runtimeManifest,
                error: runtimeCompatibilityError
            };
        }
        if (typeof listScenarios !== "function") {
            return {
                id: benchPackId,
                source: benchPackConfig.source,
                rootDir,
                status: "load_error",
                manifest: runtimeManifest,
                error: "Bench Pack entry does not export a listScenarios function."
            };
        }
        const scenarios = await listScenarios();
        return {
            id: benchPackId,
            source: benchPackConfig.source,
            rootDir,
            status: "ready",
            manifest: runtimeManifest,
            scenarioCount: scenarios?.length ?? 0,
            scenarios
        };
    }
    catch (error) {
        return {
            id: benchPackId,
            source: benchPackConfig.source,
            rootDir,
            status: "load_error",
            manifest,
            error: error instanceof Error ? error.message : "Failed to load bench pack entry."
        };
    }
}
export async function inspectConfiguredBenchPacks(config, runtime) {
    return Promise.all(Object.entries(config.benchpacks).map(async ([benchPackId, benchPackConfig]) => inspectBenchPack(benchPackId, config, benchPackConfig, runtime)));
}
export async function loadBenchPackRegistry(config) {
    const response = await fetch(config.registry.official_url, {
        method: "GET",
        headers: {
            accept: "application/json"
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch Bench Pack registry (${response.status}).`);
    }
    const parsed = (await response.json());
    if (!isBenchPackRegistry(parsed)) {
        throw new Error("Bench Pack registry payload is invalid.");
    }
    return parsed.packs.slice().sort((left, right) => left.name.localeCompare(right.name));
}
async function reportInstallProgress(reporter, progress) {
    await reporter?.(progress);
}
async function downloadBenchPackArchive(archiveUrl, archivePath, reporter, benchPackId, action) {
    await reportInstallProgress(reporter, {
        benchPackId,
        action,
        phase: "downloading",
        message: "Downloading Bench Pack artifact."
    });
    const response = await fetch(archiveUrl);
    if (!response.ok) {
        throw new Error(`Failed to download Bench Pack archive (${response.status}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(archivePath, buffer);
}
async function copyIfPresent(sourcePath, targetPath) {
    if (!(await pathExists(sourcePath))) {
        return;
    }
    await fs.rm(targetPath, { recursive: true, force: true });
    await fs.cp(sourcePath, targetPath, { recursive: true });
}
function isErrnoExceptionWithCode(error, code) {
    return (error instanceof Error &&
        "code" in error &&
        typeof error.code === "string" &&
        error.code === code);
}
async function moveDirectory(sourcePath, targetPath) {
    try {
        await fs.rename(sourcePath, targetPath);
        return;
    }
    catch (error) {
        if (!isErrnoExceptionWithCode(error, "EXDEV")) {
            throw error;
        }
    }
    try {
        await fs.cp(sourcePath, targetPath, {
            recursive: true,
            force: false,
            errorOnExist: true
        });
        await fs.rm(sourcePath, { recursive: true, force: true });
    }
    catch (error) {
        await fs.rm(targetPath, { recursive: true, force: true });
        throw error;
    }
}
async function hydrateBenchLocalRuntimeDependencies(rootDir) {
    const runtimeRoot = await resolveBenchLocalRuntimeRoot();
    const nodeModulesRoot = path.join(rootDir, "node_modules");
    const scopedRoot = path.join(nodeModulesRoot, "@benchlocal");
    await fs.mkdir(scopedRoot, { recursive: true });
    const requiredCopies = [
        {
            source: path.join(runtimeRoot, "packages/benchlocal-sdk"),
            target: path.join(scopedRoot, "sdk"),
            label: "@benchlocal/sdk"
        },
        {
            source: path.join(runtimeRoot, "packages/benchlocal-core"),
            target: path.join(scopedRoot, "core"),
            label: "@benchlocal/core"
        },
        {
            source: path.join(runtimeRoot, "node_modules/zod"),
            target: path.join(nodeModulesRoot, "zod"),
            label: "zod"
        },
        {
            source: path.join(runtimeRoot, "node_modules/smol-toml"),
            target: path.join(nodeModulesRoot, "smol-toml"),
            label: "smol-toml"
        }
    ];
    for (const item of requiredCopies) {
        if (!(await pathExists(item.source))) {
            throw new Error(`BenchLocal runtime dependency is missing from the app bundle: ${item.label}`);
        }
        await copyIfPresent(item.source, item.target);
    }
}
async function stageBenchPackArchiveInstall(version, archiveUrl, reporter, action = "install", progressBenchPackId = "benchpack", runtime) {
    const stagingRoot = path.join(os.tmpdir(), `benchlocal-benchpack-${randomUUID().slice(0, 8)}`);
    const archivePath = path.join(stagingRoot, "package.tar.gz");
    const extractDir = path.join(stagingRoot, "extract");
    const versionKey = `${sanitizeBenchPackVersion(version)}-${randomUUID().slice(0, 8)}`;
    const versionStageDir = path.join(stagingRoot, versionKey);
    await fs.mkdir(stagingRoot, { recursive: true });
    try {
        await downloadBenchPackArchive(archiveUrl, archivePath, reporter, progressBenchPackId, action);
        await reportInstallProgress(reporter, {
            benchPackId: progressBenchPackId,
            action,
            phase: "extracting",
            message: "Extracting Bench Pack artifact."
        });
        await fs.mkdir(extractDir, { recursive: true });
        await runTarCommand(["-xzf", archivePath, "-C", extractDir]);
        const entries = await fs.readdir(extractDir, { withFileTypes: true });
        const topLevelDir = entries.length === 1 && entries[0]?.isDirectory()
            ? path.join(extractDir, entries[0].name)
            : extractDir;
        await fs.cp(topLevelDir, versionStageDir, { recursive: true });
        await reportInstallProgress(reporter, {
            benchPackId: progressBenchPackId,
            action,
            phase: "hydrating",
            message: "Preparing Bench Pack runtime."
        });
        await hydrateBenchLocalRuntimeDependencies(versionStageDir);
        await reportInstallProgress(reporter, {
            benchPackId: progressBenchPackId,
            action,
            phase: "validating",
            message: "Validating Bench Pack."
        });
        const manifest = await readBenchPackManifest(versionStageDir);
        const compatibilityError = getBenchPackCompatibilityError(manifest, runtime);
        if (compatibilityError) {
            throw new Error(compatibilityError);
        }
        const entryPath = path.resolve(versionStageDir, manifest.entry);
        if (!(await pathExists(entryPath))) {
            throw new Error(`Bench Pack entry is missing: ${entryPath}`);
        }
        return {
            stagingRoot,
            stagedDir: versionStageDir,
            manifest
        };
    }
    catch (error) {
        await fs.rm(stagingRoot, { recursive: true, force: true });
        throw error;
    }
}
async function commitStagedBenchPackInstall(config, benchPackId, version, stagedDir, stagingRoot, options) {
    const baseDir = getBenchPackBaseDir(config, benchPackId);
    if (options?.replaceExisting) {
        await fs.rm(baseDir, { recursive: true, force: true });
    }
    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(getBenchPackVersionsDir(baseDir), { recursive: true });
    await cleanupBenchPackStaging(baseDir);
    const versionKey = `${sanitizeBenchPackVersion(version)}-${randomUUID().slice(0, 8)}`;
    const finalVersionDir = path.join(getBenchPackVersionsDir(baseDir), versionKey);
    await moveDirectory(stagedDir, finalVersionDir);
    if (stagingRoot) {
        await fs.rm(stagingRoot, { recursive: true, force: true });
    }
    return finalVersionDir;
}
export async function installBenchPackFromRegistry(config, benchPackId, reporter, runtime) {
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "install",
        phase: "resolving",
        message: "Resolving Bench Pack from registry."
    });
    const registry = await loadBenchPackRegistry(config);
    const entry = registry.find((candidate) => candidate.id === benchPackId);
    if (!entry) {
        throw new Error(`Bench Pack "${benchPackId}" was not found in the official registry.`);
    }
    const archiveUrl = entry.source.type === "github" ? getGitHubArchiveUrl(entry.source.repo, entry.source.tag) : entry.source.url;
    const baseDir = getBenchPackBaseDir(config, benchPackId);
    const staged = await stageBenchPackArchiveInstall(entry.version, archiveUrl, reporter, "install", benchPackId, runtime);
    const rootDir = await commitStagedBenchPackInstall(config, benchPackId, entry.version, staged.stagedDir, staged.stagingRoot);
    const manifest = staged.manifest;
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "install",
        phase: "activating",
        message: "Activating Bench Pack."
    });
    await writeBenchPackCurrentVersion(baseDir, path.basename(rootDir));
    const nextConfig = structuredClone(config);
    const existing = nextConfig.benchpacks[benchPackId];
    nextConfig.benchpacks[benchPackId] = bootstrapBenchPackConfigFromManifest(manifest, entry, existing);
    if (!nextConfig.default_benchpack) {
        nextConfig.default_benchpack = benchPackId;
    }
    await saveConfigFile(nextConfig, getConfigPath());
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "install",
        phase: "complete",
        message: "Bench Pack installed."
    });
    return nextConfig;
}
export async function updateBenchPackFromRegistry(config, benchPackId, reporter, runtime) {
    if (!config.benchpacks[benchPackId]) {
        throw new Error(`Bench Pack "${benchPackId}" is not installed.`);
    }
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "update",
        phase: "resolving",
        message: "Resolving Bench Pack update."
    });
    const registry = await loadBenchPackRegistry(config);
    const entry = registry.find((candidate) => candidate.id === benchPackId);
    if (!entry) {
        throw new Error(`Bench Pack "${benchPackId}" was not found in the official registry.`);
    }
    const archiveUrl = entry.source.type === "github" ? getGitHubArchiveUrl(entry.source.repo, entry.source.tag) : entry.source.url;
    const baseDir = getBenchPackBaseDir(config, benchPackId);
    const staged = await stageBenchPackArchiveInstall(entry.version, archiveUrl, reporter, "update", benchPackId, runtime);
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "update",
        phase: "removing",
        message: "Replacing installed Bench Pack."
    });
    const rootDir = await commitStagedBenchPackInstall(config, benchPackId, entry.version, staged.stagedDir, staged.stagingRoot, {
        replaceExisting: true
    });
    const manifest = staged.manifest;
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "update",
        phase: "activating",
        message: "Activating updated Bench Pack."
    });
    await writeBenchPackCurrentVersion(baseDir, path.basename(rootDir));
    const nextConfig = structuredClone(config);
    const existing = nextConfig.benchpacks[benchPackId];
    nextConfig.benchpacks[benchPackId] = bootstrapBenchPackConfigFromManifest(manifest, entry, existing);
    await saveConfigFile(nextConfig, getConfigPath());
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "update",
        phase: "complete",
        message: "Bench Pack updated."
    });
    return nextConfig;
}
export async function installBenchPackFromUrl(config, archiveUrl, reporter, runtime) {
    const normalizedUrl = archiveUrl.trim();
    if (!normalizedUrl) {
        throw new Error("Bench Pack URL is required.");
    }
    try {
        const parsed = new URL(normalizedUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("Bench Pack URL must use http:// or https://.");
        }
    }
    catch {
        throw new Error("Bench Pack URL must be a valid http:// or https:// URL.");
    }
    await reportInstallProgress(reporter, {
        benchPackId: "third-party",
        action: "install",
        phase: "resolving",
        message: "Resolving Bench Pack from URL."
    });
    const staged = await stageBenchPackArchiveInstall("url", normalizedUrl, reporter, "install", "third-party", runtime);
    const manifest = staged.manifest;
    const benchPackId = manifest.id;
    const rootDir = await commitStagedBenchPackInstall(config, benchPackId, manifest.version, staged.stagedDir, staged.stagingRoot);
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "install",
        phase: "activating",
        message: "Activating Bench Pack."
    });
    await writeBenchPackCurrentVersion(getBenchPackBaseDir(config, benchPackId), path.basename(rootDir));
    const nextConfig = structuredClone(config);
    const existing = nextConfig.benchpacks[benchPackId];
    nextConfig.benchpacks[benchPackId] = {
        enabled: existing?.enabled ?? true,
        source: "archive",
        url: normalizedUrl,
        version: manifest.version,
        auto_update: existing?.auto_update,
        verifiers: getManifestVerifiers(manifest).length > 0
            ? Object.fromEntries(getManifestVerifiers(manifest).map((spec) => [
                spec.id,
                bootstrapVerifierConfig(spec, existing?.verifiers?.[spec.id] ?? existing?.sidecars?.[spec.id])
            ]))
            : undefined
    };
    if (!nextConfig.default_benchpack) {
        nextConfig.default_benchpack = benchPackId;
    }
    await saveConfigFile(nextConfig, getConfigPath());
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "install",
        phase: "complete",
        message: "Bench Pack installed."
    });
    return nextConfig;
}
export async function uninstallBenchPack(config, benchPackId, reporter) {
    const rootDir = getBenchPackBaseDir(config, benchPackId);
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "uninstall",
        phase: "removing",
        message: "Removing Bench Pack."
    });
    const nextConfig = structuredClone(config);
    delete nextConfig.benchpacks[benchPackId];
    if (nextConfig.default_benchpack === benchPackId) {
        nextConfig.default_benchpack = Object.keys(nextConfig.benchpacks)[0] ?? "";
    }
    await saveConfigFile(nextConfig, getConfigPath());
    await removeBenchPackCurrentVersion(rootDir);
    await fs.rm(rootDir, { recursive: true, force: true });
    await reportInstallProgress(reporter, {
        benchPackId,
        action: "uninstall",
        phase: "complete",
        message: "Bench Pack removed."
    });
    return nextConfig;
}
function normalizeLoadedBenchPack(module) {
    const normalized = normalizeBenchPackModule(module);
    if (typeof normalized.listScenarios !== "function" ||
        typeof normalized.prepare !== "function" ||
        typeof normalized.scoreModelResults !== "function" ||
        !normalized.manifest) {
        throw new Error("Bench Pack entry does not implement the BenchLocal runtime surface.");
    }
    return normalized;
}
async function loadConfiguredBenchPack(config, benchPackId, runtime) {
    const benchPackConfig = config.benchpacks[benchPackId];
    if (!benchPackConfig) {
        throw new Error(`Unknown Bench Pack "${benchPackId}" in BenchLocal config.`);
    }
    const rootDir = await resolveConfiguredBenchPackRoot(config, benchPackId, benchPackConfig);
    if (!rootDir || !(await pathExists(rootDir))) {
        throw new Error(`Bench Pack "${benchPackId}" is not installed at a resolvable path.`);
    }
    const manifest = await readBenchPackManifest(rootDir);
    const compatibilityError = getBenchPackCompatibilityError(manifest, runtime);
    if (compatibilityError) {
        throw new Error(compatibilityError);
    }
    const entryPath = path.resolve(rootDir, manifest.entry);
    if (!(await pathExists(entryPath))) {
        throw new Error(`Bench Pack entry is missing: ${entryPath}`);
    }
    const imported = await importFreshModule(entryPath);
    const benchPack = normalizeLoadedBenchPack(imported);
    const runtimeManifest = isBenchPackManifest(benchPack.manifest) ? benchPack.manifest : manifest;
    const runtimeCompatibilityError = getBenchPackCompatibilityError(runtimeManifest, runtime);
    if (runtimeCompatibilityError) {
        throw new Error(runtimeCompatibilityError);
    }
    return {
        rootDir,
        manifest: runtimeManifest,
        benchPack
    };
}
async function createRunArtifacts(config, benchPackId) {
    const runId = `${benchPackId}-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`;
    const runDir = path.join(expandHomePath(config.run_storage_dir), benchPackId, runId);
    await fs.mkdir(runDir, { recursive: true });
    return {
        runId,
        runDir,
        eventsPath: path.join(runDir, "events.jsonl"),
        summaryPath: path.join(runDir, "summary.json"),
        hostLogPath: path.join(runDir, "host.log")
    };
}
function getRunArtifactsForExistingRun(summary) {
    return {
        runId: summary.runId,
        runDir: summary.runDir,
        eventsPath: path.join(summary.runDir, "events.jsonl"),
        summaryPath: path.join(summary.runDir, "summary.json"),
        hostLogPath: path.join(summary.runDir, "host.log")
    };
}
function getBenchPackRunRoot(config, benchPackId) {
    return path.join(expandHomePath(config.run_storage_dir), benchPackId);
}
async function appendJsonLine(targetPath, value) {
    await fs.appendFile(targetPath, `${JSON.stringify(value)}\n`, "utf8");
}
async function appendTextLine(targetPath, value) {
    await fs.appendFile(targetPath, `${value}\n`, "utf8");
}
async function writeRunSummary(summaryPath, summary) {
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
}
function toErrorMessage(error) {
    return error instanceof Error ? error.message : "Unknown benchmark error.";
}
function isAbortError(error) {
    return error instanceof Error && /abort|cancel/i.test(error.name + " " + error.message);
}
function throwIfAborted(signal) {
    if (!signal?.aborted) {
        return;
    }
    throw createAbortError(signal);
}
function compactGenerationRequest(input) {
    if (!input) {
        return {};
    }
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
function resolveBenchPackGeneration(manifest, overrides) {
    return compactGenerationRequest({
        ...DEFAULT_BENCHLOCAL_GENERATION,
        ...(manifest.samplingDefaults ?? {}),
        ...(overrides ?? {})
    });
}
function upsertScenarioResult(results, result) {
    const next = [...results];
    const existingIndex = next.findIndex((candidate) => candidate.scenarioId === result.scenarioId);
    if (existingIndex >= 0) {
        next[existingIndex] = result;
        return next;
    }
    next.push(result);
    return next;
}
function mergeResultsByModel(preferred, fallback) {
    const modelIds = new Set([...Object.keys(fallback), ...Object.keys(preferred)]);
    const merged = {};
    for (const modelId of modelIds) {
        const preferredResults = preferred[modelId] ?? [];
        const fallbackResults = fallback[modelId] ?? [];
        const next = [...fallbackResults];
        for (const result of preferredResults) {
            const existingIndex = next.findIndex((candidate) => candidate.scenarioId === result.scenarioId);
            if (existingIndex >= 0) {
                next[existingIndex] = result;
            }
            else {
                next.push(result);
            }
        }
        merged[modelId] = next;
    }
    return merged;
}
function hasCompleteRunResults(summary) {
    const modelIds = Object.keys(summary.resultsByModel);
    if (modelIds.length !== summary.modelCount) {
        return false;
    }
    return modelIds.every((modelId) => summary.resultsByModel[modelId]?.length === summary.scenarioCount);
}
function getHistoricalRunModelIds(summary) {
    const runStartedEvent = summary.events.find((event) => event.type === "run_started");
    const orderedModelIds = [
        ...(runStartedEvent?.models.map((model) => model.id) ?? []),
        ...Object.keys(summary.resultsByModel)
    ].filter((modelId, index, all) => Boolean(modelId) && all.indexOf(modelId) === index);
    return orderedModelIds;
}
function mergeSummaryEvents(current, persisted) {
    if (!persisted || persisted.length <= current.length) {
        return current;
    }
    return [...current, ...persisted.slice(current.length)];
}
function createHostLogger(benchPackId, hostLogPath) {
    return {
        debug(message, meta) {
            console.debug(`[benchpack:${benchPackId}] ${message}`, meta ?? "");
            void appendTextLine(hostLogPath, `[debug] ${message}${meta ? ` ${JSON.stringify(meta)}` : ""}`);
        },
        info(message, meta) {
            console.info(`[benchpack:${benchPackId}] ${message}`, meta ?? "");
            void appendTextLine(hostLogPath, `[info] ${message}${meta ? ` ${JSON.stringify(meta)}` : ""}`);
        },
        warn(message, meta) {
            console.warn(`[benchpack:${benchPackId}] ${message}`, meta ?? "");
            void appendTextLine(hostLogPath, `[warn] ${message}${meta ? ` ${JSON.stringify(meta)}` : ""}`);
        },
        error(message, meta) {
            console.error(`[benchpack:${benchPackId}] ${message}`, meta ?? "");
            void appendTextLine(hostLogPath, `[error] ${message}${meta ? ` ${JSON.stringify(meta)}` : ""}`);
        }
    };
}
function normalizeBaseUrl(baseUrl) {
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
function normalizeInferencePath(pathname) {
    if (pathname === "/v1") {
        return "/";
    }
    if (pathname.startsWith("/v1/")) {
        return pathname.slice(3);
    }
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
}
async function readIncomingBody(request) {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}
function writeJsonResponse(response, statusCode, payload, headers) {
    const body = Buffer.from(JSON.stringify(payload), "utf8");
    response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(body.byteLength),
        ...headers
    });
    response.end(body);
}
function createUpstreamHeaders(request, route) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
        if (value === undefined) {
            continue;
        }
        const normalizedKey = key.toLowerCase();
        if (normalizedKey === "authorization" || normalizedKey === "content-length" || normalizedKey === "host") {
            continue;
        }
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    if (route.upstreamAuthMode === "bearer" && route.upstreamApiKey) {
        headers.set("authorization", `Bearer ${route.upstreamApiKey}`);
    }
    return headers;
}
function toNodeHeaders(headers, overrides) {
    const result = {};
    headers.forEach((value, key) => {
        if (overrides && key in overrides && overrides[key] === undefined) {
            return;
        }
        result[key] = value;
    });
    for (const [key, value] of Object.entries(overrides ?? {})) {
        if (value === undefined) {
            delete result[key];
            continue;
        }
        result[key] = value;
    }
    return result;
}
function rewriteResponseModel(payload, route) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return payload;
    }
    const record = payload;
    if (record.model !== route.upstreamModel) {
        return payload;
    }
    return {
        ...record,
        model: route.exposedModel
    };
}
async function startInferenceRelay(providers, models, secrets, logger) {
    if (models.length === 0) {
        return {
            endpoints: [],
            async dispose() { }
        };
    }
    const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
    const secretMap = new Map(secrets.map((secret) => [secret.providerId, secret]));
    const failedEndpoints = [];
    const routes = [];
    for (const model of models) {
        const provider = providerMap.get(model.provider);
        if (!provider) {
            failedEndpoints.push({
                modelId: model.id,
                providerId: model.provider,
                transport: "openai_compatible",
                status: "failed",
                details: `Provider "${model.provider}" was not found.`
            });
            continue;
        }
        if (!provider.enabled) {
            failedEndpoints.push({
                modelId: model.id,
                providerId: model.provider,
                transport: "openai_compatible",
                status: "failed",
                details: `Provider "${model.provider}" is configured but disabled.`
            });
            continue;
        }
        const upstreamApiKey = secretMap.get(provider.id)?.value;
        if (provider.authMode === "bearer" && !upstreamApiKey) {
            failedEndpoints.push({
                modelId: model.id,
                providerId: model.provider,
                transport: "openai_compatible",
                status: "failed",
                details: `Provider "${model.provider}" requires an API key, but no secret is available.`
            });
            continue;
        }
        routes.push({
            modelId: model.id,
            providerId: provider.id,
            upstreamBaseUrl: normalizeBaseUrl(provider.baseUrl),
            upstreamModel: model.model,
            upstreamAuthMode: provider.authMode,
            upstreamApiKey,
            exposedModel: model.id
        });
    }
    if (routes.length === 0) {
        return {
            endpoints: failedEndpoints,
            async dispose() { }
        };
    }
    const relayToken = `benchlocal_${randomUUID()}`;
    const routeMap = new Map(routes.map((route) => [route.exposedModel, route]));
    const runningModelPayload = routes.map((route) => ({
        id: route.exposedModel,
        object: "model",
        created: 0,
        owned_by: route.providerId
    }));
    const server = createServer(async (request, response) => {
        const requestId = randomUUID().slice(0, 8);
        try {
            const authorization = request.headers.authorization;
            const providedToken = typeof authorization === "string" ? authorization.replace(/^Bearer\s+/i, "").trim() : "";
            if (providedToken !== relayToken) {
                writeJsonResponse(response, 401, {
                    error: {
                        message: "BenchLocal inference relay rejected the request.",
                        type: "invalid_request_error"
                    }
                }, {
                    "www-authenticate": "Bearer"
                });
                return;
            }
            const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
   console.log("PROXY RECEIVED REQUEST:", requestUrl.toString());
            const normalizedPath = normalizeInferencePath(requestUrl.pathname);
            if (request.method === "GET" && (normalizedPath === "/models" || normalizedPath === "/")) {
                writeJsonResponse(response, 200, {
                    object: "list",
                    data: runningModelPayload
                });
                return;
            }
            const rawBody = await readIncomingBody(request);
            let route;
            let outboundBody = rawBody;
            if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE") {
                const contentType = String(request.headers["content-type"] ?? "");
                if (!contentType.toLowerCase().includes("application/json")) {
                    writeJsonResponse(response, 415, {
                        error: {
                            message: "BenchLocal inference relay currently supports JSON request bodies only.",
                            type: "invalid_request_error"
                        }
                    });
                    return;
                }
                let parsedBody;
                try {
                    parsedBody = rawBody.length > 0 ? JSON.parse(rawBody.toString("utf8")) : {};
                }
                catch {
                    writeJsonResponse(response, 400, {
                        error: {
                            message: "BenchLocal inference relay received invalid JSON.",
                            type: "invalid_request_error"
                        }
                    });
                    return;
                }
                if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
                    writeJsonResponse(response, 400, {
                        error: {
                            message: "BenchLocal inference relay expected a JSON object request body.",
                            type: "invalid_request_error"
                        }
                    });
                    return;
                }
                const modelId = typeof parsedBody.model === "string" ? String(parsedBody.model) : "";
                route = routeMap.get(modelId);
                if (!route) {
                    writeJsonResponse(response, 404, {
                        error: {
                            message: `Model "${modelId || "unknown"}" is not exposed by the BenchLocal inference relay.`,
                            type: "invalid_request_error"
                        }
                    });
                    return;
                }
                outboundBody = Buffer.from(JSON.stringify({
                    ...parsedBody,
                    model: route.upstreamModel
                }), "utf8");
            }
            else {
                const queryModelId = requestUrl.searchParams.get("model");
                route = queryModelId ? routeMap.get(queryModelId) : routes[0];
                if (!route) {
                    writeJsonResponse(response, 503, {
                        error: {
                            message: "No running models are currently exposed by the BenchLocal inference relay.",
                            type: "server_error"
                        }
                    });
                    return;
                }
            }
            const upstreamUrl = new URL(normalizedPath.replace(/^\//, ""), route.upstreamBaseUrl);
            upstreamUrl.search = requestUrl.search;
            let upstreamResponse;
          try {
              upstreamResponse = await fetch(upstreamUrl, {
                  method: request.method ?? "GET",
                  headers: createUpstreamHeaders(request, route),
                  body: outboundBody.length > 0 ? outboundBody.toString("utf8") : undefined
              });
          } catch (err) {
              response.writeHead(502, { "Content-Type": "application/json" });
              response.end(JSON.stringify({ error: { message: "模型API连接失败: " + err.message, type: "server_error" }}));
              return;
          }
            const contentType = upstreamResponse.headers.get("content-type") ?? "";
            if (contentType.toLowerCase().includes("application/json")) {
                const rawText = await upstreamResponse.text();
                let responseBody = rawText;
                try {
                    const parsed = JSON.parse(rawText);
                    responseBody = JSON.stringify(rewriteResponseModel(parsed, route));
                }
                catch {
                    responseBody = rawText;
                }
                response.writeHead(upstreamResponse.status, toNodeHeaders(upstreamResponse.headers, {
                    "content-encoding": undefined,
                    "content-length": String(Buffer.byteLength(responseBody)),
                    "transfer-encoding": undefined
                }));
                response.end(responseBody);
                return;
            }
            response.writeHead(upstreamResponse.status, toNodeHeaders(upstreamResponse.headers));
            if (!upstreamResponse.body) {
                response.end();
                return;
            }
            await pipeline(Readable.fromWeb(upstreamResponse.body), response);
        }
        catch (error) {
            logger.error("Inference relay request failed.", {
                error: toErrorMessage(error),
                requestId
            });
            if (response.headersSent) {
                response.destroy(error instanceof Error ? error : undefined);
                return;
            }
            console.error("PROXY UNHANDLED ERROR:", error);
            writeJsonResponse(response, 502, {
                error: {
                    message: "BenchLocal inference relay failed to reach the upstream provider.",
                    type: "server_error",
                    details: toErrorMessage(error)
                }
            });
        }
    });
    try {
        const address = await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", () => resolve(server.address()));
        });
        if (!address || typeof address === "string") {
            throw new Error("BenchLocal inference relay failed to bind to a local TCP port.");
        }
        const baseUrl = `http://127.0.0.1:${address.port}/v1/`;
        const dockerBaseUrl = `http://127.0.0.1:${address.port}/v1/`;
        logger.info("Started BenchLocal inference relay.", {
            baseUrl,
            dockerBaseUrl,
            modelCount: routes.length
        });
        return {
            endpoints: [
                ...routes.map((route) => ({
                    modelId: route.modelId,
                    providerId: route.providerId,
                    transport: "openai_compatible",
                    status: "running",
                    baseUrl,
                    dockerBaseUrl,
                    authMode: "bearer",
                    apiKey: relayToken,
                    exposedModel: route.exposedModel
                })),
                ...failedEndpoints
            ],
            async dispose() {
                await new Promise((resolve, reject) => {
                    server.close((error) => {
                        if (error) {
                            reject(error);
                            return;
                        }
                        resolve();
                    });
                });
                logger.info("Stopped BenchLocal inference relay.", {
                    baseUrl,
                    dockerBaseUrl
                });
            }
        };
    }
    catch (error) {
        logger.error("Failed to start BenchLocal inference relay.", {
            error: toErrorMessage(error)
        });
        return {
            endpoints: [
                ...routes.map((route) => ({
                    modelId: route.modelId,
                    providerId: route.providerId,
                    transport: "openai_compatible",
                    status: "failed",
                    details: `BenchLocal inference relay failed to start: ${toErrorMessage(error)}`
                })),
                ...failedEndpoints
            ],
            async dispose() { }
        };
    }
}
async function createHostContext(config, benchPackId, rootDir, manifest, artifacts) {
    const benchPackConfig = config.benchpacks[benchPackId];
    const logger = createHostLogger(benchPackId, artifacts.hostLogPath);
    const providers = Object.entries(config.providers).map(([id, provider]) => ({
        id,
        kind: provider.kind,
        name: provider.name,
        enabled: provider.enabled,
        baseUrl: provider.base_url,
        authMode: (provider.api_key || provider.api_key_env ? "bearer" : "none")
    }));
    const models = config.models.filter((model) => model.enabled).map((model) => ({
        id: model.id,
        provider: model.provider,
        model: model.model,
        label: model.label,
        enabled: model.enabled,
        group: model.group
    }));
    const secrets = await Promise.all(Object.entries(config.providers).map(async ([providerId, provider]) => {
        const envName = provider.api_key_env;
        const envValue = envName ? process.env[envName] : undefined;
        const value = provider.api_key ?? envValue;
        return {
            providerId,
            keyName: envName ?? "api_key",
            value,
            source: provider.api_key ? "config" : envValue ? "env" : "none"
        };
    }));
    const verifiers = await resolveVerifierEndpoints(benchPackId, benchPackConfig, manifest);
    const inferenceRelay = await startInferenceRelay(providers, models, secrets, logger);
    return {
        context: {
            protocolVersion: 1,
            benchPack: {
                id: benchPackId,
                version: manifest.version,
                installDir: rootDir,
                dataDir: path.join(expandHomePath(config.cache_dir), "benchpack-data", benchPackId),
                cacheDir: path.join(expandHomePath(config.cache_dir), "benchpacks", benchPackId),
                runsDir: artifacts.runDir
            },
            providers,
            models,
            secrets,
            verifiers,
            sidecars: verifiers,
            inferenceEndpoints: inferenceRelay.endpoints,
            logger
        },
        dispose: inferenceRelay.dispose
    };
}
async function probeVerifier(url, healthcheckPath) {
    if (!healthcheckPath) {
        return "running";
    }
    try {
        const response = await fetch(`${url}${healthcheckPath.startsWith("/") ? healthcheckPath : `/${healthcheckPath}`}`, {
            method: "GET"
        });
        return response.ok ? "running" : "stopped";
    }
    catch {
        return "stopped";
    }
}
async function waitForVerifierReady(url, healthcheckPath, options) {
    const attempts = options?.attempts ?? 12;
    const delayMs = options?.delayMs ?? 500;
    for (let index = 0; index < attempts; index += 1) {
        throwIfAborted(options?.abortSignal);
        if ((await probeVerifier(url, healthcheckPath)) === "running") {
            return true;
        }
        await waitForAbortableDelay(delayMs, options?.abortSignal);
    }
    return false;
}
function getManifestVerifiers(manifest) {
    return manifest.verifiers ?? manifest.sidecars ?? [];
}
function bootstrapVerifierConfig(spec, existing) {
    return {
        mode: existing?.mode ?? spec.defaultMode,
        auto_start: existing?.auto_start ?? true,
        custom_url: existing?.custom_url ?? spec.customUrl?.defaultUrl,
        cloud_url: existing?.cloud_url ?? spec.cloud?.baseUrl,
        docker_image: existing?.docker_image ?? spec.docker?.image
    };
}
function bootstrapBenchPackConfigFromManifest(manifest, entry, existing) {
    const verifierSpecs = getManifestVerifiers(manifest);
    const verifiers = verifierSpecs.length > 0
        ? Object.fromEntries(verifierSpecs.map((spec) => [
            spec.id,
            bootstrapVerifierConfig(spec, existing?.verifiers?.[spec.id] ?? existing?.sidecars?.[spec.id])
        ]))
        : undefined;
    return {
        enabled: existing?.enabled ?? true,
        source: "registry",
        repo: entry.source.type === "github" ? entry.source.repo : undefined,
        ref: entry.source.type === "github" ? entry.source.tag : undefined,
        version: entry.version,
        auto_update: existing?.auto_update,
        verifiers
    };
}
function getVerifierUrl(spec, config) {
    const mode = config?.mode ?? spec.defaultMode;
    if (mode === "docker") {
        return {
            mode,
            details: "BenchLocal assigns a free local port automatically."
        };
    }
    if (mode === "cloud") {
        return {
            mode,
            url: config?.cloud_url ?? spec.cloud?.baseUrl,
            details: spec.cloud?.baseUrl ?? config?.cloud_url
        };
    }
    return {
        mode,
        url: config?.custom_url ?? spec.customUrl?.defaultUrl,
        details: config?.custom_url ?? spec.customUrl?.defaultUrl
    };
}
function formatDockerVerifierUnavailableMessage(benchPackId, availability) {
    if (availability.state === "not_installed") {
        return `Bench Pack "${benchPackId}" requires Local Docker, but Docker is not installed.`;
    }
    return `Bench Pack "${benchPackId}" requires Local Docker, but Docker is not running.`;
}
function resolveVerifierDockerImageRef(benchPackId, spec, runtime) {
    const configuredImage = runtime?.docker_image ?? spec.docker?.image;
    if (configuredImage) {
        return {
            image: configuredImage,
            pullImage: true
        };
    }
    if (spec.docker?.buildContext) {
        return {
            image: `benchlocal/${sanitizeRuntimeName(benchPackId)}-${sanitizeRuntimeName(spec.id)}:local`,
            pullImage: false
        };
    }
    return {
        image: undefined,
        pullImage: true
    };
}
async function resolveDockerVerifierEndpoint(benchPackId, spec, config) {
    const docker = await detectDockerAvailability();
    const { image } = resolveVerifierDockerImageRef(benchPackId, spec, config);
    if (!docker.available) {
        return {
            id: spec.id,
            transport: spec.transport,
            mode: "docker",
            required: spec.required,
            status: docker.state === "not_running" ? "dependency_not_running" : "missing_dependency",
            details: docker.details,
            dockerImagePresent: false
        };
    }
    const containerName = getVerifierContainerName(benchPackId, spec.id);
    const listenPort = spec.docker?.listenPort;
    const container = listenPort
        ? await inspectDockerPortBinding(containerName, listenPort)
        : await inspectDockerContainer(containerName);
    const port = container.hostPort;
    const url = port ? `http://127.0.0.1:${port}` : undefined;
    const healthcheckPath = spec.docker?.healthcheckPath ?? spec.cloud?.healthcheckPath ?? spec.customUrl?.healthcheckPath;
    const status = container.running && url
        ? await probeVerifier(url, healthcheckPath)
        : container.exists
            ? "stopped"
            : "stopped";
    const dockerImagePresent = image ? await inspectDockerImage(image) : false;
    return {
        id: spec.id,
        transport: spec.transport,
        mode: "docker",
        required: spec.required,
        status,
        url,
        port,
        dockerImagePresent,
        details: container.running
            ? spec.docker?.image
            : "BenchLocal assigns a free local port automatically when this verifier starts."
    };
}
async function resolveVerifierEndpoints(benchPackId, benchPackConfig, manifest) {
    const verifierSpecs = getManifestVerifiers(manifest);
    return Promise.all(verifierSpecs.map(async (spec) => {
        const configured = benchPackConfig?.verifiers?.[spec.id] ?? benchPackConfig?.sidecars?.[spec.id];
        if ((configured?.mode ?? spec.defaultMode) === "docker") {
            return resolveDockerVerifierEndpoint(benchPackId, spec, configured);
        }
        const resolved = getVerifierUrl(spec, configured);
        const healthcheckPath = spec.customUrl?.healthcheckPath ?? spec.cloud?.healthcheckPath ?? spec.docker?.healthcheckPath;
        const status = resolved.url ? await probeVerifier(resolved.url, healthcheckPath) : "failed";
        return {
            id: spec.id,
            transport: spec.transport,
            mode: resolved.mode,
            required: spec.required,
            status,
            url: resolved.url,
            port: resolved.port,
            details: resolved.details ?? (resolved.url ? undefined : "Verifier URL is not configured."),
            dockerImagePresent: false
        };
    }));
}
async function loadConfiguredBenchPackRuntime(config, benchPackId) {
    const benchPackConfig = config.benchpacks[benchPackId];
    if (!benchPackConfig) {
        throw new Error(`Unknown Bench Pack "${benchPackId}" in BenchLocal config.`);
    }
    const rootDir = await resolveConfiguredBenchPackRoot(config, benchPackId, benchPackConfig);
    if (!rootDir || !(await pathExists(rootDir))) {
        throw new Error(`Bench Pack "${benchPackId}" is not installed at a resolvable path.`);
    }
    const manifest = await readBenchPackManifest(rootDir);
    return {
        rootDir,
        benchPackConfig,
        manifest
    };
}
export async function getConfiguredBenchPackVerifierStatus(config, benchPackId) {
    const { benchPackConfig, manifest } = await loadConfiguredBenchPackRuntime(config, benchPackId);
    const docker = await detectDockerAvailability();
    const verifiers = await resolveVerifierEndpoints(benchPackId, benchPackConfig, manifest);
    return {
        benchPackId,
        benchPackName: manifest.name,
        verifiers,
        docker
    };
}
export async function startConfiguredBenchPackVerifiers(config, benchPackId, options) {
    const { rootDir, benchPackConfig, manifest } = await loadConfiguredBenchPackRuntime(config, benchPackId);
    const verifierSpecs = getManifestVerifiers(manifest);
    const docker = await detectDockerAvailability();
    for (const spec of verifierSpecs) {
        const runtime = benchPackConfig.verifiers?.[spec.id] ?? benchPackConfig.sidecars?.[spec.id];
        const mode = runtime?.mode ?? spec.defaultMode;
        if (mode !== "docker" || !runtime?.auto_start) {
            continue;
        }
        throwIfAborted(options?.abortSignal);
        await options?.onProgress?.({
            verifierId: spec.id,
            phase: "checking_docker",
            message: docker.available
                ? "Checking Local Docker availability."
                : docker.details ?? "Checking Local Docker availability."
        });
        if (!docker.available) {
            if (spec.required) {
                throw new Error(formatDockerVerifierUnavailableMessage(benchPackId, docker));
            }
            continue;
        }
        const { image, pullImage } = resolveVerifierDockerImageRef(benchPackId, spec, runtime);
        const listenPort = spec.docker?.listenPort;
        if (!pullImage && image && spec.docker?.buildContext) {
            if (!(await inspectDockerImage(image))) {
                await options?.onProgress?.({
                    verifierId: spec.id,
                    phase: "building_image",
                    message: "Building the local verifier image."
                });
                await maybeDelayVerifierPreparation(options?.abortSignal);
                throwIfAborted(options?.abortSignal);
                await buildDockerVerifierImage(image, path.resolve(rootDir, spec.docker.buildContext), {
                    abortSignal: options?.abortSignal
                });
            }
        }
        if (!image || !listenPort) {
            if (spec.required) {
                throw new Error(`Bench Pack "${benchPackId}" is missing Docker verifier metadata for "${spec.id}".`);
            }
            continue;
        }
        const containerName = getVerifierContainerName(benchPackId, spec.id);
        await withVerifierContainerLock(containerName, async () => {
            const existingEndpoint = await resolveDockerVerifierEndpoint(benchPackId, spec, runtime);
            if (existingEndpoint.status === "running" && existingEndpoint.url) {
                await options?.onProgress?.({
                    verifierId: spec.id,
                    phase: "waiting_for_healthcheck",
                    message: "Reusing the running verifier."
                });
                return;
            }
            const hostPort = await allocateLocalPort();
            if (pullImage) {
                await options?.onProgress?.({
                    verifierId: spec.id,
                    phase: "pulling_image",
                    message: `Pulling verifier image ${image}.`
                });
                await maybeDelayVerifierPreparation(options?.abortSignal);
                throwIfAborted(options?.abortSignal);
            }
            await options?.onProgress?.({
                verifierId: spec.id,
                phase: "starting_container",
                message: `Starting verifier ${spec.id}.`
            });
            await maybeDelayVerifierPreparation(options?.abortSignal);
            throwIfAborted(options?.abortSignal);
            await startDockerVerifierContainer(containerName, image, hostPort, listenPort, {
                pullImage,
                abortSignal: options?.abortSignal
            });
            await options?.onProgress?.({
                verifierId: spec.id,
                phase: "waiting_for_healthcheck",
                message: "Waiting for the verifier health check to pass."
            });
            await maybeDelayVerifierPreparation(options?.abortSignal);
            throwIfAborted(options?.abortSignal);
            await waitForVerifierReady(`http://127.0.0.1:${hostPort}`, spec.docker?.healthcheckPath ?? spec.cloud?.healthcheckPath ?? spec.customUrl?.healthcheckPath, { abortSignal: options?.abortSignal });
        }, { abortSignal: options?.abortSignal });
    }
    return getConfiguredBenchPackVerifierStatus(config, benchPackId);
}
export async function stopConfiguredBenchPackVerifiers(config, benchPackId) {
    const { manifest } = await loadConfiguredBenchPackRuntime(config, benchPackId);
    const verifierSpecs = getManifestVerifiers(manifest);
    await Promise.all(verifierSpecs.map((spec) => stopDockerVerifierContainer(getVerifierContainerName(benchPackId, spec.id))));
    return getConfiguredBenchPackVerifierStatus(config, benchPackId);
}
export async function deleteConfiguredBenchPackVerifierImage(config, benchPackId, verifierId) {
    const { benchPackConfig, manifest } = await loadConfiguredBenchPackRuntime(config, benchPackId);
    const spec = getManifestVerifiers(manifest).find((candidate) => candidate.id === verifierId);
    if (!spec) {
        throw new Error(`Verifier "${verifierId}" was not found for Bench Pack "${benchPackId}".`);
    }
    const runtime = benchPackConfig.verifiers?.[spec.id] ?? benchPackConfig.sidecars?.[spec.id];
    const mode = runtime?.mode ?? spec.defaultMode;
    if (mode !== "docker") {
        throw new Error(`Verifier "${verifierId}" for Bench Pack "${benchPackId}" is not configured for Local Docker.`);
    }
    const docker = await detectDockerAvailability();
    if (!docker.available) {
        throw new Error(docker.state === "not_installed"
            ? `Cannot delete the Docker image for verifier "${verifierId}" because Docker is not installed.`
            : `Cannot delete the Docker image for verifier "${verifierId}" because Docker is not running.`);
    }
    const { image } = resolveVerifierDockerImageRef(benchPackId, spec, runtime);
    if (!image) {
        throw new Error(`Verifier "${verifierId}" for Bench Pack "${benchPackId}" does not define a Docker image.`);
    }
    const containerName = getVerifierContainerName(benchPackId, spec.id);
    let removed = false;
    await withVerifierContainerLock(containerName, async () => {
        const existingEndpoint = await resolveDockerVerifierEndpoint(benchPackId, spec, runtime);
        if (existingEndpoint.status === "running") {
            throw new Error(`Stop verifier "${verifierId}" before deleting its Docker image.`);
        }
        // Drop any leftover container reference so the image can be removed cleanly.
        await stopDockerVerifierContainer(containerName);
        if (!(await inspectDockerImage(image))) {
            removed = false;
            return;
        }
        await runDockerCommand(["image", "rm", image]);
        removed = true;
    });
    return {
        status: await getConfiguredBenchPackVerifierStatus(config, benchPackId),
        image,
        removed
    };
}
async function executeSerialTestCasesMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, runId, shouldExecuteCell = () => true, abortSignal) {
    for (const [index, scenario] of scenarios.entries()) {
        throwIfAborted(abortSignal);
        const runnableModels = selectedModels.filter((model) => shouldExecuteCell(scenario, model));
        if (runnableModels.length === 0) {
            continue;
        }
        await emit({
            type: "scenario_started",
            scenarioId: scenario.id,
            title: scenario.title,
            index: index + 1,
            total: scenarios.length
        });
        for (const model of runnableModels) {
            throwIfAborted(abortSignal);
            const result = await runScenarioSafely(prepared, {
                runId,
                benchPackId,
                scenario,
                model,
                abortSignal,
                generation
            }, emit);
            resultsByModel[model.id].push(result);
            await emit({ type: "scenario_result", modelId: model.id, scenarioId: scenario.id, result });
        }
        await emit({
            type: "scenario_finished",
            scenarioId: scenario.id
        });
    }
}
function buildScenarioExecutionFailureResult(scenario, error, startedAt) {
    const message = toErrorMessage(error);
    const completedAt = Date.now();
    return {
        scenarioId: scenario.id,
        status: "fail",
        score: 0,
        summary: "BenchLocal could not complete this scenario run.",
        note: message,
        rawLog: `error=${message}`,
        verifier: {
            status: "fail",
            summary: "Scenario execution failed before a verifier result was returned.",
            details: { error: message }
        },
        timings: {
            startedAt: new Date(startedAt).toISOString(),
            completedAt: new Date(completedAt).toISOString(),
            durationMs: completedAt - startedAt
        }
    };
}
async function runScenarioSafely(prepared, input, emit) {
    const startedAt = Date.now();
    try {
        return await prepared.runScenario(input, emit);
    }
    catch (error) {
        if (isAbortError(error) || input.abortSignal?.aborted) {
            throw error;
        }
        return buildScenarioExecutionFailureResult(input.scenario, error, startedAt);
    }
}
async function executeSerialByModelMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, runId, shouldExecuteCell = () => true, abortSignal) {
    const startedScenarios = new Set();
    const finishedCounts = new Map();
    const expectedCounts = new Map(scenarios.map((scenario) => [
        scenario.id,
        selectedModels.filter((model) => shouldExecuteCell(scenario, model)).length
    ]));
    for (const model of selectedModels) {
        throwIfAborted(abortSignal);
        for (const [index, scenario] of scenarios.entries()) {
            throwIfAborted(abortSignal);
            if (!shouldExecuteCell(scenario, model)) {
                continue;
            }
            if (!startedScenarios.has(scenario.id)) {
                startedScenarios.add(scenario.id);
                await emit({
                    type: "scenario_started",
                    scenarioId: scenario.id,
                    title: scenario.title,
                    index: index + 1,
                    total: scenarios.length
                });
            }
            const result = await runScenarioSafely(prepared, {
                runId,
                benchPackId,
                scenario,
                model,
                abortSignal,
                generation
            }, emit);
            resultsByModel[model.id].push(result);
            await emit({ type: "scenario_result", modelId: model.id, scenarioId: scenario.id, result });
            const completedCount = (finishedCounts.get(scenario.id) ?? 0) + 1;
            finishedCounts.set(scenario.id, completedCount);
            if (completedCount >= (expectedCounts.get(scenario.id) ?? 0)) {
                await emit({
                    type: "scenario_finished",
                    scenarioId: scenario.id
                });
            }
        }
    }
}
async function executeParallelModelsMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, runId, shouldExecuteCell = () => true, abortSignal) {
    const startedScenarios = new Set();
    const finishedCounts = new Map();
    const expectedCounts = new Map(scenarios.map((scenario) => [
        scenario.id,
        selectedModels.filter((model) => shouldExecuteCell(scenario, model)).length
    ]));
    for (const model of selectedModels) {
        throwIfAborted(abortSignal);
        await Promise.all(scenarios.map(async (scenario, index) => {
            throwIfAborted(abortSignal);
            if (!shouldExecuteCell(scenario, model)) {
                return;
            }
            if (!startedScenarios.has(scenario.id)) {
                startedScenarios.add(scenario.id);
                await emit({
                    type: "scenario_started",
                    scenarioId: scenario.id,
                    title: scenario.title,
                    index: index + 1,
                    total: scenarios.length
                });
            }
            const result = await runScenarioSafely(prepared, {
                runId,
                benchPackId,
                scenario,
                model,
                abortSignal,
                generation
            }, emit);
            resultsByModel[model.id].push(result);
            await emit({ type: "scenario_result", modelId: model.id, scenarioId: scenario.id, result });
            const completedCount = (finishedCounts.get(scenario.id) ?? 0) + 1;
            finishedCounts.set(scenario.id, completedCount);
            if (completedCount >= (expectedCounts.get(scenario.id) ?? 0)) {
                await emit({
                    type: "scenario_finished",
                    scenarioId: scenario.id
                });
            }
        }));
    }
}
async function executeParallelTestCasesMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, runId, shouldExecuteCell = () => true, abortSignal) {
    for (const [index, scenario] of scenarios.entries()) {
        throwIfAborted(abortSignal);
        const runnableModels = selectedModels.filter((model) => shouldExecuteCell(scenario, model));
        if (runnableModels.length === 0) {
            continue;
        }
        await emit({
            type: "scenario_started",
            scenarioId: scenario.id,
            title: scenario.title,
            index: index + 1,
            total: scenarios.length
        });
        const scenarioResults = await Promise.all(runnableModels.map(async (model) => {
            const result = await runScenarioSafely(prepared, {
                runId,
                benchPackId,
                scenario,
                model,
                abortSignal,
                generation
            }, emit);
            return { modelId: model.id, result };
        }));
        for (const { modelId, result } of scenarioResults) {
            resultsByModel[modelId].push(result);
            await emit({ type: "scenario_result", modelId, scenarioId: scenario.id, result });
        }
        await emit({
            type: "scenario_finished",
            scenarioId: scenario.id
        });
    }
}
async function executeFullParallelMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, runId, shouldExecuteCell = () => true, abortSignal) {
    await Promise.all(scenarios.map(async (scenario, index) => {
        throwIfAborted(abortSignal);
        const runnableModels = selectedModels.filter((model) => shouldExecuteCell(scenario, model));
        if (runnableModels.length === 0) {
            return;
        }
        await emit({
            type: "scenario_started",
            scenarioId: scenario.id,
            title: scenario.title,
            index: index + 1,
            total: scenarios.length
        });
        const scenarioResults = await Promise.all(runnableModels.map(async (model) => {
            const result = await runScenarioSafely(prepared, {
                runId,
                benchPackId,
                scenario,
                model,
                abortSignal,
                generation
            }, emit);
            return { modelId: model.id, result };
        }));
        for (const { modelId, result } of scenarioResults) {
            resultsByModel[modelId].push(result);
            await emit({ type: "scenario_result", modelId, scenarioId: scenario.id, result });
        }
        await emit({
            type: "scenario_finished",
            scenarioId: scenario.id
        });
    }));
}
export async function runConfiguredBenchPack(config, benchPackId, options, runtime) {
    const artifacts = await createRunArtifacts(config, benchPackId);
    const { rootDir, manifest, benchPack } = await loadConfiguredBenchPack(config, benchPackId, runtime);
    const events = [];
    const emit = async (event) => {
        events.push(event);
        await appendJsonLine(artifacts.eventsPath, event);
        await options?.onEvent?.(event);
    };
    await startConfiguredBenchPackVerifiers(config, benchPackId, {
        abortSignal: options?.abortSignal,
        onProgress: async (progress) => {
            await emit({
                type: "verifier_preparing",
                benchPackId,
                benchPackName: manifest.name,
                verifierId: progress.verifierId,
                phase: progress.phase,
                message: progress.message
            });
        }
    });
    const hostResources = await createHostContext(config, benchPackId, rootDir, manifest, artifacts);
    const hostContext = hostResources.context;
    let hostDisposed = false;
    const disposeHostResources = async () => {
        if (hostDisposed) {
            return;
        }
        hostDisposed = true;
        await hostResources.dispose();
    };
    try {
        const blockingVerifier = hostContext.verifiers.find((verifier) => verifier.required && verifier.status !== "running");
        if (blockingVerifier) {
            if (blockingVerifier.status === "missing_dependency") {
                throw new Error(blockingVerifier.details ?? `Bench Pack "${manifest.name}" requires Local Docker.`);
            }
            if (blockingVerifier.status === "dependency_not_running") {
                throw new Error(blockingVerifier.details ?? `Bench Pack "${manifest.name}" requires Local Docker to be running.`);
            }
            throw new Error(blockingVerifier.details ??
                `Bench Pack "${manifest.name}" requires verifier "${blockingVerifier.id}" to be running before the test can start.`);
        }
        const enabledModels = hostContext.models.filter((model) => model.enabled);
        const selectedModels = options?.modelIds && options.modelIds.length > 0
            ? options.modelIds
                .map((modelId) => enabledModels.find((model) => model.id === modelId))
                .filter((model) => Boolean(model))
            : enabledModels;
        if (selectedModels.length === 0) {
            throw new Error("No enabled models are configured in BenchLocal.");
        }
        const scenarios = await benchPack.listScenarios();
        const prepared = await benchPack.prepare(hostContext);
        const resultsByModel = Object.fromEntries(selectedModels.map((model) => [model.id, []]));
        const startedAt = new Date().toISOString();
        const executionMode = options?.executionMode ?? "parallel_by_test_case";
        const generation = resolveBenchPackGeneration(manifest, options?.generation);
        let runErrorMessage;
        let cancelled = false;
        await emit({
            type: "run_started",
            runId: artifacts.runId,
            models: selectedModels.map((model) => ({ id: model.id, label: model.label })),
            totalScenarios: scenarios.length
        });
        await writeRunSummary(artifacts.summaryPath, {
            runId: artifacts.runId,
            runDir: artifacts.runDir,
            benchPackId,
            benchPackName: manifest.name,
            executionMode,
            startedAt,
            completedAt: startedAt,
            modelCount: selectedModels.length,
            scenarioCount: scenarios.length,
            cancelled: false,
            error: undefined,
            events,
            resultsByModel,
            scores: Object.fromEntries(selectedModels.map((model) => [model.id, benchPack.scoreModelResults([])]))
        });
        try {
            try {
                throwIfAborted(options?.abortSignal);
                switch (executionMode) {
                    case "serial":
                        await executeSerialTestCasesMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, artifacts.runId, undefined, options?.abortSignal);
                        break;
                    case "serial_by_model":
                        await executeSerialByModelMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, artifacts.runId, undefined, options?.abortSignal);
                        break;
                    case "parallel_by_test_case":
                        await executeParallelTestCasesMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, artifacts.runId, undefined, options?.abortSignal);
                        break;
                    case "full_parallel":
                        await executeFullParallelMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, artifacts.runId, undefined, options?.abortSignal);
                        break;
                    case "parallel_by_model":
                    default:
                        await executeParallelModelsMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, artifacts.runId, undefined, options?.abortSignal);
                        break;
                }
            }
            catch (error) {
                runErrorMessage = toErrorMessage(error);
                cancelled = isAbortError(error) || Boolean(options?.abortSignal?.aborted);
                await emit({
                    type: "run_error",
                    message: runErrorMessage
                });
            }
            const persistedSummary = await loadRunSummaryForBenchPack(config, benchPackId, artifacts.runId).catch(() => null);
            const mergedResultsByModel = mergeResultsByModel(persistedSummary?.resultsByModel ?? {}, resultsByModel);
            const mergedEvents = mergeSummaryEvents(events, persistedSummary?.events);
            const scores = Object.fromEntries(Object.entries(mergedResultsByModel).map(([modelId, results]) => [modelId, benchPack.scoreModelResults(results)]));
            if (!runErrorMessage) {
                await emit({
                    type: "run_finished",
                    scores
                });
            }
            const summary = {
                runId: artifacts.runId,
                runDir: artifacts.runDir,
                benchPackId,
                benchPackName: manifest.name,
                executionMode,
                startedAt,
                completedAt: new Date().toISOString(),
                modelCount: selectedModels.length,
                scenarioCount: scenarios.length,
                cancelled,
                error: runErrorMessage,
                events: mergedEvents,
                resultsByModel: mergedResultsByModel,
                scores
            };
            await writeRunSummary(artifacts.summaryPath, summary);
            return summary;
        }
        finally {
            await prepared.dispose();
            await disposeHostResources();
        }
    }
    catch (error) {
        await disposeHostResources();
        throw error;
    }
}
export async function retryScenarioForBenchPackRun(config, benchPackId, options, runtime) {
    const existingSummary = await loadRunSummaryForBenchPack(config, benchPackId, options.runId);
    const artifacts = getRunArtifactsForExistingRun(existingSummary);
    const { rootDir, manifest, benchPack } = await loadConfiguredBenchPack(config, benchPackId, runtime);
    const retryEvents = [];
    const emit = async (event) => {
        retryEvents.push(event);
        await appendJsonLine(artifacts.eventsPath, event);
        await options.onEvent?.(event);
    };
    await startConfiguredBenchPackVerifiers(config, benchPackId, {
        abortSignal: options.abortSignal,
        onProgress: async (progress) => {
            await emit({
                type: "verifier_preparing",
                benchPackId,
                benchPackName: manifest.name,
                verifierId: progress.verifierId,
                phase: progress.phase,
                message: progress.message
            });
        }
    });
    const hostResources = await createHostContext(config, benchPackId, rootDir, manifest, artifacts);
    const hostContext = hostResources.context;
    let hostDisposed = false;
    const disposeHostResources = async () => {
        if (hostDisposed) {
            return;
        }
        hostDisposed = true;
        await hostResources.dispose();
    };
    try {
        const blockingVerifier = hostContext.verifiers.find((verifier) => verifier.required && verifier.status !== "running");
        if (blockingVerifier) {
            if (blockingVerifier.status === "missing_dependency") {
                throw new Error(blockingVerifier.details ?? `Bench Pack "${manifest.name}" requires Local Docker.`);
            }
            if (blockingVerifier.status === "dependency_not_running") {
                throw new Error(blockingVerifier.details ?? `Bench Pack "${manifest.name}" requires Local Docker to be running.`);
            }
            throw new Error(blockingVerifier.details ??
                `Bench Pack "${manifest.name}" requires verifier "${blockingVerifier.id}" to be running before the test can start.`);
        }
        const scenarioList = await benchPack.listScenarios();
        const scenarioIndex = scenarioList.findIndex((candidate) => candidate.id === options.scenarioId);
        const scenario = scenarioIndex >= 0 ? scenarioList[scenarioIndex] : null;
        if (!scenario) {
            throw new Error(`Scenario "${options.scenarioId}" was not found for Bench Pack "${benchPackId}".`);
        }
        const model = hostContext.models.find((candidate) => candidate.id === options.modelId);
        if (!model) {
            throw new Error(`Model "${options.modelId}" is not currently enabled in BenchLocal.`);
        }
        const prepared = await benchPack.prepare(hostContext);
        const generation = resolveBenchPackGeneration(manifest, options.generation);
        try {
            await emit({
                type: "scenario_started",
                scenarioId: scenario.id,
                title: scenario.title,
                index: scenarioIndex + 1,
                total: scenarioList.length
            });
            await emit({
                type: "model_progress",
                modelId: model.id,
                scenarioId: scenario.id,
                message: `Retrying ${scenario.title} for ${model.label}.`
            });
            const result = await prepared.runScenario({
                runId: existingSummary.runId,
                benchPackId,
                scenario,
                model,
                abortSignal: options.abortSignal,
                generation
            }, emit);
            await emit({
                type: "scenario_result",
                modelId: model.id,
                scenarioId: scenario.id,
                result
            });
            await emit({
                type: "scenario_finished",
                scenarioId: scenario.id
            });
            return await withRunSummaryLock(`${benchPackId}:${existingSummary.runId}`, async () => {
                const latestSummary = await loadRunSummaryForBenchPack(config, benchPackId, existingSummary.runId);
                const nextResultsByModel = {
                    ...latestSummary.resultsByModel,
                    [model.id]: upsertScenarioResult(latestSummary.resultsByModel[model.id] ?? [], result)
                };
                const nextSnapshot = {
                    ...latestSummary,
                    resultsByModel: nextResultsByModel
                };
                const isComplete = hasCompleteRunResults(nextSnapshot);
                const scores = Object.fromEntries(Object.entries(nextResultsByModel).map(([modelId, results]) => [modelId, benchPack.scoreModelResults(results)]));
                const nextSummary = {
                    ...latestSummary,
                    completedAt: new Date().toISOString(),
                    cancelled: isComplete ? false : latestSummary.cancelled,
                    error: isComplete ? undefined : latestSummary.error,
                    events: [...latestSummary.events, ...retryEvents],
                    resultsByModel: nextResultsByModel,
                    scores
                };
                await writeRunSummary(artifacts.summaryPath, nextSummary);
                return nextSummary;
            });
        }
        finally {
            await prepared.dispose();
            await disposeHostResources();
        }
    }
    catch (error) {
        await disposeHostResources();
        throw error;
    }
}
export async function resumeBenchPackRun(config, benchPackId, options, runtime) {
    const existingSummary = await loadRunSummaryForBenchPack(config, benchPackId, options.runId);
    if (hasCompleteRunResults(existingSummary)) {
        return existingSummary;
    }
    const artifacts = getRunArtifactsForExistingRun(existingSummary);
    const { rootDir, manifest, benchPack } = await loadConfiguredBenchPack(config, benchPackId, runtime);
    const resumeEvents = [];
    const emit = async (event) => {
        resumeEvents.push(event);
        await appendJsonLine(artifacts.eventsPath, event);
        await options.onEvent?.(event);
    };
    await startConfiguredBenchPackVerifiers(config, benchPackId, {
        abortSignal: options.abortSignal,
        onProgress: async (progress) => {
            await emit({
                type: "verifier_preparing",
                benchPackId,
                benchPackName: manifest.name,
                verifierId: progress.verifierId,
                phase: progress.phase,
                message: progress.message
            });
        }
    });
    const hostResources = await createHostContext(config, benchPackId, rootDir, manifest, artifacts);
    const hostContext = hostResources.context;
    let hostDisposed = false;
    const disposeHostResources = async () => {
        if (hostDisposed) {
            return;
        }
        hostDisposed = true;
        await hostResources.dispose();
    };
    try {
        const blockingVerifier = hostContext.verifiers.find((verifier) => verifier.required && verifier.status !== "running");
        if (blockingVerifier) {
            if (blockingVerifier.status === "missing_dependency") {
                throw new Error(blockingVerifier.details ?? `Bench Pack "${manifest.name}" requires Local Docker.`);
            }
            if (blockingVerifier.status === "dependency_not_running") {
                throw new Error(blockingVerifier.details ?? `Bench Pack "${manifest.name}" requires Local Docker to be running.`);
            }
            throw new Error(blockingVerifier.details ??
                `Bench Pack "${manifest.name}" requires verifier "${blockingVerifier.id}" to be running before the test can start.`);
        }
        const historicalModelIds = getHistoricalRunModelIds(existingSummary);
        const enabledModels = hostContext.models.filter((model) => model.enabled);
        const selectedModels = historicalModelIds
            .map((modelId) => enabledModels.find((model) => model.id === modelId))
            .filter((model) => Boolean(model));
        const missingModelIds = historicalModelIds.filter((modelId) => !selectedModels.some((model) => model.id === modelId));
        if (missingModelIds.length > 0) {
            throw new Error(`This saved run cannot be resumed because these historical models are not currently enabled: ${missingModelIds.join(", ")}.`);
        }
        if (selectedModels.length === 0) {
            throw new Error("This saved run has no resumable models.");
        }
        const scenarios = await benchPack.listScenarios();
        const existingCellKeys = new Set(Object.entries(existingSummary.resultsByModel).flatMap(([modelId, results]) => results.map((result) => `${modelId}::${result.scenarioId}`)));
        const shouldExecuteCell = (scenario, model) => !existingCellKeys.has(`${model.id}::${scenario.id}`);
        const resultsByModel = Object.fromEntries(selectedModels.map((model) => [model.id, []]));
        const prepared = await benchPack.prepare(hostContext);
        const executionMode = options.executionMode ?? existingSummary.executionMode ?? "parallel_by_test_case";
        const generation = resolveBenchPackGeneration(manifest, options.generation);
        let runErrorMessage;
        let cancelled = false;
        try {
            await emit({
                type: "run_started",
                runId: existingSummary.runId,
                models: selectedModels.map((model) => ({ id: model.id, label: model.label })),
                totalScenarios: scenarios.length
            });
            try {
                throwIfAborted(options.abortSignal);
                switch (executionMode) {
                    case "serial":
                        await executeSerialTestCasesMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, existingSummary.runId, shouldExecuteCell, options.abortSignal);
                        break;
                    case "serial_by_model":
                        await executeSerialByModelMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, existingSummary.runId, shouldExecuteCell, options.abortSignal);
                        break;
                    case "parallel_by_test_case":
                        await executeParallelTestCasesMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, existingSummary.runId, shouldExecuteCell, options.abortSignal);
                        break;
                    case "full_parallel":
                        await executeFullParallelMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, existingSummary.runId, shouldExecuteCell, options.abortSignal);
                        break;
                    case "parallel_by_model":
                    default:
                        await executeParallelModelsMode(scenarios, selectedModels, prepared, benchPackId, generation, emit, resultsByModel, existingSummary.runId, shouldExecuteCell, options.abortSignal);
                        break;
                }
            }
            catch (error) {
                runErrorMessage = toErrorMessage(error);
                cancelled = isAbortError(error) || Boolean(options.abortSignal?.aborted);
                await emit({
                    type: "run_error",
                    message: runErrorMessage
                });
            }
            return await withRunSummaryLock(`${benchPackId}:${existingSummary.runId}`, async () => {
                const latestSummary = await loadRunSummaryForBenchPack(config, benchPackId, existingSummary.runId);
                const mergedResultsByModel = mergeResultsByModel(resultsByModel, latestSummary.resultsByModel);
                const mergedEvents = [...latestSummary.events, ...resumeEvents];
                const scores = Object.fromEntries(Object.entries(mergedResultsByModel).map(([modelId, results]) => [modelId, benchPack.scoreModelResults(results)]));
                const nextSnapshot = {
                    ...latestSummary,
                    executionMode,
                    resultsByModel: mergedResultsByModel
                };
                const isComplete = hasCompleteRunResults(nextSnapshot);
                if (!runErrorMessage) {
                    await emit({
                        type: "run_finished",
                        scores
                    });
                }
                const nextSummary = {
                    ...latestSummary,
                    executionMode,
                    completedAt: new Date().toISOString(),
                    cancelled: isComplete ? false : cancelled || latestSummary.cancelled,
                    error: isComplete ? undefined : runErrorMessage ?? latestSummary.error,
                    events: mergedEvents,
                    resultsByModel: mergedResultsByModel,
                    scores
                };
                await writeRunSummary(artifacts.summaryPath, nextSummary);
                return nextSummary;
            });
        }
        finally {
            await prepared.dispose();
            await disposeHostResources();
        }
    }
    catch (error) {
        await disposeHostResources();
        throw error;
    }
}
export async function listRunHistoryForBenchPack(config, benchPackId) {
    const runRoot = getBenchPackRunRoot(config, benchPackId);
    if (!(await pathExists(runRoot))) {
        return [];
    }
    const entries = await fs.readdir(runRoot, { withFileTypes: true });
    const summaries = await Promise.all(entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
        const summaryPath = path.join(runRoot, entry.name, "summary.json");
        if (!(await pathExists(summaryPath))) {
            return null;
        }
        const summary = await readJsonFile(summaryPath);
        return {
            runId: summary.runId,
            runDir: summary.runDir,
            benchPackId: summary.benchPackId,
            benchPackName: summary.benchPackName,
            executionMode: summary.executionMode,
            startedAt: summary.startedAt,
            completedAt: summary.completedAt,
            modelCount: summary.modelCount,
            scenarioCount: summary.scenarioCount,
            cancelled: summary.cancelled,
            error: summary.error
        };
    }));
    return summaries
        .filter((entry) => entry !== null)
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}
export async function loadRunSummaryForBenchPack(config, benchPackId, runId) {
    const summaryPath = path.join(getBenchPackRunRoot(config, benchPackId), runId, "summary.json");
    if (!(await pathExists(summaryPath))) {
        throw new Error(`Run history "${runId}" was not found for Bench Pack "${benchPackId}".`);
    }
    return readJsonFile(summaryPath);
}
export async function clearRunHistoryForBenchPack(config, benchPackId) {
    const runRoot = getBenchPackRunRoot(config, benchPackId);
    await fs.rm(runRoot, { recursive: true, force: true });
    return { removed: true };
}
export function createBenchPackHost() {
    let status = "idle";
    return {
        getStatus() {
            return status;
        },
        async loadBenchPack(entryPath, benchPackId) {
            status = "loading";
            status = "ready";
            return {
                benchPackId,
                entryPath
            };
        }
    };
}
