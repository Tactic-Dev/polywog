export const WarningCodes = {
  LEDGER_UNAVAILABLE: 'LEDGER_UNAVAILABLE',
  LEDGER_EVENT_FAILED: 'LEDGER_EVENT_FAILED',
  LEDGER_COMPLETE_FAILED: 'LEDGER_COMPLETE_FAILED',
  LEDGER_FAIL_TRACE_FAILED: 'LEDGER_FAIL_TRACE_FAILED',
  LEDGER_ARTIFACT_FAILED: 'LEDGER_ARTIFACT_FAILED',
  ROUTER_DEGRADED: 'ROUTER_DEGRADED',
  WEAVE_DEGRADED: 'WEAVE_DEGRADED',
  EXECUTOR_FAILED: 'EXECUTOR_FAILED',
  FORMAT_FAILED: 'FORMAT_FAILED',
  HOOK_ERROR: 'HOOK_ERROR',
} as const;

export type WarningCode = (typeof WarningCodes)[keyof typeof WarningCodes];

export function formatWarning(code: WarningCode, detail?: string): string {
  return detail ? `[${code}] ${detail}` : `[${code}]`;
}
