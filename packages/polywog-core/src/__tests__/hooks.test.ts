import { describe, it, expect, vi } from 'vitest';
import { createPolywogCore } from '../factory.js';
import { createMockModules, validInput } from './helpers.js';
import type { LifecycleHooks, StageName } from '../types/hooks.js';

describe('PolywogCore — lifecycle hooks', () => {
  it('hooks fire in expected order: beforeRun, then beforeStage/afterStage per stage, then afterRun', async () => {
    const mods = createMockModules();
    const callLog: string[] = [];

    const hooks: LifecycleHooks = {
      beforeRun: vi.fn(async () => {
        callLog.push('beforeRun');
      }),
      afterRun: vi.fn(async () => {
        callLog.push('afterRun');
      }),
      beforeStage: vi.fn(async (stageName: StageName) => {
        callLog.push(`beforeStage:${stageName}`);
      }),
      afterStage: vi.fn(async (stageName: StageName) => {
        callLog.push(`afterStage:${stageName}`);
      }),
    };

    const core = createPolywogCore({ modules: { ...mods }, hooks });
    await core.run(validInput());

    expect(hooks.beforeRun).toHaveBeenCalledTimes(1);
    expect(hooks.afterRun).toHaveBeenCalledTimes(1);
    expect(hooks.beforeStage).toHaveBeenCalledTimes(5);
    expect(hooks.afterStage).toHaveBeenCalledTimes(5);

    expect(callLog[0]).toBe('beforeRun');

    const stages: StageName[] = ['interpreter', 'router', 'weave', 'executor', 'format'];
    for (const stage of stages) {
      const beforeIdx = callLog.indexOf(`beforeStage:${stage}`);
      const afterIdx = callLog.indexOf(`afterStage:${stage}`);
      expect(beforeIdx).toBeGreaterThan(-1);
      expect(afterIdx).toBeGreaterThan(-1);
      expect(beforeIdx).toBeLessThan(afterIdx);
    }

    const interpreterBefore = callLog.indexOf('beforeStage:interpreter');
    const routerBefore = callLog.indexOf('beforeStage:router');
    const weaveBefore = callLog.indexOf('beforeStage:weave');
    const executorBefore = callLog.indexOf('beforeStage:executor');
    const formatBefore = callLog.indexOf('beforeStage:format');

    expect(interpreterBefore).toBeLessThan(routerBefore);
    expect(routerBefore).toBeLessThan(weaveBefore);
    expect(weaveBefore).toBeLessThan(executorBefore);
    expect(executorBefore).toBeLessThan(formatBefore);

    expect(callLog[callLog.length - 1]).toBe('afterRun');
  });

  it('hook exception does not crash the pipeline', async () => {
    const mods = createMockModules();

    const hooks: LifecycleHooks = {
      beforeRun: vi.fn(async () => {
        throw new Error('beforeRun hook exploded');
      }),
      beforeStage: vi.fn(async () => {
        throw new Error('beforeStage hook exploded');
      }),
      afterStage: vi.fn(async () => {
        throw new Error('afterStage hook exploded');
      }),
      afterRun: vi.fn(async () => {
        throw new Error('afterRun hook exploded');
      }),
    };

    const core = createPolywogCore({ modules: { ...mods }, hooks });
    const result = await core.run(validInput());

    expect(result.response.status).toBe('complete');
    expect(result.response.content).toBe('Here is your summary of the topic.');
    expect(result.pipeline.intentStatus).toBe('success');
    expect(result.pipeline.formatStatus).toBe('success');

    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('HOOK_ERROR')]),
    );

    expect(hooks.beforeRun).toHaveBeenCalledTimes(1);
    expect(hooks.afterRun).toHaveBeenCalledTimes(1);
  });
});
