import type { BenchPackRegistryEntry, BenchLocalConfig, BenchLocalExecutionMode, GenerationRequest, BenchPackRunHistoryEntry, BenchPackRunSummary, ProgressEvent, VerifierEndpoint } from "@benchlocal/core";
import { type BenchPackInspection } from "@benchlocal/core";
export type BenchPackHostStatus = "idle" | "loading" | "ready" | "error";
export type LoadedBenchPackHandle = {
    benchPackId: string;
    entryPath: string;
};
type DockerRuntimeAvailability = {
    state: "ready" | "not_installed" | "not_running";
    available: boolean;
    details?: string;
    simulated?: boolean;
};
type VerifierPreparationProgress = {
    verifierId: string;
    phase: "checking_docker" | "building_image" | "pulling_image" | "starting_container" | "waiting_for_healthcheck";
    message: string;
};
type BenchLocalRuntimeCompatibility = {
    benchLocalVersion?: string;
    hostFeatures?: string[];
};
export declare function inspectConfiguredBenchPacks(config: BenchLocalConfig, runtime?: BenchLocalRuntimeCompatibility): Promise<BenchPackInspection[]>;
export declare function loadBenchPackRegistry(config: BenchLocalConfig): Promise<BenchPackRegistryEntry[]>;
type BenchPackInstallAction = "install" | "update" | "uninstall";
type BenchPackInstallPhase = "resolving" | "downloading" | "extracting" | "hydrating" | "validating" | "activating" | "removing" | "complete";
export type BenchPackInstallProgress = {
    benchPackId: string;
    action: BenchPackInstallAction;
    phase: BenchPackInstallPhase;
    message: string;
};
type InstallProgressReporter = (progress: BenchPackInstallProgress) => void | Promise<void>;
export declare function installBenchPackFromRegistry(config: BenchLocalConfig, benchPackId: string, reporter?: InstallProgressReporter, runtime?: BenchLocalRuntimeCompatibility): Promise<BenchLocalConfig>;
export declare function updateBenchPackFromRegistry(config: BenchLocalConfig, benchPackId: string, reporter?: InstallProgressReporter, runtime?: BenchLocalRuntimeCompatibility): Promise<BenchLocalConfig>;
export declare function installBenchPackFromUrl(config: BenchLocalConfig, archiveUrl: string, reporter?: InstallProgressReporter, runtime?: BenchLocalRuntimeCompatibility): Promise<BenchLocalConfig>;
export declare function uninstallBenchPack(config: BenchLocalConfig, benchPackId: string, reporter?: InstallProgressReporter): Promise<BenchLocalConfig>;
export type ConfiguredBenchPackVerifierStatus = {
    benchPackId: string;
    benchPackName: string;
    verifiers: VerifierEndpoint[];
    docker: DockerRuntimeAvailability;
};
export declare function getConfiguredBenchPackVerifierStatus(config: BenchLocalConfig, benchPackId: string): Promise<ConfiguredBenchPackVerifierStatus>;
export declare function startConfiguredBenchPackVerifiers(config: BenchLocalConfig, benchPackId: string, options?: {
    abortSignal?: AbortSignal;
    onProgress?: (progress: VerifierPreparationProgress) => Promise<void> | void;
}): Promise<ConfiguredBenchPackVerifierStatus>;
export declare function stopConfiguredBenchPackVerifiers(config: BenchLocalConfig, benchPackId: string): Promise<ConfiguredBenchPackVerifierStatus>;
export declare function deleteConfiguredBenchPackVerifierImage(config: BenchLocalConfig, benchPackId: string, verifierId: string): Promise<{
    status: ConfiguredBenchPackVerifierStatus;
    image: string;
    removed: boolean;
}>;
export declare function runConfiguredBenchPack(config: BenchLocalConfig, benchPackId: string, options?: {
    modelIds?: string[];
    executionMode?: BenchLocalExecutionMode;
    generation?: GenerationRequest;
    abortSignal?: AbortSignal;
    onEvent?: (event: ProgressEvent) => Promise<void> | void;
}, runtime?: BenchLocalRuntimeCompatibility): Promise<BenchPackRunSummary>;
export declare function retryScenarioForBenchPackRun(config: BenchLocalConfig, benchPackId: string, options: {
    runId: string;
    scenarioId: string;
    modelId: string;
    generation?: GenerationRequest;
    abortSignal?: AbortSignal;
    onEvent?: (event: ProgressEvent) => Promise<void> | void;
}, runtime?: BenchLocalRuntimeCompatibility): Promise<BenchPackRunSummary>;
export declare function resumeBenchPackRun(config: BenchLocalConfig, benchPackId: string, options: {
    runId: string;
    executionMode?: BenchLocalExecutionMode;
    generation?: GenerationRequest;
    abortSignal?: AbortSignal;
    onEvent?: (event: ProgressEvent) => Promise<void> | void;
}, runtime?: BenchLocalRuntimeCompatibility): Promise<BenchPackRunSummary>;
export declare function listRunHistoryForBenchPack(config: BenchLocalConfig, benchPackId: string): Promise<BenchPackRunHistoryEntry[]>;
export declare function loadRunSummaryForBenchPack(config: BenchLocalConfig, benchPackId: string, runId: string): Promise<BenchPackRunSummary>;
export declare function clearRunHistoryForBenchPack(config: BenchLocalConfig, benchPackId: string): Promise<{
    removed: boolean;
}>;
export declare function createBenchPackHost(): {
    getStatus(): BenchPackHostStatus;
    loadBenchPack(entryPath: string, benchPackId: string): Promise<LoadedBenchPackHandle>;
};
export {};
//# sourceMappingURL=index.d.ts.map