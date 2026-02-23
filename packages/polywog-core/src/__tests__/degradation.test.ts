import { describe, it, expect } from 'vitest';
import { createPolywogCore } from '../factory.js';
import { createMockModules, createMockLedger, validInput } from './helpers.js';

describe('PolywogCore — graceful degradation', () => {
  it('interpreter failure returns fallback error response with failed status', async () => {
    const mods = createMockModules();
    mods.interpreter = {
      calls: [],
      async interpret(input) {
        mods.interpreter.calls.push(input);
        throw new Error('NLP service unavailable');
      },
    };

    const core = createPolywogCore({ modules: { ...mods } });
    const result = await core.run(validInput());

    expect(result.response.status).toBe('error');
    expect(result.response.content).toContain('Unable to understand');
    expect(result.pipeline.intentStatus).toBe('failed');
    expect(result.trace.status).toBe('failed');
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('NLP service unavailable')]),
    );

    expect(mods.router.calls).toHaveLength(0);
    expect(mods.weave.calls).toHaveLength(0);
    expect(mods.executor.calls).toHaveLength(0);
    expect(mods.format.calls).toHaveLength(0);
  });

  it('router failure uses fallback general route and pipeline continues', async () => {
    const mods = createMockModules();
    mods.router = {
      calls: [],
      async plan(input) {
        mods.router.calls.push(input);
        throw new Error('Router timeout');
      },
    };

    const core = createPolywogCore({ modules: { ...mods } });
    const result = await core.run(validInput());

    expect(result.pipeline.routeStatus).toBe('degraded');
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('router degraded')]),
    );

    expect(mods.weave.calls).toHaveLength(1);
    expect(mods.executor.calls).toHaveLength(1);
    expect(mods.format.calls).toHaveLength(1);
    expect(result.response.status).toBe('complete');
  });

  it('weave failure uses minimal context fallback and pipeline continues', async () => {
    const mods = createMockModules();
    mods.weave = {
      calls: [],
      async assemble(input) {
        mods.weave.calls.push(input);
        throw new Error('Context store down');
      },
    };

    const core = createPolywogCore({ modules: { ...mods } });
    const result = await core.run(validInput());

    expect(result.pipeline.weaveStatus).toBe('degraded');
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('weave degraded')]),
    );

    expect(mods.executor.calls).toHaveLength(1);
    expect(mods.format.calls).toHaveLength(1);
    expect(result.response.status).toBe('complete');
  });

  it('executor failure produces synthetic failed execution and pipeline continues', async () => {
    const mods = createMockModules();
    mods.executor = {
      calls: [],
      async execute(input) {
        mods.executor.calls.push(input);
        throw new Error('Spoke crashed');
      },
    };

    const core = createPolywogCore({ modules: { ...mods } });
    const result = await core.run(validInput());

    expect(result.pipeline.executionStatus).toBe('degraded');
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('executor degraded')]),
    );
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Spoke crashed')]),
    );

    expect(mods.format.calls).toHaveLength(1);
    expect(result.trace.status).toBe('failed');
  });

  it('format failure returns emergency minimal response', async () => {
    const mods = createMockModules();
    mods.format = {
      calls: [],
      async format(input) {
        mods.format.calls.push(input);
        throw new Error('Template engine broken');
      },
    };

    const core = createPolywogCore({ modules: { ...mods } });
    const result = await core.run(validInput());

    expect(result.pipeline.formatStatus).toBe('degraded');
    expect(result.response.status).toBe('error');
    expect(result.response.content).toContain('encountered a problem');
    expect(result.response.metadata).toEqual(expect.objectContaining({ emergency: true }));
  });

  it('ledger unavailable generates synthetic traceId and adds warning', async () => {
    const mods = createMockModules();
    const core = createPolywogCore({ modules: { ...mods } });

    const result = await core.run(validInput());

    expect(result.trace.traceId).toMatch(/^syn_trace_/);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('LEDGER_UNAVAILABLE')]),
    );

    expect(result.pipeline.intentStatus).toBe('success');
    expect(result.pipeline.routeStatus).toBe('success');
    expect(result.pipeline.weaveStatus).toBe('success');
    expect(result.pipeline.executionStatus).toBe('success');
    expect(result.pipeline.formatStatus).toBe('success');
    expect(result.response.status).toBe('complete');
  });
});
