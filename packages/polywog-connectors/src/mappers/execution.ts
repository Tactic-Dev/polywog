import type {
  ExecutionResult,
  SpokeResult,
  ExecutorInput,
  ExecutorHooks,
  RoutePlan,
  ContextBundle,
  ContextEntry,
  SpokeAssignment,
} from '@polywog/core';
import type { PkgRoutePlan, PkgRouteStep } from './route.js';
import type { PkgContextBundle } from './context.js';

/**
 * Shape the Executor package expects as input.
 */
export interface PkgExecutorInput {
  traceId: string;
  routePlan: PkgExecutorRoutePlan;
  contextBundle: PkgExecutorContextBundle;
  executionOptions?: { maxParallel?: number; defaultTimeoutMs?: number; continueOnOptionalFailure?: boolean; dryRun?: boolean; captureDebug?: boolean };
  spokeRegistry?: unknown;
  ledgerHook?: PkgExecutorLedgerHook;
  systemState?: { online: boolean; featureFlags?: Record<string, boolean>; disabledSpokes?: string[] };
  debug?: boolean;
}

export interface PkgExecutorRoutePlan {
  id: string;
  intentId?: string;
  traceId: string;
  status: string;
  route: {
    mode: string;
    steps: PkgExecutorRouteStep[];
    fallbackPlan?: Array<{ trigger: string; targetStepId?: string; targetSpokeId?: string; action: string; note?: string }>;
  };
  metadata?: Record<string, unknown>;
}

