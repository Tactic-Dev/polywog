# Polywog Core

Orchestration wrapper that stitches the six Polywog axle modules into one end-to-end execution pipeline.

```
Interpreter -> Router -> Weave -> Executor -> Format
                  (Ledger recording throughout)
```

Polywog Core is the runtime entry point for the Polywog product.
It accepts a raw user request, runs it through the axle, and returns a final `AxleResponse` plus optional debug/trace metadata.

## Architecture

### Pipeline lifecycle

```
Request In
    │
    ▼
┌─────────────────┐
│  Validate Input  │  Zod schema validation
└────────┬────────┘
         ▼
┌─────────────────┐
│  Start Trace     │  Ledger.startTrace (or synthetic fallback)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Interpreter     │  message → IntentEnvelope
│                  │  FAIL FAST if this stage fails
└────────┬────────┘
         ▼
┌─────────────────┐
│  Router          │  intent → RoutePlan
│                  │  Degrades to general_llm fallback route
└────────┬────────┘
         ▼
┌─────────────────┐
│  Weave           │  intent + route → ContextBundle
│                  │  Degrades to minimal empty context
└────────┬────────┘
         ▼
┌─────────────────┐
│  Executor        │  route + context → ExecutionResult
│                  │  Step events flow to Ledger via hook bridge
│                  │  Degrades to synthetic failed result
└────────┬────────┘
         ▼
┌─────────────────┐
│  Format          │  execution → AxleResponse
│                  │  Degrades to emergency plain-text response
└────────┬────────┘
         ▼
┌─────────────────┐
│  Complete Trace  │  Ledger.completeTrace or failTrace
└────────┬────────┘
         ▼
    Result Out
```

### Module contracts

Each axle module is injected via a minimal interface.
Core never imports sibling packages directly — it depends on local contracts only.

| Module        | Method                              | Input                   | Output            |
|---------------|-------------------------------------|-------------------------|-------------------|
| Interpreter   | `interpret(input)`                  | `InterpreterInput`      | `IntentEnvelope`  |
| Router        | `plan(input)`                       | `RouterInput`           | `RoutePlan`       |
| Weave         | `assemble(input)`                   | `WeaveInput`            | `ContextBundle`   |
| Executor      | `execute(input)`                    | `ExecutorInput`         | `ExecutionResult` |
| Format        | `format(input)`                     | `FormatInput`           | `AxleResponse`    |
| Ledger        | `startTrace`, `appendEvent`, etc.   | various                 | various           |

## Quick start

```ts
import { createPolywogCore } from '@polywog/core';

const core = createPolywogCore({
  modules: {
    interpreter: myInterpreter,
    router: myRouter,
    weave: myWeave,
    executor: myExecutor,
    format: myFormat,
    ledger: myLedger, // optional
  },
});

const result = await core.run({
  message: 'Summarize the Q4 report',
  metadata: { userId: 'u_123' },
  preferences: { formatProfile: 'chat' },
});

console.log(result.response.content);
console.log(result.trace.traceId);
console.log(result.metrics.totalDurationMs);
```

## Dependency injection

All six modules are provided via `PolywogCoreConfig.modules`.
Ledger is optional — the pipeline degrades gracefully without it.

```ts
interface PolywogCoreConfig {
  modules: {
    interpreter: InterpreterModule;
    router: RouterModule;
    weave: WeaveModule;
    executor: ExecutorModule;
    format: FormatModule;
    ledger?: LedgerModule;   // optional
  };
  defaults?: { preferences?: Preferences; timeoutMs?: number; debug?: boolean };
  featureFlags?: Record<string, boolean>;
  stageToggles?: StageToggles;  // disable stages for testing
  hooks?: LifecycleHooks;
  logger?: Logger;
}
```

## Error and degradation strategy

Core prefers returning a useful response over throwing.

| Stage failed   | Behaviour                                                    |
|----------------|--------------------------------------------------------------|
| Interpreter    | **Fail fast.** Return error response immediately.            |
| Router         | Degrade to `general_llm` fallback route. Continue pipeline.  |
| Weave          | Degrade to empty context bundle. Continue pipeline.          |
| Executor       | Produce synthetic failed `ExecutionResult`. Continue.        |
| Format         | Return emergency plain-text response.                        |
| Ledger (any)   | Continue pipeline. Synthetic traceId if needed. Add warning. |

All degradation notes are returned in `result.warnings`, `result.errors`, and `result.debug.fallbackNotes`.

## Hooks

Register lifecycle hooks via `config.hooks`:

