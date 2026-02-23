import type {
  AxleResponse,
  ResponseArtifact,
  FormatInput,
  IntentEnvelope,
  RoutePlan,
  ExecutionResult,
  SpokeAssignment,
  SpokeResult,
} from '@polywog/core';
import type { PkgIntentEnvelope } from './intent.js';
import type { PkgRoutePlan, PkgRouteStep } from './route.js';
import type { PkgExecutionResult, PkgStepResult } from './execution.js';

/**
 * Shape the Format package expects as input.
 */
export interface PkgFormatterInput {
  traceId: string;
  intentEnvelope?: {
    intentId?: string;
    intent?: string;
    confidence?: number;
    entities?: Record<string, unknown>;
    [key: string]: unknown;
  };
  routePlan?: {
    routePlanId?: string;
    steps?: Array<{ stepId?: string; spokeId?: string; [key: string]: unknown }>;
    requiresClarification?: boolean;
    [key: string]: unknown;
  };
  executionResult: {
    traceId?: string;
    status?: string;
    stepResults: PkgStepResult[];
    fallbacksApplied?: string[];
    durationMs?: number;
    metadata?: Record<string, unknown>;
  };
  formatProfile?: string;
  includeDebug?: boolean;
}

/**
 * Shape the Format package actually returns.
 */
export interface PkgAxleResponse {
  id: string;
  timestamp: string;
  traceId: string;
  status: string;
  title: string;
  answer: { text: string; markdown?: string; sections?: Array<{ type: string; title: string; content: string }> };
  evidence: { citations: Array<{ id: string; label: string; ref: string; snippet: string }>; sources: Array<{ id: string; name: string; url?: string; type?: string }>; confidence?: number };
  actionsTaken: string[];
  nextSteps: string[];
  artifacts: Array<{ artifactId: string; type: string; title: string; uri?: string; mimeType?: string; metadata?: Record<string, unknown> }>;
  clarifications: Array<{ question: string; options?: string[]; fieldRef?: string }>;
  executionSummary: { spokesUsed: string[]; stepCount: number; completedSteps: number; failedSteps: number; degraded: boolean; fallbacksApplied: string[]; durationMs?: number };
  links?: { intentId?: string; routePlanId?: string; responseId?: string };
  uiHints?: { renderMode: string; showCitations: boolean; showArtifacts: boolean; showActions: boolean };
  debug?: unknown;
}

export function mapCoreInputToPkgFormatterInput(input: FormatInput): PkgFormatterInput {
  const rawIntent = input.intent.raw as PkgIntentEnvelope | undefined;
  const rawRoute = input.route.raw as PkgRoutePlan | undefined;
  const rawExec = input.execution.raw as PkgExecutionResult | undefined;

  const intentEnvelope = rawIntent
    ? { intentId: rawIntent.id, intent: rawIntent.intentType, confidence: rawIntent.confidence, entities: {} as Record<string, unknown> }
    : { intentId: input.intent.intentId, intent: input.intent.action, confidence: input.intent.confidence, entities: input.intent.entities };

  const routePlan = rawRoute
    ? {
        routePlanId: rawRoute.id,
        steps: rawRoute.steps.map((s: PkgRouteStep) => ({ stepId: s.stepId, spokeId: s.spokeId })),
        requiresClarification: rawRoute.clarificationRequired,
      }
    : {
        routePlanId: input.route.routePlanId,
        steps: input.route.spokes.map((s: SpokeAssignment, i: number) => ({ stepId: `step_${i}`, spokeId: s.spokeId })),
        requiresClarification: input.route.clarificationNeeded,
      };

  const executionResult = rawExec
    ? {
        traceId: rawExec.traceId,
        status: rawExec.status,
        stepResults: rawExec.stepResults,
        fallbacksApplied: rawExec.fallbacksApplied.map((f) => `${f.trigger}:${f.action}`),
        durationMs: rawExec.metrics.durationMs,
      }
    : {
        traceId: input.traceId,
        status: input.execution.status,
        stepResults: (input.execution.spokeResults ?? []).map((sr: SpokeResult, i: number) => ({
          stepId: `step_${i}`,
          spokeId: sr.spokeId,
          status: sr.status,
          required: true,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          durationMs: sr.durationMs ?? 0,
          action: 'process',
          purpose: 'general',
          outputText: typeof sr.output === 'string' ? sr.output : undefined,
        })),
      };

  return {
    traceId: input.traceId,
    intentEnvelope,
    routePlan,
    executionResult,
    formatProfile: input.formatProfile,
  };
}

export function mapPkgAxleResponseToCore(pkg: PkgAxleResponse): AxleResponse {
  const statusMap: Record<string, 'complete' | 'partial' | 'clarification_needed' | 'error'> = {
    done: 'complete',
    partial: 'partial',
    blocked: 'error',
    failed: 'error',
    needs_clarification: 'clarification_needed',
  };

  const artifacts: ResponseArtifact[] = pkg.artifacts.map((a) => ({
    artifactId: a.artifactId,
    type: a.type,
    label: a.title,
    content: a.uri ?? a.metadata ?? null,
  }));

  return {
    responseId: pkg.id,
    content: pkg.answer.markdown ?? pkg.answer.text,
    contentType: pkg.answer.markdown ? 'text/markdown' : 'text/plain',
    status: statusMap[pkg.status] ?? 'error',
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    metadata: {
      title: pkg.title,
      actionsTaken: pkg.actionsTaken,
      nextSteps: pkg.nextSteps,
      evidence: pkg.evidence,
      executionSummary: pkg.executionSummary,
      uiHints: pkg.uiHints,
      clarifications: pkg.clarifications,
      links: pkg.links,
      raw: pkg,
    },
  };
}
