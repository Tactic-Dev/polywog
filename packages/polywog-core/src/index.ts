export { PolywogCore } from './core.js';
export { createPolywogCore } from './factory.js';

export type { PolywogRunInput, RequestMetadata, SystemContext, Preferences, RuntimeOverrides, AttachmentSummary, FormatProfile } from './types/run-input.js';
export type { PolywogRunResult, TraceInfo, PipelineStatus, PipelineMetrics, DebugInfo, StageStatus } from './types/run-result.js';
export type { PolywogCoreConfig, Logger, StageToggles } from './types/config.js';
export type { LifecycleHooks, StageName } from './types/hooks.js';

export type {
  InterpreterModule, InterpreterInput,
  RouterModule, RouterInput,
  LedgerModule, LedgerEvent, LedgerTrace,
  WeaveModule, WeaveInput,
  ExecutorModule, ExecutorInput, ExecutorHooks,
  FormatModule, FormatInput,
  IntentEnvelope, RoutePlan, SpokeAssignment,
  ContextBundle, ContextEntry,
  ExecutionResult, SpokeResult,
  AxleResponse, ResponseArtifact,
} from './types/modules.js';

export { LedgerBridge } from './bridges/ledger-bridge.js';
export { createExecutorLedgerHook } from './bridges/executor-ledger-hook.js';

export { polywogRunInputSchema } from './schemas/run-input.schema.js';
export { polywogRunResultSchema } from './schemas/run-result.schema.js';

export { fallbackIntent } from './fallbacks/fallback-intent.js';
export { fallbackRoute } from './fallbacks/fallback-route.js';
export { fallbackContext } from './fallbacks/fallback-context.js';
export { fallbackExecution } from './fallbacks/fallback-execution.js';
export { fallbackResponse, emergencyResponse } from './fallbacks/fallback-response.js';

export { STAGE_ORDER, LEDGER_EVENTS } from './lifecycle/stage-names.js';
export { WarningCodes, formatWarning } from './types/warnings.js';
export type { WarningCode } from './types/warnings.js';
