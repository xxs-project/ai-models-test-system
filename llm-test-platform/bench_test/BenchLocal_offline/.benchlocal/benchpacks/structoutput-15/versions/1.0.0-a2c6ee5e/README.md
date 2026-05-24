# StructOutput-15

StructOutput-15 is an official BenchLocal Bench Pack for deterministic structured outputs. The repo keeps one benchmark core and exposes it through a BenchLocal adapter, a CLI runner, and an optional verifier runtime.

## Bench Pack Structure

```text
lib/                    Benchmark core, scoring, and model runtime
benchlocal/             Thin BenchLocal SDK adapter
cli/                    Non-UI runner
verification/           Optional verifier runtime for exact validation
scripts/                Local helper scripts for verifier development
benchlocal.pack.json  Static install/discovery manifest
METHODOLOGY.md          Published benchmark methodology
```

## BenchLocal Adapter

- `benchlocal/index.ts` is the only place that imports `@benchlocal/sdk`.
- `lib/` stays framework-agnostic and is shared by the CLI and BenchLocal.
- `benchlocal.pack.json` is the canonical Bench Pack metadata manifest used for install, inspection, and runtime metadata.
- Verifier lifecycle belongs to BenchLocal; the pack only declares `verification/` and its manifest metadata.

## Development

- BenchLocal build: `npm run build:benchlocal`
- CLI runner: `npm run cli`
- Methodology: [METHODOLOGY.md](./METHODOLOGY.md)

## Local Verifier

```bash
npm install
cp .env.example .env
```

Terminal 1:

```bash
npm run verify:sandbox:serve
```

## Validation

```bash
npm run typecheck
npm run build:benchlocal
npm run verify:canonical
```
