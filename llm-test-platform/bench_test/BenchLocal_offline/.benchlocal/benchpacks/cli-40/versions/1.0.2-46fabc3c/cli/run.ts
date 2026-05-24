import { createServer } from "node:net";
import { randomUUID } from "node:crypto";

import { SCENARIOS, scoreModelResults } from "../lib/benchmark";
import type { ModelConfig } from "../lib/orchestrator";

type Args = {
  scenarios: string[];
  list: boolean;
  all: boolean;
  buildImage: boolean;
  image: string;
  devRuntime: boolean;
  runtimeImage: string;
  verifierUrl?: string;
  verifyCanonical: boolean;
  provider: string;
  baseUrl: string;
  dockerBaseUrl?: string;
  authMode: "none" | "bearer";
  apiKey?: string;
  model?: string;
  providerModel?: string;
  label?: string;
  json: boolean;
  verbose: boolean;
};

type RunnerScenarioResult = {
  scenarioId: string;
  status: "pass" | "partial" | "fail";
  score?: number;
  summary: string;
  note?: string;
  rawLog?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    scenarios: [],
    list: false,
    all: false,
    buildImage: false,
    image: process.env.CLI40_IMAGE || "cli40-dev",
    devRuntime: false,
    runtimeImage: process.env.CLI40_RUNTIME_IMAGE || "node:22-alpine",
    verifierUrl: process.env.CLI40_VERIFIER_URL,
    verifyCanonical: false,
    provider: process.env.CLI40_PROVIDER || "ollama",
    baseUrl: process.env.CLI40_BASE_URL || "http://localhost:11434/v1",
    dockerBaseUrl: process.env.CLI40_DOCKER_BASE_URL,
    authMode: (process.env.CLI40_AUTH_MODE as "none" | "bearer") || "none",
    apiKey: process.env.CLI40_API_KEY,
    model: process.env.CLI40_MODEL || "gemma4:31b-cloud",
    providerModel: process.env.CLI40_PROVIDER_MODEL,
    label: process.env.CLI40_LABEL,
    json: false,
    verbose: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    switch (current) {
      case "--list":
        args.list = true;
        break;
      case "--all":
        args.all = true;
        break;
      case "--scenario":
        if (!next) {
          throw new Error("Missing value for --scenario");
        }
        args.scenarios.push(next);
        index += 1;
        break;
      case "--build-image":
        args.buildImage = true;
        break;
      case "--image":
        if (!next) {
          throw new Error("Missing value for --image");
        }
        args.image = next;
        index += 1;
        break;
      case "--dev-runtime":
        args.devRuntime = true;
        break;
      case "--runtime-image":
        if (!next) {
          throw new Error("Missing value for --runtime-image");
        }
        args.runtimeImage = next;
        index += 1;
        break;
      case "--verifier-url":
        if (!next) {
          throw new Error("Missing value for --verifier-url");
        }
        args.verifierUrl = next;
        index += 1;
        break;
      case "--verify-canonical":
        args.verifyCanonical = true;
        break;
      case "--provider":
        if (!next) {
          throw new Error("Missing value for --provider");
        }
        args.provider = next;
        index += 1;
        break;
      case "--base-url":
        if (!next) {
          throw new Error("Missing value for --base-url");
        }
        args.baseUrl = next;
        index += 1;
        break;
      case "--docker-base-url":
        if (!next) {
          throw new Error("Missing value for --docker-base-url");
        }
        args.dockerBaseUrl = next;
        index += 1;
        break;
      case "--auth-mode":
        if (!next || (next !== "none" && next !== "bearer")) {
          throw new Error("Missing or invalid value for --auth-mode");
        }
        args.authMode = next;
        index += 1;
        break;
      case "--api-key":
        if (!next) {
          throw new Error("Missing value for --api-key");
        }
        args.apiKey = next;
        index += 1;
        break;
      case "--model":
        if (!next) {
          throw new Error("Missing value for --model");
        }
        args.model = next;
        index += 1;
        break;
      case "--provider-model":
        if (!next) {
          throw new Error("Missing value for --provider-model");
        }
        args.providerModel = next;
        index += 1;
        break;
      case "--label":
        if (!next) {
          throw new Error("Missing value for --label");
        }
        args.label = next;
        index += 1;
        break;
      case "--json":
        args.json = true;
        break;
      case "--verbose":
        args.verbose = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${current}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`CLI-40 local runner

Usage:
  npm run dev:run -- --list
  npm run dev:run -- --scenario CLI-21 --build-image
  npm run dev:run -- --scenario CLI-01 --verify-canonical --build-image

Options:
  --list                  List available scenarios
  --scenario <id>         Run one scenario; can be repeated
  --all                   Run all scenarios
  --verify-canonical      Run verifier-owned canonical checks instead of a model
  --build-image           Rebuild the verifier Docker image before running
  --image <name>          Verifier Docker image tag; defaults to cli40-dev
  --dev-runtime           Run the verifier from a mounted local runtime image instead of a built image
  --runtime-image <name>  Base image for --dev-runtime; defaults to node:22-alpine
  --verifier-url <url>    Use an already-running verifier instead of starting Docker
  --model <id>            Model exposed to the verifier; defaults to gemma4:31b-cloud
  --provider-model <id>   Upstream provider model label; defaults to --model
  --provider <id>         Provider label; defaults to ollama
  --base-url <url>        Host OpenAI-compatible endpoint; defaults to http://localhost:11434/v1
  --docker-base-url <url> Docker-reachable inference URL override
  --auth-mode <mode>      none or bearer; defaults to none
  --api-key <token>       Optional bearer token when auth-mode=bearer
  --label <text>          Display label; defaults to --model
  --json                  Print full JSON responses
  --verbose               Print raw logs

Environment:
  CLI40_MODEL=gemma4:31b-cloud
  CLI40_BASE_URL=http://localhost:11434/v1
  CLI40_DOCKER_BASE_URL=http://host.docker.internal:11434/v1
  CLI40_AUTH_MODE=none
`);
}

