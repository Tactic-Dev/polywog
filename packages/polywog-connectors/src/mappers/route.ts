import type { RoutePlan, RouterInput, IntentEnvelope, SpokeAssignment } from '@polywog/core';
import type { PkgIntentEnvelope } from './intent.js';

/**
 * Shape the Router package expects as input.
 */
export interface PkgRouterInput {
  intentEnvelope: PkgRouterIntentEnvelope;
  availableSpokes?: string[];
  systemState?: { online: boolean; availableTools: string[]; featureFlags: Record<string, boolean>; workspacePolicies: Record<string, string> };
  routingPreferences?: {
    preferSpeed: boolean;
    preferAccuracy: boolean;
    preferInternalFirst: boolean;
    preferLowCost: boolean;
    allowParallelExecution: boolean;
  };
  debug?: boolean;
}

export interface PkgRouterIntentEnvelope {
  id: string;
  rawInput: string;
  intentType: string;
  domain: string;
  entities: Array<{ type: string; value: string; confidence: number }>;
  constraints: Array<{ type: string; value: string; hard: boolean }>;
  requiresTools: boolean;
  suggestedTools: string[];
  citationRequired: boolean;
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
  urgency: string;
  outputFormat: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * Shape the Router package actually returns.
 */
export interface PkgRoutePlan {
  id: string;
  timestamp: string;
  intentId: string;
  status: string;
  primaryRoute: { id: string; selectedSpokes: string[]; executionMode: string; steps: PkgRouteStep[]; confidence: number; riskLevel: string; reasoning: string };
  secondaryRoutes: unknown[];
  selectedSpokes: string[];
  executionMode: string;
  steps: PkgRouteStep[];
  preconditions: unknown[];
  constraintsApplied: unknown[];
  citationRequired: boolean;
  clarificationRequired: boolean;
  clarificationQuestions: string[];
  fallbackPlan: Array<{ trigger: string; action: string; rerouteTo: string; note: string }>;
  riskLevel: string;
  confidence: number;
  reasoning: string;
  debug?: unknown;
}

export interface PkgRouteStep {
  stepId: string;
  spokeId: string;
  action: string;
  purpose: string;
  inputFrom: string;
  dependsOn: string[];
  optionality: string;
  timeoutMs: number;
  expectedOutput: string;
}

export function mapCoreInputToPkgRouterInput(input: RouterInput): PkgRouterInput {
  const coreIntent = input.intent;
  const rawEnvelope = coreIntent.raw as PkgIntentEnvelope | undefined;

  const intentEnvelope: PkgRouterIntentEnvelope = rawEnvelope
    ? {
        id: rawEnvelope.id,
        rawInput: rawEnvelope.rawText,
        intentType: rawEnvelope.intentType,
        domain: rawEnvelope.domain,
        entities: rawEnvelope.entities.map((e) => ({ type: e.type, value: e.value, confidence: 1 })),
        constraints: rawEnvelope.constraints.map((c) => ({ type: c.type, value: c.value, hard: true })),
        requiresTools: rawEnvelope.requiresTools,
        suggestedTools: rawEnvelope.suggestedTools,
        citationRequired: rawEnvelope.citationRequired,
        clarificationNeeded: rawEnvelope.clarificationNeeded,
        clarificationQuestions: rawEnvelope.clarificationQuestions,
        urgency: rawEnvelope.urgency,
        outputFormat: rawEnvelope.outputFormat,
        confidence: rawEnvelope.confidence,
      }
    : buildMinimalRouterIntent(coreIntent);

  return {
    intentEnvelope,
    availableSpokes: input.availableSpokes,
    systemState: {
      online: !input.offlineMode,
      availableTools: input.availableSpokes ?? [],
      featureFlags: {},
      workspacePolicies: {},
    },
    routingPreferences: {
      preferSpeed: input.preferences?.preferSpeed ?? false,
      preferAccuracy: input.preferences?.preferAccuracy ?? false,
      preferInternalFirst: input.preferences?.internalFirst ?? false,
      preferLowCost: input.preferences?.preferLowCost ?? false,
      allowParallelExecution: input.preferences?.allowParallel ?? false,
    },
  };
}

function buildMinimalRouterIntent(intent: IntentEnvelope): PkgRouterIntentEnvelope {
  const entities: Array<{ type: string; value: string; confidence: number }> = [];
  for (const [type, val] of Object.entries(intent.entities)) {
    if (Array.isArray(val)) {
      for (const v of val) entities.push({ type, value: String(v), confidence: 1 });
    } else {
      entities.push({ type, value: String(val), confidence: 1 });
    }
  }

  return {
    id: intent.intentId,
    rawInput: '',
    intentType: intent.action,
    domain: 'general',
    entities,
    constraints: [],
    requiresTools: false,
    suggestedTools: [],
    citationRequired: false,
    clarificationNeeded: false,
    clarificationQuestions: [],
    urgency: 'medium',
    outputFormat: 'text',
    confidence: intent.confidence,
  };
}

export function mapPkgRoutePlanToCore(pkg: PkgRoutePlan): RoutePlan {
  const spokes: SpokeAssignment[] = pkg.steps.map((step, idx) => ({
    spokeId: step.spokeId,
    priority: idx + 1,
    params: { stepId: step.stepId, action: step.action, purpose: step.purpose },
  }));

  return {
    routePlanId: pkg.id,
    strategy: pkg.executionMode,
    spokes,
    clarificationNeeded: pkg.clarificationRequired,
    clarificationPrompt: pkg.clarificationQuestions.length > 0 ? pkg.clarificationQuestions.join('\n') : undefined,
    raw: pkg,
  };
}
