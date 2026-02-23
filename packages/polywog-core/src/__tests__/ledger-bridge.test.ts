import { describe, it, expect } from 'vitest';
import { LedgerBridge } from '../bridges/ledger-bridge.js';
import { createExecutorLedgerHook } from '../bridges/executor-ledger-hook.js';
import { createMockLedger } from './helpers.js';
import type { LedgerModule, LedgerEvent, LedgerTrace } from '../types/modules.js';

describe('LedgerBridge — isolation tests', () => {
  it('appendEvent failure does not throw — records a warning instead', async () => {
    const failingLedger: LedgerModule = {
      async startTrace() {
        return { traceId: 'trace-fail', status: 'active' } satisfies LedgerTrace;
      },
      async appendEvent() {
        throw new Error('Append blew up');
      },
      async attachArtifact() {},
      async completeTrace() {},
      async failTrace() {},
    };

    const bridge = new LedgerBridge(failingLedger);
    await bridge.startTrace();

    await bridge.appendEvent('test_event', { key: 'value' });

    expect(bridge.warnings).toHaveLength(1);
    expect(bridge.warnings[0]).toContain('LEDGER_EVENT_FAILED');
    expect(bridge.warnings[0]).toContain('Append blew up');
  });

  it('completeTrace failure does not throw — records a warning instead', async () => {
    const failingLedger: LedgerModule = {
      async startTrace() {
        return { traceId: 'trace-fail-complete', status: 'active' } satisfies LedgerTrace;
      },
      async appendEvent() {},
      async attachArtifact() {},
      async completeTrace() {
        throw new Error('Complete exploded');
      },
      async failTrace() {},
    };

    const bridge = new LedgerBridge(failingLedger);
    await bridge.startTrace();

    await bridge.completeTrace();

    expect(bridge.warnings).toHaveLength(1);
    expect(bridge.warnings[0]).toContain('LEDGER_COMPLETE_FAILED');
    expect(bridge.warnings[0]).toContain('Complete exploded');
  });

  it('executor hook events map to Ledger events via createExecutorLedgerHook', async () => {
    const ledger = createMockLedger();
    const bridge = new LedgerBridge(ledger);
    await bridge.startTrace();

    const hooks = createExecutorLedgerHook(bridge);

    hooks.onStepStarted!('step-1', 'spoke-alpha');
    hooks.onStepCompleted!('step-1', 'spoke-alpha', { output: 42 });
    hooks.onStepFailed!('step-2', 'spoke-beta', new Error('boom'));
    hooks.onFallbackApplied!('step-2', 'spoke-beta', 'spoke-gamma');
    hooks.onExecutionNote!('retrying spoke-beta');

    await new Promise((r) => setTimeout(r, 50));

    const eventTypes = ledger.appendEventCalls.map((c) => c.event.eventType);
    expect(eventTypes).toContain('step_started');
    expect(eventTypes).toContain('step_completed');
    expect(eventTypes).toContain('step_failed');
    expect(eventTypes).toContain('fallback_applied');
    expect(eventTypes).toContain('system_note');

    const started = ledger.appendEventCalls.find((c) => c.event.eventType === 'step_started');
    expect(started!.event.data).toEqual(expect.objectContaining({ stepId: 'step-1', spokeId: 'spoke-alpha' }));

    const failed = ledger.appendEventCalls.find((c) => c.event.eventType === 'step_failed');
    expect(failed!.event.data).toEqual(expect.objectContaining({ stepId: 'step-2', error: 'boom' }));

    const fallback = ledger.appendEventCalls.find((c) => c.event.eventType === 'fallback_applied');
    expect(fallback!.event.data).toEqual(
      expect.objectContaining({ stepId: 'step-2', spokeId: 'spoke-beta', fallbackSpokeId: 'spoke-gamma' }),
    );
  });

  it('no-ledger mode generates synthetic trace and adds warning', async () => {
    const bridge = new LedgerBridge(undefined);
    const traceId = await bridge.startTrace();

    expect(traceId).toMatch(/^syn_trace_/);
    expect(bridge.hasLedger).toBe(false);
    expect(bridge.warnings).toHaveLength(1);
    expect(bridge.warnings[0]).toContain('LEDGER_UNAVAILABLE');

    await bridge.appendEvent('should_noop');
    await bridge.completeTrace();

    expect(bridge.warnings).toHaveLength(1);
  });
});
