# ToolCall-15

`main` now tracks the maintained Bench Pack version of ToolCall-15 for BenchLocal.

If you need the older standalone web app implementation, use the [`legacy/web-app`](https://github.com/stevibe/ToolCall-15/tree/legacy/web-app) branch. That branch is preserved for compatibility, but BenchLocal is now the recommended way to run ToolCall-15 because it provides a unified experience for providers, models, workspaces, histories, and the broader Bench Pack suite.

ToolCall-15 is an official BenchLocal Bench Pack for deterministic tool use and tool-call loop scoring. The repo keeps one benchmark core and exposes it through a BenchLocal adapter and a CLI runner.

## What It Measures

ToolCall-15 is organized into 5 categories, with 3 scenarios per category:

- Tool Selection
- Parameter Precision
- Multi-Step Chains
- Restraint and Refusal
- Error Recovery

Each scenario is scored as:

- `2` points for a pass
- `1` point for a partial pass
- `0` points for a fail

Each category is worth `6` points. The final score is the average of the 5 category percentages, rounded to a whole number.

## Bench Pack Structure

```text
lib/                    Benchmark core, scoring, tool loop, and transport
benchlocal/             Thin BenchLocal SDK adapter
cli/                    Non-UI runner
benchlocal.pack.json    Canonical Bench Pack manifest
METHODOLOGY.md          Published benchmark methodology
```

## BenchLocal Adapter

- `benchlocal/index.ts` is the only place that imports `@benchlocal/sdk`.
- `lib/` stays framework-agnostic and is shared by the CLI and BenchLocal.
- `benchlocal.pack.json` is the canonical Bench Pack metadata manifest used for install, inspection, and runtime metadata.
- Per-pack default sampling belongs on the manifest. ToolCall-15 defaults to `temperature: 0`.

## Methodology

The benchmark spec is documented in [METHODOLOGY.md](./METHODOLOGY.md) and implemented in [lib/benchmark.ts](./lib/benchmark.ts).

## Design Goals

- Reproducible: the system prompt, tool schema, mocked tool outputs, and scoring logic are all versioned in the repo.
- Balanced: the suite spreads scenarios across distinct tool-use failure modes instead of over-indexing on one skill.
- Deterministic: tool results are mocked and the benchmark uses `temperature: 0`.
- Inspectable: every scenario stores a raw trace so failures can be audited.

## BenchLocal and CLI

- Install: `npm install`
- BenchLocal build: `npm run build:benchlocal`
- CLI runner: `npm run cli`
- Methodology: [METHODOLOGY.md](./METHODOLOGY.md)

## Validation

```bash
npm run typecheck
npm run build:benchlocal
```
