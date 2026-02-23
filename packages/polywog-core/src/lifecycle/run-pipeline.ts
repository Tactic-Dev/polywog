import type { PolywogRunInput } from '../types/run-input.js';
import type { PolywogRunResult, TraceInfo, DebugInfo } from '../types/run-result.js';
import type { PolywogCoreConfig, Logger } from '../types/config.js';
import type {
  IntentEnvelope,
  RoutePlan,
  ContextBundle,
  ExecutionResult,
  AxleResponse,
  InterpreterInput,
  RouterInput,
  WeaveInput,
  ExecutorInput,
  FormatInput,
} from '../types/modules.js';

import { polywogRunInputSchema } from '../schemas/run-input.schema.js';
import { LedgerBridge } from '../bridges/ledger-bridge.js';
import { createExecutorLedgerHook } from '../bridges/executor-ledger-hook.js';
import { runStage, type StageResult } from './stage-runner.js';
import { LEDGER_EVENTS } from './stage-names.js';
import { resolveDefaults, mergePreferences } from '../config/merge-config.js';
import { fallbackIntent } from '../fallbacks/fallback-intent.js';
import { fallbackRoute } from '../fallbacks/fallback-route.js';
import { fallbackContext } from '../fallbacks/fallback-context.js';
import { fallbackExecution } from '../fallbacks/fallback-execution.js';
import { fallbackResponse, emergencyResponse } from '../fallbacks/fallback-response.js';
import { nowMs, elapsedMs } from '../utils/time.js';
import { toErrorMessage } from '../utils/errors.js';
import { sanitizeForDebug } from '../utils/sanitize.js';
import { compact } from '../utils/arrays.js';

