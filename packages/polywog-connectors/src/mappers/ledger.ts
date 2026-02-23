import type { LedgerTrace, LedgerEvent } from '@polywog/core';

/**
 * Shapes the Ledger package expects/returns.
 */
export interface PkgStartTraceInput {
  rawText: string;
  userId?: string;
  workspaceId?: string;
  source?: string;
  tags?: string[];
  links?: { intentId?: string; routePlanId?: string; responseId?: string };
}

export interface PkgAppendEventInput {
  traceId: string;
  stage: string;
  type: string;
  status: string;
  message: string;
  data?: Record<string, unknown>;
  links?: { intentId?: string; routePlanId?: string; stepId?: string; artifactId?: string };
  durationMs?: number;
  debug?: Record<string, unknown>;
}

export interface PkgAttachArtifactInput {
  traceId: string;
  type: string;
  title: string;
  uri?: string;
  mimeType?: string;
  sourceStepId?: string;
  metadata?: Record<string, unknown>;
}

export interface PkgCompleteTraceInput {
  traceId: string;
  reasoning?: string;
  confidence?: number;
  riskLevel?: string;
  resultType?: string;
  note?: string;
}

export interface PkgFailTraceInput {
  traceId: string;
  error: { code: string; message: string; details?: Record<string, unknown> };
}

export interface PkgTraceRecord {
  traceId: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  request: { rawText: string; userId?: string; workspaceId?: string; source?: string };
  links: { intentId?: string; routePlanId?: string; responseId?: string };
  summary: { title: string; reasoning?: string; confidence?: number };
  metrics: { durationMs?: number; stepCount: number; eventCount: number; artifactCount: number };
  tags: string[];
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

const EVENT_STAGE_MAP: Record<string, string> = {
  request_received: 'system',
  intent_interpreted: 'interpreter',
  route_planned: 'router',
  route_degraded: 'router',
  clarification_required: 'router',
  context_assembled: 'system',
  execution_completed: 'executor',
  step_started: 'executor',
  step_completed: 'executor',
  step_failed: 'executor',
  fallback_applied: 'executor',
  response_formatted: 'formatter',
  system_note: 'system',
  pipeline_failed: 'system',
};

const EVENT_STATUS_MAP: Record<string, string> = {
  request_received: 'info',
  intent_interpreted: 'success',
  route_planned: 'success',
  route_degraded: 'warning',
  clarification_required: 'warning',
  context_assembled: 'success',
  execution_completed: 'success',
  step_started: 'info',
  step_completed: 'success',
  step_failed: 'error',
  fallback_applied: 'warning',
  response_formatted: 'success',
  system_note: 'info',
  pipeline_failed: 'error',
};

export function mapCoreMetadataToStartInput(
  metadata?: Record<string, unknown>,
  rawText?: string,
): PkgStartTraceInput {
  return {
    rawText: rawText ?? (metadata?.['message'] as string) ?? '',
    userId: metadata?.['userId'] as string | undefined,
    workspaceId: metadata?.['workspaceId'] as string | undefined,
    source: metadata?.['source'] as string | undefined,
  };
}

export function mapCoreEventToAppendInput(traceId: string, event: LedgerEvent): PkgAppendEventInput {
  return {
    traceId,
    stage: EVENT_STAGE_MAP[event.eventType] ?? 'system',
    type: event.eventType,
    status: EVENT_STATUS_MAP[event.eventType] ?? 'info',
    message: event.eventType.replace(/_/g, ' '),
    data: event.data,
  };
}

export function mapPkgTraceRecordToCoreLedgerTrace(record: PkgTraceRecord): LedgerTrace {
  const statusMap: Record<string, 'active' | 'completed' | 'failed'> = {
    started: 'active',
    in_progress: 'active',
    complete: 'completed',
    failed: 'failed',
    degraded: 'completed',
    blocked: 'failed',
  };

  return {
    traceId: record.traceId,
    status: statusMap[record.status] ?? 'active',
  };
}
