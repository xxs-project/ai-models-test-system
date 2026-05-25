# ReasonMath-15

ReasonMath-15 is an official BenchLocal Bench Pack for practical reasoning and math. The repo keeps one benchmark core and exposes it through a BenchLocal adapter and a CLI runner.

## Bench Pack Structure

```text
lib/                    Benchmark core, scoring, and model runtime
benchlocal/             Thin BenchLocal SDK adapter
cli/                    Non-UI runner
benchlocal.pack.json  Static install/discovery manifest
METHODOLOGY.md          Published benchmark methodology
```

## BenchLocal Adapter

- `benchlocal/index.ts` is the only place that imports `@benchlocal/sdk`.
- `lib/` stays framework-agnostic and is shared by the CLI and BenchLocal.
- `benchlocal.pack.json` is the canonical Bench Pack metadata manifest used for install, inspection, and runtime metadata.
- Per-pack default sampling belongs on the manifest, not on global host settings.

## Development

- BenchLocal build: `npm run build:benchlocal`
- CLI runner: `npm run cli`
- Methodology: [METHODOLOGY.md](./METHODOLOGY.md)

## Validation

```bash
npm run typecheck
npm run build:benchlocal
```
