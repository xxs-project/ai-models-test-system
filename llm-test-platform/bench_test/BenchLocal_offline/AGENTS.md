# Agent Instructions for BenchLocal

BenchLocal is an **Electron desktop app** (not a web app) for running LLM Bench Packs. This repository contains the host app, shared protocol libraries, and the local execution engine. **It does not contain the Bench Packs themselves.**

## Architecture & Boundaries
- **Monorepo**: Uses npm workspaces (`app/`, `packages/*`).
- **Bench Packs**: Bench Packs are runtime artifacts, not source code checkouts. They are installed to and loaded from `~/.benchlocal/benchpacks`.
- **User State**: All configuration, installed packs, databases, and logs are stored in `~/.benchlocal/`.
- **Execution**: The host runs bench packs by loading their `dist/benchlocal/index.js` entrypoint dynamically. Verifiers (e.g., for isolated code execution) run via local Docker containers managed by the host.

## Developer Commands
Run these commands from the repository root:
- `npm run dev` - Start the Electron app in development mode.
- `npm run dev:devtools` - Start the app and force Chromium DevTools to open.
- `npm run typecheck` - Run TypeScript compiler checks across all workspaces. There are no standard `lint` or `test` scripts.
- `npm run build` - Compile all packages and the app.
- `npm run build:dir` - Compile and produce an unpacked local app bundle (faster than `pack`).
- `npm run pack` - Compile and build the production desktop artifacts.

## Important Quirks & Conventions
- **No Web Server**: Do not look for Next.js, Express, or standalone Vite web servers. The UI is built with React + Vite via `electron-vite`, compiled for the Electron renderer (`app/src/renderer`).
- **Automation Scripts**: The root directory contains custom automation scripts (e.g., `run_benchmarks.mjs`, `run_evals.mjs`, `run_benchlocal.sh`) which bypass the desktop UI and use `@benchlocal/benchpack-host` directly to run evaluations.
- **Agent API**: BenchLocal exposes a local HTTP/MCP API for agent control when enabled in settings. If asked to modify agent-facing tools, refer to `docs/agent-control-api.md`.
