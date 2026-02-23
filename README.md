<div align="center">
  <img src="assets/logo.png" alt="PolyWOG" width="160" />
</div>

# PolyWOG

**Workflow Orchestration Graph** — A polymorphic AI orchestration engine that routes requests through a pluggable pipeline of interpreters, routers, context weavers, executors, and formatters.

```
Interpreter → Router → Weave → Executor → Format
                    (Ledger recording throughout)
```

## Overview

PolyWOG stitches six sovereign modules into one end-to-end execution pipeline. Each module is a standalone package; Core orchestrates them via dependency injection without importing a single one. The pipeline degrades gracefully when stages fail, and Ledger is optional.

## Packages

| Package | Description |
|---------|-------------|
| **@polywog/core** | Orchestration runtime. Single `run()` API, lifecycle hooks, Zod validation. |
| **@polywog/connectors** | Adapter wrappers bridging real axle modules to Core's contracts. |
| **@polywog/server** | Express HTTP API exposing `POST /api/run`, health, and config. |
| **polywog-ui** | React dashboard for chat, pipeline visualization, and debug mode. |

## Quick Start

### Run the full stack

```bash
# 1. Install dependencies (from repo root)
cd packages/polywog-core && npm install && npm run build
cd ../polywog-connectors && npm install && npm run build
cd ../polywog-server && npm install
cd ../polywog-ui && npm install

# 2. Start the API server (terminal 1)
cd packages/polywog-server && npm run dev
# → http://localhost:3100

# 3. Start the UI (terminal 2)
cd packages/polywog-ui && npm run dev
# → http://localhost:5173 (proxies /api to server)
```

### Use Core programmatically

```ts
import { createPolywogCore } from '@polywog/core';
import { InterpreterAdapter, RouterAdapter, WeaveAdapter, ExecutorAdapter, FormatAdapter, LedgerAdapter } from '@polywog/connectors';

const core = createPolywogCore({
  modules: {
    interpreter: new InterpreterAdapter(polywogInterpreter),
    router: new RouterAdapter(polywogRouter),
    weave: new WeaveAdapter(weaveFn, adapters),
    executor: new ExecutorAdapter(executeFn, spokeRegistry),
    format: new FormatAdapter(polywogFormatter),
    ledger: new LedgerAdapter(polywogLedger),
  },
  hooks: { afterRun: (r) => console.log(r.metrics) },
});

const result = await core.run({
  message: 'Summarize the Q4 report',
  preferences: { formatProfile: 'chat' },
  debug: true,
});

console.log(result.response.content);
console.log(result.trace.traceId);
console.log(result.metrics.totalDurationMs);
```

## Architecture

- **Core** — Validates input, runs the 5-stage pipeline, handles degradation, returns `PolywogRunResult`.
- **Connectors** — Map Core's minimal interfaces to sibling axle packages (Interpreter, Router, Weave, Executor, Format, Ledger).
- **Server** — Mock modules by default; swap in real adapters for production.
- **UI** — Chat interface, pipeline stage visualization, expandable debug details.

### Degradation

| Stage failed | Behaviour |
|--------------|-----------|
| Interpreter | Fail fast, return error response |
| Router | Fallback to `general_llm` route, continue |
| Weave | Minimal context bundle, continue |
| Executor | Synthetic failed result, continue |
| Format | Emergency plain-text response |
| Ledger | Synthetic traceId, add warning, continue |

## Development

```bash
# Build Core and Connectors (required for Server)
cd packages/polywog-core && npm run build
cd ../polywog-connectors && npm run build

# Run tests
cd packages/polywog-core && npm test
cd ../polywog-connectors && npm test

# Type-check
cd packages/polywog-core && npm run typecheck
cd ../polywog-connectors && npm run typecheck
```

## API

- **POST /api/run** — Run the pipeline. Body: `{ message, preferences?, debug?, ... }`
- **GET /api/health** — Health check
- **GET /api/config** — Server config snapshot

## License

MIT