```ts
const core = createPolywogCore({
  modules: { ... },
  hooks: {
    beforeRun(input)             { /* called before pipeline starts */ },
    afterRun(result)             { /* called after pipeline completes */ },
    beforeStage(name, payload)   { /* called before each stage */ },
    afterStage(name, result)     { /* called after each stage */ },
    onError(name, error)         { /* called when a stage fails */ },
    onWarning(warning)           { /* called on non-fatal warnings */ },
  },
});
```

Hook exceptions are caught and added as `HOOK_ERROR` warnings — they never crash the pipeline.

## Executor ledger hook bridge

When both Executor and Ledger are present, step-level execution events are forwarded to Ledger automatically:

| Executor callback      | Ledger event type     |
|------------------------|-----------------------|
| `onStepStarted`        | `step_started`        |
| `onStepCompleted`      | `step_completed`      |
| `onStepFailed`         | `step_failed`         |
| `onFallbackApplied`    | `fallback_applied`    |
| `onExecutionNote`      | `system_note`         |

## Input and output shapes

### `PolywogRunInput`

| Field                | Type                          | Required |
|----------------------|-------------------------------|----------|
| `message`            | `string`                      | yes      |
| `conversationHistory`| `{ role, content }[]`         | no       |
| `metadata`           | `RequestMetadata`             | no       |
| `attachments`        | `AttachmentSummary[]`         | no       |
| `systemContext`      | `SystemContext`               | no       |
| `preferences`        | `Preferences`                 | no       |
| `runtimeOverrides`   | `RuntimeOverrides`            | no       |
| `debug`              | `boolean`                     | no       |

### `PolywogRunResult`

| Field      | Type              | Description                          |
|------------|-------------------|--------------------------------------|
| `response` | `AxleResponse`    | The final formatted response         |
| `trace`    | `TraceInfo`       | Trace/ledger metadata                |
| `pipeline` | `PipelineStatus`  | Per-stage status                     |
| `metrics`  | `PipelineMetrics` | Per-stage and total durations        |
| `warnings` | `string[]`        | Non-fatal warnings                   |
| `errors`   | `string[]`        | Errors encountered                   |
| `debug`    | `DebugInfo?`      | Stage outputs/durations (if enabled) |

## Folder structure

```
src/
  index.ts                 Barrel exports
  core.ts                  PolywogCore class
  factory.ts               createPolywogCore factory
  types/
    run-input.ts           Input type definitions
    run-result.ts          Output type definitions
    config.ts              Config type definitions
    modules.ts             Module interface contracts
    hooks.ts               Lifecycle hook types
    warnings.ts            Warning codes
  schemas/
    run-input.schema.ts    Zod input validation
    run-result.schema.ts   Zod output schema
  lifecycle/
    run-pipeline.ts        Main pipeline orchestrator
    stage-runner.ts        Generic stage executor with fallback
    stage-names.ts         Stage order + ledger event constants
  bridges/
    ledger-bridge.ts       Safe ledger wrapper (LedgerBridge)
    executor-ledger-hook.ts  Executor → Ledger event bridge
  fallbacks/
    fallback-intent.ts     Fallback IntentEnvelope
    fallback-route.ts      Fallback RoutePlan (general_llm)
    fallback-context.ts    Fallback ContextBundle
    fallback-execution.ts  Fallback ExecutionResult
    fallback-response.ts   Fallback/emergency AxleResponse
  config/
    defaults.ts            Default preferences and timeouts
    merge-config.ts        Config/preference merge utilities
  utils/
    ids.ts                 ID generation
    time.ts                Timing utilities
    errors.ts              Error helpers
    sanitize.ts            Debug output sanitisation
    arrays.ts              Array utilities
  __tests__/
    helpers.ts             Shared mock module factory
    core.test.ts           Happy path tests
    degradation.test.ts    Degradation tests
    ledger-bridge.test.ts  LedgerBridge tests
    hooks.test.ts          Lifecycle hook tests
  examples/
    happy-path.ts          Full success scenario
    degraded-path.ts       Router/Weave failure scenario
    no-ledger.ts           No-ledger scenario
    debug.ts               Debug mode scenario
```

## Running tests

```bash
npm test            # single run
npm run test:watch  # watch mode
npm run typecheck   # type-check only
```

## Future enhancements (architecture-ready, not implemented in v1)

- Queue-based async execution mode
- Streaming partial responses
- Retry policies per stage
- Multi-route execution (branching)
- Cost tracking
- Multi-tenant workspace policies
- Live event bus for UI
