import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { SCENARIOS, scoreModelResults, type ModelScenarioResult, type ScenarioDefinition } from "@/lib/benchmark";
import { runScenarioForModel, type RunEvent } from "@/lib/orchestrator";
import { getModelConfigs, type ModelConfig } from "@/lib/models";
import type { GenerationParams } from "@/lib/llm-client";

type CliOptions = {
  scenarioIds: string[];
  modelIds: string[];
  showRaw: boolean;
  json: boolean;
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  requestTimeoutSeconds?: number;
};

type ScenarioRunSummary = {
  scenarioId: string;
  title: string;
  results: Array<{
    modelId: string;
    label: string;
    status: ModelScenarioResult["status"];
    score: number;
    summary: string;
    note?: string;
    rawLog?: string;
  }>;
};

function loadDotEnvIfPresent(): void {
  const envPath = path.join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function printUsage(): void {
  console.log(`DataExtract-15 CLI

Usage:
  npm run cli -- [options]

Options:
  --scenario DE-01           Run a single scenario
  --scenarios DE-01,DE-02    Run a comma-separated list of scenarios
  --model openrouter:...     Run a single configured model
  --models id1,id2           Run a comma-separated list of configured model ids
  --temperature 0
  --top-p 1
  --top-k 0
  --min-p 0
  --timeout 30               Request timeout in seconds
  --show-raw                 Print raw per-model trace
  --json                     Emit machine-readable JSON summary
  --help                     Show this message
`);
}

function parseNumber(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} must be a valid number.`);
  }

  return parsed;
}

function parseInteger(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} must be a valid integer.`);
  }

  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    scenarioIds: [],
    modelIds: [],
    showRaw: false,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--scenario": {
        const value = argv[index + 1];
        if (!value) {
          throw new Error("--scenario requires a value.");
        }
        options.scenarioIds.push(value);
        index += 1;
        break;
      }
      case "--scenarios": {
        const value = argv[index + 1];
        if (!value) {
          throw new Error("--scenarios requires a value.");
        }
        options.scenarioIds.push(...value.split(",").map((entry) => entry.trim()).filter(Boolean));
        index += 1;
        break;
      }
      case "--model": {
        const value = argv[index + 1];
        if (!value) {
          throw new Error("--model requires a value.");
        }
        options.modelIds.push(value);
        index += 1;
        break;
      }
      case "--models": {
        const value = argv[index + 1];
        if (!value) {
          throw new Error("--models requires a value.");
        }
        options.modelIds.push(...value.split(",").map((entry) => entry.trim()).filter(Boolean));
        index += 1;
        break;
      }
      case "--temperature":
        options.temperature = parseNumber(argv[index + 1] ?? "", "--temperature");
        index += 1;
        break;
      case "--top-p":
        options.topP = parseNumber(argv[index + 1] ?? "", "--top-p");
        index += 1;
        break;
      case "--top-k":
        options.topK = parseInteger(argv[index + 1] ?? "", "--top-k");
        index += 1;
        break;
      case "--min-p":
        options.minP = parseNumber(argv[index + 1] ?? "", "--min-p");
        index += 1;
        break;
      case "--timeout":
        options.requestTimeoutSeconds = parseInteger(argv[index + 1] ?? "", "--timeout");
        index += 1;
        break;
      case "--show-raw":
        options.showRaw = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.scenarioIds = Array.from(new Set(options.scenarioIds));
  options.modelIds = Array.from(new Set(options.modelIds));

  return options;
}

