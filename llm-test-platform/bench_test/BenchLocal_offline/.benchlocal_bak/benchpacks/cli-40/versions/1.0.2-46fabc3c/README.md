# CLI-40

CLI-40 is a BenchLocal Bench Pack for measuring real Linux command-line capability across 40 executable scenarios.

It is not a multiple-choice benchmark, not a fuzzy string-matching benchmark, and not a mock shell benchmark. Official scoring is based on deterministic filesystem state, file bytes, hashes, permissions, process results, tool traces, and safety outcomes. The full methodology is in [METHODOLOGY.md](./METHODOLOGY.md).

## What This Pack Does

- Runs 40 public benchmark scenarios with canonical IDs `CLI-01` through `CLI-40`
- Evaluates both one-shot shell command generation and multi-round `bash` tool use
- Covers text processing, filesystem operations, pipelines, archives, diagnosis, investigation, safety, and error recovery
- Verifies concrete end states inside a Docker verifier rather than interpreting free-form model prose
- Supports local debugging against OpenAI-compatible endpoints such as Ollama cloud models

## Deterministic Scoring

Every scenario is scored with deterministic checks. The model may produce arbitrary reasoning, but the verifier only grades the required contract and the resulting state.

Each scenario receives:

- `Correctness`: whether the required end state was reached
- `Efficiency`: whether the model used a reasonable number of commands or turns
- `Discipline`: whether the model avoided shortcuts, destructive behavior, broad permission changes, test weakening, non-canonical fixes, or prompt-injection traps

Partial credit is allowed, but it is rubric-driven. For example, a script can produce the right output while still losing Discipline if it does not apply the required root-cause fix. The verifier does not maintain arrays of possible natural-language answers.

## Architecture

CLI-40 uses a split Bench Pack architecture:

1. **BenchLocal host runtime**
   The host side lists scenarios, resolves model configuration, resolves the Docker verifier, and forwards scenario execution requests.

2. **BenchLocal-owned inference endpoint**
   BenchLocal owns provider and model selection. The verifier receives an OpenAI-compatible endpoint, including a Docker-reachable URL.

3. **Docker verifier**
   The verifier owns the Linux workspace, seeds fixtures, executes model-submitted commands, runs multi-round `bash` sessions, and applies deterministic grading.

4. **Strict result artifacts**
   The local strict-suite runner writes JSONL traces and summary JSON files so scored failures and provider errors can be audited after a run.

## Repository Layout

- [benchlocal/index.ts](./benchlocal/index.ts): BenchLocal host adapter
- [lib/benchmark.ts](./lib/benchmark.ts): scenario catalog, category weights, and score aggregation
- [lib/orchestrator.ts](./lib/orchestrator.ts): host-to-verifier execution path
- [verification/core.mjs](./verification/core.mjs): scenario seeding, execution, and deterministic grading
- [verification/server.mjs](./verification/server.mjs): verifier HTTP service
- [verification/Dockerfile](./verification/Dockerfile): verifier image definition
- [cli/run.ts](./cli/run.ts): local one-off runner
- [scripts/run-strict-model-suite.mjs](./scripts/run-strict-model-suite.mjs): resilient all-scenario model runner
- [benchlocal.pack.json](./benchlocal.pack.json): canonical Bench Pack manifest
- [METHODOLOGY.md](./METHODOLOGY.md): public benchmark methodology

## BenchLocal Integration Notes

- This pack requires a Docker verifier.
- This pack requires BenchLocal `>= 0.2.0`.
- The host runtime expects BenchLocal to provide `inferenceEndpoints`.
- Official verifier runs use the Docker-reachable endpoint, typically `dockerBaseUrl`, not a host-only URL.
- The manifest declares required host features explicitly: `inferenceEndpoints` and `dockerInferenceEndpoints`.
- The pack should not require users to configure provider credentials inside the verifier.

## Development

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Typecheck:

```bash
npm run typecheck
```

List scenarios:

```bash
npm run dev:run -- --list
```

Build the verifier image:

```bash
docker build --pull=false --progress=plain -t cli40-dev verification
```

Run the canonical verifier path:

```bash
node dist/cli/run.js --all --verify-canonical --image cli40-dev
```

Expected canonical result:

```text
Total score: 100
```

Run selected model-backed scenarios against Ollama:

```bash
node dist/cli/run.js --scenario CLI-01 --scenario CLI-36 \
  --image cli40-dev \
  --model qwen3.5:397b-cloud \
  --base-url http://localhost:11434/v1
```

Run the full strict suite for one or more models:

```bash
node scripts/run-strict-model-suite.mjs \
  qwen3.5:397b-cloud \
  minimax-m2.7:cloud
```

Strict-suite outputs are written under `results/` as per-model JSONL and summary files.

## Validation

Before publishing or changing scenario logic, run:

```bash
node --check verification/core.mjs
npm run typecheck
npm run build
docker build --pull=false --progress=plain -t cli40-dev verification
node dist/cli/run.js --all --verify-canonical --image cli40-dev
```

The canonical run must pass all `40/40` scenarios with a total score of `100`.

## License

MIT. See [LICENSE](./LICENSE).
