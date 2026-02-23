import type { ExecutorHooks } from '../types/modules.js';
import type { LedgerBridge } from './ledger-bridge.js';

/**
 * Creates an ExecutorHooks object that forwards step-level events into Ledger.
 * All callbacks are wrapped so that failures never crash execution.
 */
export function createExecutorLedgerHook(bridge: LedgerBridge): ExecutorHooks {
  const safe = (fn: () => Promise<void>): void => {
    fn().catch(() => {
      /* swallow — LedgerBridge already records warnings */
    });
  };

  return {
    onStepStarted(stepId: string, spokeId: string) {
      safe(() => bridge.appendEvent('step_started', { stepId, spokeId }));
    },

    onStepCompleted(stepId: string, spokeId: string, result: unknown) {
      safe(() => bridge.appendEvent('step_completed', { stepId, spokeId, resultPreview: typeof result }));
    },

    onStepFailed(stepId: string, spokeId: string, error: unknown) {
      safe(() =>
        bridge.appendEvent('step_failed', {
          stepId,
          spokeId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    },

    onFallbackApplied(stepId: string, spokeId: string, fallbackSpokeId: string) {
      safe(() => bridge.appendEvent('fallback_applied', { stepId, spokeId, fallbackSpokeId }));
    },

    onExecutionNote(note: string) {
      safe(() => bridge.appendEvent('system_note', { note }));
    },
  };
}
