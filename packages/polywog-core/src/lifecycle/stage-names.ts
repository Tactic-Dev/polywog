import type { StageName } from '../types/hooks.js';

export const STAGE_ORDER: readonly StageName[] = [
  'interpreter',
  'router',
  'weave',
  'executor',
  'format',
] as const;

export const LEDGER_EVENTS = {
  REQUEST_RECEIVED: 'request_received',
  INTENT_INTERPRETED: 'intent_interpreted',
  ROUTE_PLANNED: 'route_planned',
  ROUTE_DEGRADED: 'route_degraded',
  CLARIFICATION_REQUIRED: 'clarification_required',
  CONTEXT_ASSEMBLED: 'context_assembled',
  EXECUTION_COMPLETED: 'execution_completed',
  RESPONSE_FORMATTED: 'response_formatted',
  PIPELINE_FAILED: 'pipeline_failed',
} as const;
