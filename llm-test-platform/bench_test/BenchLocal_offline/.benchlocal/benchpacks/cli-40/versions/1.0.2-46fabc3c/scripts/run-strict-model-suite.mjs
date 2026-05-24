import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

import { SCENARIOS, scoreModelResults } from "../dist/lib/benchmark.js";

const IMAGE = process.env.CLI40_IMAGE || "cli40-dev";
const BASE_URL = process.env.CLI40_BASE_URL || "http://localhost:11434/v1";
const DOCKER_BASE_URL = process.env.CLI40_DOCKER_BASE_URL || toDockerReachableUrl(BASE_URL);
const OUTPUT_DIR = process.env.CLI40_RESULT_DIR || "results";
const REQUEST_TIMEOUT_SECONDS = Number.parseInt(process.env.CLI40_REQUEST_TIMEOUT_SECONDS || "300", 10);
const RETRIES = Number.parseInt(process.env.CLI40_RETRIES || "1", 10);

const models = process.argv.slice(2);
if (models.length === 0) {
  console.error("Usage: node scripts/run-strict-model-suite.mjs <model> [model...]");
  process.exit(1);
}

function slugify(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function toDockerReachableUrl(baseUrl) {
  const url = new URL(baseUrl);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    url.hostname = "host.docker.internal";
  }
  return url.toString();
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
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
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

async function requireSuccessful(command, args) {
  const result = await runCommand(command, args);
  if (result.exitCode !== 0) {
    throw new Error(`Command failed: ${[command, ...args].join(" ")}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return result;
}

async function allocatePort() {
  return await new Promise((resolve, reject) => {
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

async function waitForHealth(baseUrl) {
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

async function startVerifierContainer(model) {
  const hostPort = await allocatePort();
  const containerName = `cli40-${slugify(model)}-${randomUUID().slice(0, 8)}`;

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
    IMAGE
  ]);

  const baseUrl = `http://127.0.0.1:${hostPort}`;
  await waitForHealth(baseUrl);

  return {
    baseUrl,
    async stop() {
      await runCommand("docker", ["rm", "-f", containerName]);
    }
  };
}

async function postJson(baseUrl, pathname, payload) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Verifier request failed with ${response.status} ${response.statusText}: ${detail}`);
  }

  return await response.json();
}

function failureResult(model, scenario, error, attempts) {
  return {
    scenarioId: scenario.id,
    status: "fail",
    score: 0,
    summary: "Scenario did not complete because the model endpoint or verifier request failed.",
    note: error instanceof Error ? error.message : String(error),
    rawLog: "",
    output: { finalAnswer: "", assistantMessages: [], toolCalls: [], toolResults: [] },
    verifier: {
      status: "fail",
      summary: "Endpoint or verifier request failure.",
      details: { verdict: "error", correctness: 0, efficiency: 0, discipline: 0, attempts }
    }
  };
}

async function runScenario(verifierUrl, model, scenario) {
  const modelConfig = {
    id: model,
    label: model,
    provider: "ollama",
    providerModel: model,
    inferenceBaseUrl: DOCKER_BASE_URL,
    authMode: "none",
    exposedModel: model
  };

  let lastError;
  for (let attempt = 1; attempt <= RETRIES + 1; attempt += 1) {
    try {
      const result = await postJson(verifierUrl, "/run-scenario", {
        scenarioId: scenario.id,
        runId: randomUUID(),
        model: modelConfig,
        generation: {
          temperature: 0,
          request_timeout_seconds: REQUEST_TIMEOUT_SECONDS
        }
      });
      return { result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt <= RETRIES) {
        console.log(`${model} ${scenario.id}: RETRY ${attempt}/${RETRIES} after ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return {
    result: failureResult(model, scenario, lastError, RETRIES + 1),
    attempts: RETRIES + 1,
    error: lastError
  };
}

async function runModel(model) {
  console.log(`\n=== ${model} ===`);
  const verifier = await startVerifierContainer(model);
  const rows = [];
  const startedAt = new Date().toISOString();

  try {
    for (const scenario of SCENARIOS) {
      const { result, attempts, error } = await runScenario(verifier.baseUrl, model, scenario);
      rows.push({ model, attempts, result, error: error ? String(error instanceof Error ? error.message : error) : null });
      const suffix = error ? ` ERROR ${result.note}` : result.note ? ` ${result.note}` : "";
      console.log(`${model} ${scenario.id} ${result.status.toUpperCase()} ${result.score ?? 0}${attempts > 1 ? ` attempts=${attempts}` : ""}${suffix}`);
    }
  } finally {
    await verifier.stop();
  }

  const scored = rows.map((row) => ({
    ...row.result,
    score: row.result.score ?? 0,
    rawLog: row.result.rawLog ?? ""
  }));
  const score = scoreModelResults(scored);
  const counts = {
    pass: scored.filter((result) => result.status === "pass").length,
    partial: scored.filter((result) => result.status === "partial").length,
    fail: scored.filter((result) => result.status === "fail").length
  };
  const rawTotal = scored.reduce((sum, result) => sum + (result.score ?? 0), 0);
  const summary = {
    model,
    startedAt,
    completedAt: new Date().toISOString(),
    weightedScore: score.totalScore,
    rawTotal,
    rawAverage: rawTotal / scored.length,
    counts,
    categories: score.categories,
    failures: rows.filter((row) => row.result.status === "fail").map((row) => ({
      scenarioId: row.result.scenarioId,
      score: row.result.score ?? 0,
      note: row.result.note ?? "",
      error: row.error
    }))
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const resultPath = path.join(OUTPUT_DIR, `${slugify(model)}.strict.jsonl`);
  const summaryPath = path.join(OUTPUT_DIR, `${slugify(model)}.strict.summary.json`);
  await writeFile(resultPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
  await writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log(`${model} total weighted=${summary.weightedScore} raw=${summary.rawTotal}/${scored.length * 100} avg=${summary.rawAverage.toFixed(2)} pass=${counts.pass} partial=${counts.partial} fail=${counts.fail}`);
  console.log(`${model} results ${resultPath}`);
  return summary;
}

const summaries = [];
for (const model of models) {
  summaries.push(await runModel(model));
}

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "strict-comparison.json"), JSON.stringify(summaries, null, 2) + "\n", "utf8");
console.log("\n=== comparison ===");
for (const summary of summaries) {
  console.log(`${summary.model}\tweighted=${summary.weightedScore}\traw=${summary.rawTotal}/${SCENARIOS.length * 100}\tavg=${summary.rawAverage.toFixed(2)}\tpass=${summary.counts.pass}\tpartial=${summary.counts.partial}\tfail=${summary.counts.fail}`);
}
