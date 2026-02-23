import { describe, it, expect } from 'vitest';
import { createPolywogCore } from '../factory.js';
import {
  createMockModules,
  createMockLedger,
  validInput,
  MOCK_INTENT,
  MOCK_ROUTE,
  MOCK_EXECUTION,
} from './helpers.js';

describe('PolywogCore — happy path & basic pipeline', () => {
  it('runs all six stages in order and returns a complete result', async () => {
    const mods = createMockModules();
    const ledger = createMockLedger();
    const core = createPolywogCore({ modules: { ...mods, ledger } });

    const result = await core.run(validInput());

    expect(mods.interpreter.calls).toHaveLength(1);
    expect(mods.router.calls).toHaveLength(1);
    expect(mods.weave.calls).toHaveLength(1);
    expect(mods.executor.calls).toHaveLength(1);
    expect(mods.format.calls).toHaveLength(1);

    expect(result.response.status).toBe('complete');
    expect(result.response.content).toBe('Here is your summary of the topic.');
    expect(result.response.contentType).toBe('text/markdown');

    expect(result.trace.status).toBe('completed');
    expect(result.trace.intentId).toBe(MOCK_INTENT.intentId);
    expect(result.trace.routePlanId).toBe(MOCK_ROUTE.routePlanId);
    expect(result.trace.executionId).toBe(MOCK_EXECUTION.executionId);

    expect(result.pipeline.intentStatus).toBe('success');
    expect(result.pipeline.routeStatus).toBe('success');
    expect(result.pipeline.weaveStatus).toBe('success');
    expect(result.pipeline.executionStatus).toBe('success');
    expect(result.pipeline.formatStatus).toBe('success');

    expect(result.errors).toHaveLength(0);
  });

  it('ledger startTrace succeeds and traceId propagates through the result', async () => {
    const mods = createMockModules();
    const ledger = createMockLedger();
    const core = createPolywogCore({ modules: { ...mods, ledger } });

    const result = await core.run(validInput());

    expect(ledger.startTraceCalls).toHaveLength(1);
    expect(result.trace.traceId).toBe('trace-mock-001');
    expect(ledger.completeTraceCalls).toContain('trace-mock-001');
  });

  it('records stage durations with all values >= 0 and a totalDurationMs', async () => {
    const mods = createMockModules();
    const core = createPolywogCore({ modules: { ...mods } });

    const result = await core.run(validInput());

    expect(result.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.interpreterMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.routerMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.weaveMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.executorMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.formatMs).toBeGreaterThanOrEqual(0);
  });

  it('debug mode includes sanitized stage outputs', async () => {
    const mods = createMockModules();
    const core = createPolywogCore({ modules: { ...mods } });

    const result = await core.run(validInput({ debug: true }));

    expect(result.debug).toBeDefined();
    expect(result.debug!.stageOutputs).toBeDefined();
    expect(result.debug!.stageOutputs!['interpreter']).toBeDefined();
    expect(result.debug!.stageOutputs!['router']).toBeDefined();
    expect(result.debug!.stageOutputs!['weave']).toBeDefined();
    expect(result.debug!.stageOutputs!['executor']).toBeDefined();
    expect(result.debug!.stageOutputs!['format']).toBeDefined();

    expect(result.debug!.stageDurations).toBeDefined();
    expect(typeof result.debug!.stageDurations!['interpreter']).toBe('number');
  });

  it('clarification-needed route propagates to final response status', async () => {
    const mods = createMockModules();
    const clarificationPrompt = 'Did you mean X or Y?';
    mods.router = {
      calls: [],
      async plan(input) {
        mods.router.calls.push(input);
        return {
          routePlanId: 'route-clarify',
          strategy: 'clarification',
          spokes: [],
          clarificationNeeded: true,
          clarificationPrompt,
        };
      },
    };

    const core = createPolywogCore({ modules: { ...mods } });
    const result = await core.run(validInput());

    expect(result.response.status).toBe('clarification_needed');
    expect(result.response.content).toBe(clarificationPrompt);
  });

  it('throws on invalid input — empty message', async () => {
    const mods = createMockModules();
    const core = createPolywogCore({ modules: { ...mods } });

    await expect(core.run(validInput({ message: '' }))).rejects.toThrow(
      /Invalid PolywogRunInput/,
    );
  });

  it('throws on invalid input — missing message', async () => {
    const mods = createMockModules();
    const core = createPolywogCore({ modules: { ...mods } });

    const bad = { debug: false } as any;
    await expect(core.run(bad)).rejects.toThrow(/Invalid PolywogRunInput/);
  });

  it('artifacts from formatted response are attached to Ledger', async () => {
    const mods = createMockModules();
    const ledger = createMockLedger();

    const artifact = { artifactId: 'art-1', type: 'chart', label: 'Revenue', content: { data: [1, 2, 3] } };
    mods.format = {
      calls: [],
      async format(input) {
        mods.format.calls.push(input);
        return {
          responseId: 'resp-art',
          content: 'With chart',
          contentType: 'text/markdown',
          status: 'complete',
          artifacts: [artifact],
        };
      },
    };

    const core = createPolywogCore({ modules: { ...mods, ledger } });
    const result = await core.run(validInput());

    expect(ledger.attachArtifactCalls).toHaveLength(1);
    expect(ledger.attachArtifactCalls[0].artifact).toEqual(artifact);
    expect(result.response.artifacts).toHaveLength(1);
  });
});