export async function runPipeline(
  input: PolywogRunInput,
  config: PolywogCoreConfig,
): Promise<PolywogRunResult> {
  const totalStart = nowMs();
  const resolved = resolveDefaults(config);
  const prefs = mergePreferences(resolved.preferences, input.preferences);
  const debug = input.debug ?? resolved.debug;
  const hooks = config.hooks;
  const logger = config.logger;

  const warnings: string[] = [];
  const errors: string[] = [];
  const debugInfo: DebugInfo = { stageOutputs: {}, stageDurations: {}, fallbackNotes: [] };

  /* ── Validate input ────────────────────────────────────────────── */
  const parseResult = polywogRunInputSchema.safeParse(input);
  if (!parseResult.success) {
    const validationError = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid PolywogRunInput: ${validationError}`);
  }

  /* ── beforeRun hook ────────────────────────────────────────────── */
  await safeHook(() => hooks?.beforeRun?.(input), warnings, logger);

  /* ── Ledger: start trace ───────────────────────────────────────── */
  const bridge = new LedgerBridge(config.modules.ledger, logger);
  const traceId = await bridge.startTrace(input.metadata as Record<string, unknown> | undefined);
  await bridge.appendEvent(LEDGER_EVENTS.REQUEST_RECEIVED, { message: input.message });

  /* ── Interpreter stage ─────────────────────────────────────────── */
  let intentResult: StageResult<IntentEnvelope>;

  const interpreterInput: InterpreterInput = {
    message: input.message,
    conversationHistory: input.conversationHistory,
    attachments: input.attachments,
    systemContext: input.systemContext
      ? { activeProject: input.systemContext.activeProject, mode: input.systemContext.mode, constraints: input.systemContext.constraints }
      : undefined,
  };

  if (config.stageToggles?.interpreter === false) {
    intentResult = { value: fallbackIntent(input.message), status: 'skipped', durationMs: 0 };
  } else {
    intentResult = await runStage<IntentEnvelope>({
      stageName: 'interpreter',
      execute: () => config.modules.interpreter.interpret(interpreterInput),
      fallback: () => fallbackIntent(input.message),
      hooks,
      logger,
      payload: interpreterInput,
      failFast: true,
    });
  }

  if (intentResult.status === 'failed') {
    errors.push(intentResult.error ?? 'Interpreter failed');
    debugInfo.fallbackNotes?.push('Interpreter failed — returning error response');
    await bridge.appendEvent(LEDGER_EVENTS.PIPELINE_FAILED, { stage: 'interpreter', error: intentResult.error });
    await bridge.failTrace('Interpreter failure');
    warnings.push(...bridge.warnings);

    const resp = fallbackResponse(traceId, 'Unable to understand the request.');
    return buildResult(resp, traceId, 'failed', intentResult, null, null, null, null, totalStart, warnings, errors, debug ? debugInfo : undefined);
  }

  await bridge.appendEvent(LEDGER_EVENTS.INTENT_INTERPRETED, { intentId: intentResult.value.intentId });
  collectStageDebug(debugInfo, 'interpreter', intentResult);

  /* ── Router stage ──────────────────────────────────────────────── */
  let routeResult: StageResult<RoutePlan>;

  const routerInput: RouterInput = {
    intent: intentResult.value,
    preferences: {
      internalFirst: prefs.internalFirst,
      preferSpeed: prefs.preferSpeed,
      preferAccuracy: prefs.preferAccuracy,
      preferLowCost: prefs.preferLowCost,
      allowParallel: prefs.allowParallel,
    },
    availableSpokes: input.runtimeOverrides?.availableSpokes,
    disabledSpokes: input.runtimeOverrides?.disabledSpokes,
    offlineMode: input.runtimeOverrides?.offlineMode,
  };

  if (config.stageToggles?.router === false) {
    routeResult = { value: fallbackRoute(), status: 'skipped', durationMs: 0 };
  } else {
    routeResult = await runStage<RoutePlan>({
      stageName: 'router',
      execute: () => config.modules.router.plan(routerInput),
      fallback: () => {
        debugInfo.fallbackNotes?.push('Router failed — using general_llm fallback route');
        return fallbackRoute();
      },
      hooks,
      logger,
      payload: routerInput,
    });
  }

  if (routeResult.warning) warnings.push(routeResult.warning);

  const routeLedgerEvent = routeResult.status === 'success'
    ? (routeResult.value.clarificationNeeded ? LEDGER_EVENTS.CLARIFICATION_REQUIRED : LEDGER_EVENTS.ROUTE_PLANNED)
    : LEDGER_EVENTS.ROUTE_DEGRADED;
  await bridge.appendEvent(routeLedgerEvent, { routePlanId: routeResult.value.routePlanId, strategy: routeResult.value.strategy });
  collectStageDebug(debugInfo, 'router', routeResult);

  /* ── Weave stage ───────────────────────────────────────────────── */
  let weaveResult: StageResult<ContextBundle>;

  const weaveInput: WeaveInput = {
    intent: intentResult.value,
    route: routeResult.value,
    message: input.message,
    conversationHistory: input.conversationHistory,
    systemContext: input.systemContext
      ? { activeProject: input.systemContext.activeProject, mode: input.systemContext.mode, constraints: input.systemContext.constraints }
      : undefined,
  };

  if (config.stageToggles?.weave === false) {
    weaveResult = { value: fallbackContext(input.systemContext?.constraints), status: 'skipped', durationMs: 0 };
  } else {
    weaveResult = await runStage<ContextBundle>({
      stageName: 'weave',
      execute: () => config.modules.weave.assemble(weaveInput),
      fallback: () => {
        debugInfo.fallbackNotes?.push('Weave failed — using minimal context fallback');
        return fallbackContext(input.systemContext?.constraints);
      },
      hooks,
      logger,
      payload: weaveInput,
    });
  }

  if (weaveResult.warning) warnings.push(weaveResult.warning);
  await bridge.appendEvent(LEDGER_EVENTS.CONTEXT_ASSEMBLED, { contextId: weaveResult.value.contextId, entryCount: weaveResult.value.entries.length });
  collectStageDebug(debugInfo, 'weave', weaveResult);

  /* ── Executor stage ────────────────────────────────────────────── */
  let executionResult: StageResult<ExecutionResult>;

  const executorHooks = createExecutorLedgerHook(bridge);
  const executorInput: ExecutorInput = {
    route: routeResult.value,
    context: weaveResult.value,
    hooks: executorHooks,
  };

  if (config.stageToggles?.executor === false) {
    executionResult = { value: fallbackExecution('Executor disabled'), status: 'skipped', durationMs: 0 };
  } else {
    executionResult = await runStage<ExecutionResult>({
      stageName: 'executor',
      execute: () => config.modules.executor.execute(executorInput),
      fallback: (err) => {
        debugInfo.fallbackNotes?.push('Executor failed — using synthetic failed execution');
        return fallbackExecution(toErrorMessage(err));
      },
      hooks,
      logger,
      payload: executorInput,
    });
  }

  if (executionResult.warning) warnings.push(executionResult.warning);
  if (executionResult.value.warnings) warnings.push(...executionResult.value.warnings);
  if (executionResult.value.errors) errors.push(...executionResult.value.errors);
  await bridge.appendEvent(LEDGER_EVENTS.EXECUTION_COMPLETED, {
    executionId: executionResult.value.executionId,
    status: executionResult.value.status,
  });
  collectStageDebug(debugInfo, 'executor', executionResult);

  /* ── Format stage ──────────────────────────────────────────────── */
  let formatResult: StageResult<AxleResponse>;

  const formatInput: FormatInput = {
    traceId,
    intent: intentResult.value,
    route: routeResult.value,
    execution: executionResult.value,
    formatProfile: prefs.formatProfile,
  };

  if (config.stageToggles?.format === false) {
    formatResult = { value: fallbackResponse(traceId), status: 'skipped', durationMs: 0 };
  } else {
    formatResult = await runStage<AxleResponse>({
      stageName: 'format',
      execute: () => config.modules.format.format(formatInput),
      fallback: (err) => {
        debugInfo.fallbackNotes?.push('Format failed — using emergency response');
        return emergencyResponse(traceId, toErrorMessage(err));
      },
      hooks,
      logger,
      payload: formatInput,
    });
  }

  if (formatResult.warning) warnings.push(formatResult.warning);
  await bridge.appendEvent(LEDGER_EVENTS.RESPONSE_FORMATTED, { responseId: formatResult.value.responseId });

  if (formatResult.value.artifacts) {
    for (const artifact of formatResult.value.artifacts) {
      await bridge.attachArtifact(artifact);
    }
  }

  collectStageDebug(debugInfo, 'format', formatResult);

  /* ── Ledger: complete or fail trace ────────────────────────────── */
  const hasFailed = errors.length > 0 || executionResult.value.status === 'failed';
  if (hasFailed) {
    await bridge.failTrace('Pipeline completed with errors');
  } else {
    await bridge.completeTrace();
  }

  /* ── Collect bridge warnings ───────────────────────────────────── */
  warnings.push(...bridge.warnings);

  /* ── afterRun hook ─────────────────────────────────────────────── */
  const traceStatus: TraceInfo['status'] = hasFailed ? 'failed' : 'completed';

  const result = buildResult(
    formatResult.value,
    traceId,
    traceStatus,
    intentResult,
    routeResult,
    weaveResult,
    executionResult,
    formatResult,
    totalStart,
    warnings,
    errors,
    debug ? debugInfo : undefined,
  );

  await safeHook(() => hooks?.afterRun?.(result), warnings, logger);

  return result;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function buildResult(
  response: AxleResponse,
  traceId: string,
  traceStatus: TraceInfo['status'],
  intent: StageResult<IntentEnvelope> | null,
  route: StageResult<RoutePlan> | null,
  weave: StageResult<ContextBundle> | null,
  execution: StageResult<ExecutionResult> | null,
  format: StageResult<AxleResponse> | null,
  totalStart: number,
  warnings: string[],
  errors: string[],
  debug?: DebugInfo,
): PolywogRunResult {
  const totalDuration = elapsedMs(totalStart);

  if (route?.value.clarificationNeeded) {
    response = { ...response, status: 'clarification_needed' };
    if (route.value.clarificationPrompt) {
      response = { ...response, content: route.value.clarificationPrompt };
    }
  }

  return {
    response,
    trace: {
      traceId,
      status: traceStatus,
      intentId: intent?.value.intentId,
      routePlanId: route?.value.routePlanId,
      executionId: execution?.value.executionId,
    },
    pipeline: {
      intentStatus: intent?.status ?? 'skipped',
      routeStatus: route?.status ?? 'skipped',
      weaveStatus: weave?.status ?? 'skipped',
      executionStatus: execution?.status ?? 'skipped',
      formatStatus: format?.status ?? 'skipped',
    },
    metrics: {
      totalDurationMs: totalDuration,
      interpreterMs: intent?.durationMs ?? 0,
      routerMs: route?.durationMs ?? 0,
      weaveMs: weave?.durationMs ?? 0,
      executorMs: execution?.durationMs ?? 0,
      formatMs: format?.durationMs ?? 0,
    },
    warnings: compact(warnings),
    errors: compact(errors),
    debug,
  };
}

function collectStageDebug(debugInfo: DebugInfo, stage: string, result: StageResult<unknown>): void {
  if (debugInfo.stageOutputs) debugInfo.stageOutputs[stage] = sanitizeForDebug(result.value);
  if (debugInfo.stageDurations) debugInfo.stageDurations[stage] = result.durationMs;
}

async function safeHook(
  fn: () => void | Promise<void> | undefined,
  warnings: string[],
  logger?: Logger,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const msg = `[HOOK_ERROR] ${toErrorMessage(err)}`;
    warnings.push(msg);
    logger?.warn(msg);
  }
}