function resolveScenarios(requestedIds: string[]): ScenarioDefinition[] {
  if (requestedIds.length === 0) {
    return SCENARIOS;
  }

  const selected = SCENARIOS.filter((scenario) => requestedIds.includes(scenario.id));
  if (selected.length !== requestedIds.length) {
    const selectedIds = new Set(selected.map((scenario) => scenario.id));
    const missing = requestedIds.filter((scenarioId) => !selectedIds.has(scenarioId));
    throw new Error(`Unknown scenario id${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  }

  return selected;
}

function resolveModels(requestedIds: string[]): ModelConfig[] {
  const models = getModelConfigs();

  if (requestedIds.length === 0) {
    return models;
  }

  const selected = models.filter((model) => requestedIds.includes(model.id));
  if (selected.length !== requestedIds.length) {
    const selectedIds = new Set(selected.map((model) => model.id));
    const missing = requestedIds.filter((modelId) => !selectedIds.has(modelId));
    throw new Error(`Unknown configured model id${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  }

  return selected;
}

function buildGenerationParams(options: CliOptions): GenerationParams | undefined {
  const params: GenerationParams = {};

  if (options.temperature !== undefined) {
    params.temperature = options.temperature;
  }
  if (options.topP !== undefined) {
    params.top_p = options.topP;
  }
  if (options.topK !== undefined) {
    params.top_k = options.topK;
  }
  if (options.minP !== undefined) {
    params.min_p = options.minP;
  }
  if (options.requestTimeoutSeconds !== undefined) {
    params.request_timeout_seconds = options.requestTimeoutSeconds;
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

function logProgress(event: RunEvent): void {
  if (event.type === "model_progress") {
    process.stdout.write(`  ${event.modelId} ${event.scenarioId}: ${event.message}\n`);
  }
}

function printHumanSummary(
  summaries: ScenarioRunSummary[],
  modelResults: Map<string, ModelScenarioResult[]>,
  ranFullSuite: boolean
): void {
  for (const summary of summaries) {
    console.log(`\n${summary.scenarioId} ${summary.title}`);

    for (const result of summary.results) {
      console.log(`- ${result.label}`);
      console.log(`  status: ${result.status}`);
      console.log(`  score: ${result.score}`);
      console.log(`  summary: ${result.summary}`);
      if (result.note) {
        console.log(`  note: ${result.note}`);
      }
      if (result.rawLog) {
        console.log("  raw:");
        console.log(result.rawLog.split("\n").map((line) => `    ${line}`).join("\n"));
      }
    }
  }

  console.log(ranFullSuite ? "\nScore summary" : "\nPartial run summary");
  for (const [modelId, results] of modelResults.entries()) {
    const score = scoreModelResults(results);
    if (ranFullSuite) {
      console.log(`- ${modelId}: ${score.finalScore} (${score.rating})`);
      continue;
    }

    const average = results.length === 0 ? 0 : Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length);
    console.log(`- ${modelId}: ${average} average across ${results.length} scenario${results.length === 1 ? "" : "s"}`);
  }
}

async function main(): Promise<void> {
  loadDotEnvIfPresent();
  const options = parseArgs(process.argv.slice(2));
  const scenarios = resolveScenarios(options.scenarioIds);
  const models = resolveModels(options.modelIds);
  const params = buildGenerationParams(options);
  const summaries: ScenarioRunSummary[] = [];
  const modelResults = new Map<string, ModelScenarioResult[]>(models.map((model) => [model.id, []]));

  for (const scenario of scenarios) {
    console.log(`\nRunning ${scenario.id} ${scenario.title}`);
    const resultsForScenario: ScenarioRunSummary["results"] = [];

    for (const model of models) {
      const result = await runScenarioForModel(model, scenario, logProgress, params);
      modelResults.get(model.id)?.push(result);
      resultsForScenario.push({
        modelId: model.id,
        label: model.label,
        status: result.status,
        score: result.score,
        summary: result.summary,
        note: result.note,
        rawLog: options.showRaw ? result.rawLog : undefined
      });
    }

    summaries.push({
      scenarioId: scenario.id,
      title: scenario.title,
      results: resultsForScenario
    });
  }

  if (options.json) {
    const scores = Object.fromEntries(
      [...modelResults.entries()].map(([modelId, results]) => [modelId, scoreModelResults(results)])
    );

    console.log(
      JSON.stringify(
        {
          scenarios: summaries,
          scores
        },
        null,
        2
      )
    );
    return;
  }

  printHumanSummary(summaries, modelResults, scenarios.length === SCENARIOS.length);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown CLI error.";
  console.error(`DataExtract-15 CLI failed: ${message}`);
  process.exit(1);
});