export interface PkgExecutorRouteStep {
  stepId: string;
  spokeId: string;
  action: string;
  purpose: string;
  required: boolean;
  dependencies: string[];
  timeoutMs?: number;
  condition?: unknown;
  params?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PkgExecutorContextBundle {
  id: string;
  traceId: string;
  intent?: string;
  entities?: Array<{ type: string; value: string; confidence?: number; metadata?: Record<string, unknown> }>;
  documents?: Array<{ id: string; title?: string; content: string; source?: string; metadata?: Record<string, unknown> }>;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface PkgExecutorLedgerHook {
  onStepStarted(event: { traceId: string; stepId: string; spokeId: string; timestamp: string; action: string; purpose: string }): void | Promise<void>;
  onStepCompleted(event: { traceId: string; stepId: string; spokeId: string; timestamp: string; status: string; durationMs: number; confidence?: number }): void | Promise<void>;
  onStepFailed(event: { traceId: string; stepId: string; spokeId: string; timestamp: string; errorCode: string; errorMessage: string; durationMs: number }): void | Promise<void>;
  onFallbackApplied(event: { traceId: string; stepId: string; timestamp: string; fallback: unknown }): void | Promise<void>;
  onExecutionNote(event: { traceId: string; timestamp: string; note: string; severity: string }): void | Promise<void>;
}

/**
 * Shape the Executor package actually returns.
 */
export interface PkgExecutionResult {
  id: string;
  timestamp: string;
  traceId: string;
  routePlanId: string;
  status: string;
  stepResults: PkgStepResult[];
  spokesUsed: string[];
  completedStepIds: string[];
  failedStepIds: string[];
  skippedStepIds: string[];
  fallbacksApplied: Array<{ stepId: string; trigger: string; action: string; note?: string; replacementSpokeId?: string }>;
  actionsTaken: string[];
  nextSteps: string[];
  warnings: string[];
  errors: string[];
  metrics: { totalSteps: number; completedSteps: number; failedSteps: number; skippedSteps: number; durationMs: number; parallelGroupsExecuted: number };
  confidence: number;
  debug?: unknown;
}

export interface PkgStepResult {
  stepId: string;
  spokeId: string;
  status: string;
  required: boolean;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  action: string;
  purpose: string;
  outputText?: string;
  outputMarkdown?: string;
  structuredData?: Record<string, unknown>;
  citations?: Array<{ text: string; source?: string; url?: string }>;
  sources?: Array<{ name: string; type?: string; url?: string }>;
  artifacts?: Array<{ id: string; type: string; name?: string; content?: string; mimeType?: string }>;
  actionsTaken?: string[];
  nextSteps?: string[];
  warnings?: string[];
  error?: { code: string; message: string; details?: Record<string, unknown> };
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export function mapCoreInputToPkgExecutorInput(input: ExecutorInput, traceId: string): PkgExecutorInput {
  const coreRoute = input.route;
  const coreContext = input.context;

  const rawRoute = coreRoute.raw as PkgRoutePlan | undefined;
  const rawContext = coreContext.raw as PkgContextBundle | undefined;

  const routePlan: PkgExecutorRoutePlan = rawRoute
    ? {
        id: rawRoute.id,
        intentId: rawRoute.intentId,
        traceId,
        status: rawRoute.clarificationRequired ? 'needs_clarification' : 'ready',
        route: {
          mode: rawRoute.executionMode,
          steps: rawRoute.steps.map(mapRouterStepToExecutorStep),
          fallbackPlan: rawRoute.fallbackPlan.map((f) => ({
            trigger: f.trigger as string,
            action: f.action,
            targetSpokeId: f.rerouteTo,
            note: f.note,
          })),
        },
      }
    : buildMinimalExecutorRoute(coreRoute, traceId);

  const contextBundle: PkgExecutorContextBundle = rawContext
    ? {
        id: rawContext.id,
        traceId: rawContext.traceId,
        intent: rawContext.intentId,
        entities: rawContext.contextItems
          .filter((i) => i.category === 'constraint')
          .map((i) => ({ type: i.sourceType, value: i.content })),
        documents: rawContext.contextItems
          .filter((i) => i.category !== 'constraint')
          .map((i) => ({ id: i.contextItemId, title: i.title, content: i.content, source: i.sourceType })),
        data: {},
      }
    : buildMinimalExecutorContext(coreContext, traceId);

  const ledgerHook = input.hooks ? mapCoreHooksToPkgLedgerHook(input.hooks, traceId) : undefined;

  return {
    traceId,
    routePlan,
    contextBundle,
    ledgerHook,
    debug: false,
  };
}

function mapRouterStepToExecutorStep(step: PkgRouteStep): PkgExecutorRouteStep {
  return {
    stepId: step.stepId,
    spokeId: step.spokeId,
    action: step.action,
    purpose: step.purpose,
    required: step.optionality === 'required',
    dependencies: step.dependsOn,
    timeoutMs: step.timeoutMs,
  };
}

function buildMinimalExecutorRoute(route: RoutePlan, traceId: string): PkgExecutorRoutePlan {
  return {
    id: route.routePlanId,
    traceId,
    status: route.clarificationNeeded ? 'needs_clarification' : 'ready',
    route: {
      mode: route.strategy === 'parallel' ? 'parallel' : route.strategy === 'sequential' ? 'sequential' : 'single',
      steps: route.spokes.map((spoke: SpokeAssignment, idx: number) => ({
        stepId: `step_${idx + 1}`,
        spokeId: spoke.spokeId,
        action: (spoke.params?.['action'] as string) ?? 'process',
        purpose: (spoke.params?.['purpose'] as string) ?? 'general processing',
        required: true,
        dependencies: idx > 0 && route.strategy !== 'parallel' ? [`step_${idx}`] : [],
      })),
    },
  };
}

function buildMinimalExecutorContext(ctx: ContextBundle, traceId: string): PkgExecutorContextBundle {
  return {
    id: ctx.contextId,
    traceId,
    documents: ctx.entries.map((e: ContextEntry, idx: number) => ({
      id: `doc_${idx}`,
      title: (e.metadata?.['title'] as string) ?? undefined,
      content: e.content,
      source: e.source,
    })),
    data: {},
  };
}

function mapCoreHooksToPkgLedgerHook(hooks: ExecutorHooks, traceId: string): PkgExecutorLedgerHook {
  return {
    onStepStarted(event) {
      hooks.onStepStarted?.(event.stepId, event.spokeId);
    },
    onStepCompleted(event) {
      hooks.onStepCompleted?.(event.stepId, event.spokeId, { status: event.status, durationMs: event.durationMs });
    },
    onStepFailed(event) {
      hooks.onStepFailed?.(event.stepId, event.spokeId, new Error(event.errorMessage));
    },
    onFallbackApplied(event) {
      const fb = event.fallback as { replacementSpokeId?: string } | undefined;
      hooks.onFallbackApplied?.(event.stepId, '', fb?.replacementSpokeId ?? 'unknown');
    },
    onExecutionNote(event) {
      hooks.onExecutionNote?.(event.note);
    },
  };
}

export function mapPkgExecutionResultToCore(pkg: PkgExecutionResult): ExecutionResult {
  const statusMap: Record<string, 'success' | 'partial' | 'failed'> = {
    success: 'success',
    partial: 'partial',
    failed: 'failed',
    blocked: 'failed',
    needs_clarification: 'partial',
    degraded: 'partial',
  };

  const spokeResults: SpokeResult[] = pkg.stepResults.map((sr) => ({
    spokeId: sr.spokeId,
    status: sr.status === 'skipped' ? 'skipped' : sr.status === 'failed' ? 'failed' : 'success',
    output: sr.outputText ?? sr.outputMarkdown ?? sr.structuredData,
    durationMs: sr.durationMs,
    error: sr.error?.message,
  }));

  return {
    executionId: pkg.id,
    status: statusMap[pkg.status] ?? 'failed',
    output: pkg.stepResults
      .filter((sr) => sr.status === 'success' || sr.status === 'partial')
      .map((sr) => sr.outputText ?? sr.outputMarkdown ?? '')
      .join('\n\n'),
    spokeResults,
    warnings: pkg.warnings,
    errors: pkg.errors,
    raw: pkg,
  };
}
