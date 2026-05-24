import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const verificationDir = path.join(repoRoot, "verification");

const imageName = process.env.STRUCTOUTPUT_VERIFY_IMAGE || "structoutput15-validator";
const containerName = process.env.STRUCTOUTPUT_VERIFY_CONTAINER || "structoutput15-validator-service";
const validatorPort = process.env.STRUCTOUTPUT_VALIDATOR_PORT || "4011";

function run(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function buildImage() {
  run("docker", ["build", "-t", imageName, "."], verificationDir);
}

function stopContainer() {
  spawnSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
}

function serveContainer() {
  buildImage();
  stopContainer();
  run("docker", [
    "run",
    "--rm",
    "--name",
    containerName,
    "-p",
    `${validatorPort}:4010`,
    imageName
  ]);
}

function waitForHealth() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = spawnSync("node", [
      "-e",
      `fetch("http://127.0.0.1:${validatorPort}/health").then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`
    ], { stdio: "ignore" });

    if (result.status === 0) {
      return;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }

  console.error("Validator did not become healthy in time.");
  process.exit(1);
}

function runSmokeChecks() {
  buildImage();
  stopContainer();
  const child = spawnSync("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    containerName,
    "-p",
    `${validatorPort}:4010`,
    imageName
  ], { encoding: "utf8" });

  if (child.status !== 0) {
    process.exit(child.status ?? 1);
  }

  waitForHealth();
  run("node", [
    "-e",
    `fetch("http://127.0.0.1:${validatorPort}/verify-answer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenarioId:"SO-01",answer:'{"title":"The Great Gatsby","author":"F. Scott Fitzgerald","year":1925,"genre":"Novel","in_print":true}'})}).then(async(r)=>{const data=await r.json(); if(!r.ok||data.status!=="pass") throw new Error(JSON.stringify(data)); process.exit(0);}).catch((err)=>{console.error(err);process.exit(1);})`
  ]);
  stopContainer();
}

const command = process.argv[2] || "run";

if (command === "build") {
  buildImage();
} else if (command === "serve") {
  serveContainer();
} else if (command === "stop") {
  stopContainer();
} else if (command === "rebuild") {
  stopContainer();
  runSmokeChecks();
} else if (command === "run") {
  runSmokeChecks();
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
