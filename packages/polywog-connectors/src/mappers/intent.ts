import type { IntentEnvelope, InterpreterInput } from '@polywog/core';

/**
 * Shape the Interpreter package actually accepts.
 */
export interface PkgInterpreterInput {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  metadata?: { workspaceId?: string; userId?: string; source?: string; timestamp?: string };
  attachments?: Array<{ filename: string; type: string }>;
  systemContext?: { activeProject?: string; mode?: string; constraints?: string[] };
}

/**
 * Shape the Interpreter package actually returns.
 */
export interface PkgIntentEnvelope {
  id: string;
  timestamp: string;
  rawText: string;
  normalizedText: string;
  intentType: string;
  domain: string;
  subTasks: Array<{ intent: string; description: string }>;
  entities: Array<{ type: string; value: string; raw: string }>;
  constraints: Array<{ type: string; value: string; raw: string }>;
  urgency: string;
  confidence: number;
  requiresTools: boolean;
  suggestedTools: string[];
  outputFormat: string;
  citationRequired: boolean;
  safetyFlags: string[];
  routingHints: string[];
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
  debug?: unknown;
}

export function mapCoreInputToPkgInput(input: InterpreterInput): PkgInterpreterInput {
  return {
    message: input.message,
    conversationHistory: input.conversationHistory,
    attachments: input.attachments?.map((a: { filename: string; mimeType: string; size: number }) => ({
      filename: a.filename,
      type: a.mimeType,
    })),
    systemContext: input.systemContext,
  };
}

export function mapPkgOutputToCoreEnvelope(pkg: PkgIntentEnvelope): IntentEnvelope {
  const entities: Record<string, unknown> = {};
  for (const e of pkg.entities) {
    const key = e.type;
    const existing = entities[key];
    if (Array.isArray(existing)) {
      existing.push(e.value);
    } else if (existing !== undefined) {
      entities[key] = [existing, e.value];
    } else {
      entities[key] = e.value;
    }
  }

  return {
    intentId: pkg.id,
    action: pkg.intentType,
    entities,
    confidence: pkg.confidence,
    raw: pkg,
  };
}