async function runCommand(command: string, args: string[], options: { cwd?: string } = {}) {
  const { spawn } = await import("node:child_process");
  return await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr
      });
    });
  });
}

async function requireSuccessful(command: string, args: string[], options: { cwd?: string } = {}) {
  const result = await runCommand(command, args, options);
  if (result.exitCode !== 0) {
    throw new Error(`Command failed: ${[command, ...args].join(" ")}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return result;
}

async function allocatePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate a local port.")));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function imageExists(image: string) {
  const result = await runCommand("docker", ["image", "inspect", image]);
  return result.exitCode === 0;
}

async function waitForHealth(baseUrl: string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("/health", baseUrl));
      if (response.ok) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for verifier health at ${baseUrl}`);
}

async function startVerifierContainer(image: string) {
  const hostPort = await allocatePort();
  const containerName = `cli40-dev-${randomUUID().slice(0, 8)}`;

  await requireSuccessful("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    containerName,
    "--security-opt",
    "no-new-privileges",
    "--memory",
    "512m",
    "--cpus",
    "1",
    "--add-host",
    "host.docker.internal:host-gateway",
    "-p",
    `${hostPort}:4040`,
    image
  ]);

  const baseUrl = `http://127.0.0.1:${hostPort}`;
  await waitForHealth(baseUrl);

  return {
    baseUrl,
    containerName,
    async stop() {
      await runCommand("docker", ["rm", "-f", containerName]);
    }
  };
}

async function startDevVerifierContainer(runtimeImage: string) {
  const hostPort = await allocatePort();
  const containerName = `cli40-devruntime-${randomUUID().slice(0, 8)}`;
  const verificationDir = `${process.cwd()}/verification`;
  const startupCommand = [
    "apk add --no-cache bash ca-certificates coreutils findutils gawk git grep gzip jq make procps python3 py3-pytest sed tar xz >/dev/null",
    "mkdir -p /workspace /tmp/cli40-runs",
    "node /opt/verification/server.mjs"
  ].join(" && ");

  await requireSuccessful("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    containerName,
    "--security-opt",
    "no-new-privileges",
    "--memory",
    "512m",
    "--cpus",
    "1",
    "--add-host",
    "host.docker.internal:host-gateway",
    "-p",
    `${hostPort}:4040`,
    "-v",
    `${verificationDir}:/opt/verification`,
    runtimeImage,
    "sh",
    "-lc",
    startupCommand
  ]);

  const baseUrl = `http://127.0.0.1:${hostPort}`;
  await waitForHealth(baseUrl);

  return {
    baseUrl,
    containerName,
    async stop() {
      await runCommand("docker", ["rm", "-f", containerName]);
    }
  };
}

function toDockerReachableUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    url.hostname = "host.docker.internal";
  }
  return url.toString();
}

function resolveScenarios(args: Args) {
  if (args.all) {
    return [...SCENARIOS];
  }
  if (args.scenarios.length > 0) {
    return args.scenarios.map((id) => {
      const scenario = SCENARIOS.find((candidate) => candidate.id === id);
      if (!scenario) {
        throw new Error(`Unknown scenario ${id}`);
      }
      return scenario;
    });
  }
  return [];
}

function toModelConfig(args: Args): ModelConfig {
  if (!args.model) {
    throw new Error("A model is required unless --verify-canonical is used.");
  }

  return {
    id: args.model,
    label: args.label ?? args.model,
    provider: args.provider,
    providerModel: args.providerModel ?? args.model,
    inferenceBaseUrl: args.dockerBaseUrl ?? toDockerReachableUrl(args.baseUrl),
    authMode: args.authMode,
    apiKey: args.apiKey,
    exposedModel: args.model
  };
}

async function fetchResult(verifierUrl: string, pathName: string, payload: unknown) {
  const response = await fetch(new URL(pathName, verifierUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Verifier request failed with ${response.status} ${response.statusText}: ${detail}`);
  }

  return await response.json() as RunnerScenarioResult;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    for (const scenario of SCENARIOS) {
      console.log(`${scenario.id}\t${scenario.kind}\t${scenario.category}\t${scenario.title}`);
    }
    return;
  }

  const scenarios = resolveScenarios(args);
  if (scenarios.length === 0) {
    printHelp();
    return;
  }

    if (!args.verifierUrl && !args.devRuntime && (args.buildImage || !(await imageExists(args.image)))) {
      console.log(`Building verifier image ${args.image}...`);
      await requireSuccessful("docker", ["build", "-t", args.image, "verification"]);
    }

    let verifier = null as null | { baseUrl: string; stop(): Promise<void> };
    try {
      if (!args.verifierUrl) {
        verifier = args.devRuntime
          ? await startDevVerifierContainer(args.runtimeImage)
          : await startVerifierContainer(args.image);
      }
    const activeVerifierUrl = args.verifierUrl ?? verifier?.baseUrl;
    if (!activeVerifierUrl) {
      throw new Error("Could not determine a verifier URL.");
    }

    const modelConfig = args.verifyCanonical ? null : toModelConfig(args);
    const results = [];

    for (const scenario of scenarios) {
      const result = args.verifyCanonical
        ? await fetchResult(activeVerifierUrl, "/verify-canonical", { scenarioId: scenario.id })
        : await fetchResult(activeVerifierUrl, "/run-scenario", {
          scenarioId: scenario.id,
          runId: randomUUID(),
          model: modelConfig,
          generation: {
            temperature: 0,
            request_timeout_seconds: 300
          }
        });

      results.push(result);

      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`${scenario.id} ${scenario.title}: ${result.status.toUpperCase()} ${result.score ?? 0}`);
        console.log(`  ${result.summary}`);
        if (result.note) {
          console.log(`  ${result.note}`);
        }
      }

      if (args.verbose && result.rawLog) {
        console.log("--- raw log ---");
        console.log(result.rawLog);
      }
    }

    if (!args.json) {
      const score = scoreModelResults(results.map((result) => ({
        ...result,
        score: result.score ?? 0,
        rawLog: result.rawLog ?? ""
      })));
      console.log("");
      console.log(`Total score: ${score.totalScore}`);
      for (const category of score.categories) {
        console.log(`  ${category.label}: ${category.score}`);
      }
      if (score.summary) {
        console.log(score.summary);
      }
    }
  } finally {
    if (verifier) {
      await verifier.stop();
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
