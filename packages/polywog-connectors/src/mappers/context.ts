import type { ContextBundle, ContextEntry, WeaveInput, IntentEnvelope, RoutePlan } from '@polywog/core';
import type { PkgIntentEnvelope } from './intent.js';
import type { PkgRoutePlan } from './route.js';

/**
 * Shape the Weave package expects as input.
 */
export interface PkgWeaveInput {
  traceId: string;
  intentEnvelope: PkgWeaveIntentEnvelope;
  routePlan: PkgWeaveRoutePlan;
  requestContext?: {
    conversationHistory?: Array<{ role: string; content: string; timestamp?: string }>;
    activeProject?: string;
    mode?: string;
    workspaceId?: string;
    userId?: string;
  };
  weavePreferences?: {
    internalFirst?: boolean;
    maxItems?: number;
    maxPerSource?: number;
    freshnessBias?: string;
    trustBias?: string;
    includeTraceMemory?: boolean;
    includeLongTermMemory?: boolean;
    includeSessionContext?: boolean;
  };
  debug?: boolean;
}

export interface PkgWeaveIntentEnvelope {
  intentId?: string;
  rawInput: string;
  primaryIntent: string;
  entities?: Record<string, string | string[]>;
  confidence?: number;
  clarificationRequired?: boolean;
  constraints?: Array<{ type: string; value: string; source?: string }>;
}

export interface PkgWeaveRoutePlan {
  routePlanId?: string;
  selectedSpokes?: string[];
  strategy?: string;
  retrievalRequired?: boolean;
  retrievalTypes?: string[];
  constraints?: Array<{ type: string; value: string; description?: string }>;
}

/**
 * Shape the Weave package actually returns.
 */
export interface PkgContextBundle {
  id: string;
  timestamp: string;
  traceId: string;
  intentId?: string;
  routePlanId?: string;
  status: string;
  summary: { shortText: string; coverage: string; notes: string[] };
  contextItems: PkgContextItem[];
  sourceMap: Array<{ sourceType: string; count: number; contributionNotes?: string }>;
  constraintsApplied: string[];
  warnings: string[];
  metrics: { totalItems: number; dedupedItems: number; sourceCount: number; assemblyDurationMs: number };
  confidence: number;
  debug?: unknown;
}

export interface PkgContextItem {
  contextItemId: string;
  category: string;
  sourceType: string;
  sourceId?: string;
  title?: string;
  content: string;
  contentType: string;
  relevanceScore: number;
  trustScore: number;
  freshnessScore?: number;
  citations?: string[];
  metadata?: Record<string, unknown>;
  tags: string[];
  tokenEstimate?: number;
  hash: string;
  rank: number;
}

export function mapCoreInputToPkgWeaveInput(input: WeaveInput, traceId: string): PkgWeaveInput {
  const rawIntent = input.intent.raw as PkgIntentEnvelope | undefined;
  const rawRoute = input.route.raw as PkgRoutePlan | undefined;

  const intentEnvelope: PkgWeaveIntentEnvelope = rawIntent
    ? {
        intentId: rawIntent.id,
        rawInput: rawIntent.rawText,
        primaryIntent: rawIntent.intentType,
        entities: collapseEntities(rawIntent.entities),
        confidence: rawIntent.confidence,
        clarificationRequired: rawIntent.clarificationNeeded,
        constraints: rawIntent.constraints.map((c) => ({ type: c.type, value: c.value })),
      }
    : {
        intentId: input.intent.intentId,
        rawInput: input.message,
        primaryIntent: input.intent.action,
        entities: input.intent.entities as Record<string, string | string[]>,
        confidence: input.intent.confidence,
      };

  const routePlan: PkgWeaveRoutePlan = rawRoute
    ? {
        routePlanId: rawRoute.id,
        selectedSpokes: rawRoute.selectedSpokes,
        strategy: rawRoute.executionMode,
        retrievalRequired: rawRoute.selectedSpokes.some((s: string) => ['rag', 'web_search', 'file_search'].includes(s)),
      }
    : {
        routePlanId: input.route.routePlanId,
        selectedSpokes: input.route.spokes.map((s) => s.spokeId),
        strategy: input.route.strategy,
      };

  return {
    traceId,
    intentEnvelope,
    routePlan,
    requestContext: {
      conversationHistory: input.conversationHistory,
      activeProject: input.systemContext?.activeProject,
      mode: input.systemContext?.mode,
    },
    debug: false,
  };
}

function collapseEntities(entities: Array<{ type: string; value: string }>): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const e of entities) {
    const existing = out[e.type];
    if (Array.isArray(existing)) {
      existing.push(e.value);
    } else if (existing !== undefined) {
      out[e.type] = [existing, e.value];
    } else {
      out[e.type] = e.value;
    }
  }
  return out;
}

export function mapPkgContextBundleToCore(pkg: PkgContextBundle): ContextBundle {
  const entries: ContextEntry[] = pkg.contextItems.map((item) => ({
    source: item.sourceType,
    content: item.content,
    relevance: item.relevanceScore,
    metadata: {
      contextItemId: item.contextItemId,
      category: item.category,
      title: item.title,
      trustScore: item.trustScore,
      tags: item.tags,
      ...item.metadata,
    },
  }));

  return {
    contextId: pkg.id,
    entries,
    constraints: pkg.constraintsApplied,
    sessionSummary: pkg.summary.shortText,
    raw: pkg,
  };
}
