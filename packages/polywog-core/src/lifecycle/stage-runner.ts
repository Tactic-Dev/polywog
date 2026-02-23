import type { StageName } from '../types/hooks.js';
import type { LifecycleHooks } from '../types/hooks.js';
import type { Logger } from '../types/config.js';
import type { StageStatus } from '../types/run-result.js';
import { nowMs, elapsedMs } from '../utils/time.js';
import { toErrorMessage } from '../utils/errors.js';

export interface StageResult<T> {
  value: T;
  status: StageStatus;
  durationMs: number;
  error?: string;
  warning?: string;
}

interface StageRunnerOpts<T> {
  stageName: StageName;
  execute: () => Promise<T>;
  fallback: (err: unknown) => T;
  hooks?: LifecycleHooks;
  logger?: Logger;
  payload?: unknown;
  /** If true, do not invoke fallback — rethrow instead. */
  failFast?: boolean;
}

export async function runStage<T>(opts: StageRunnerOpts<T>): Promise<StageResult<T>> {
  const { stageName, execute, fallback, hooks, logger, payload, failFast } = opts;
  const start = nowMs();

  await safeHook(() => hooks?.beforeStage?.(stageName, payload));

  try {
    const value = await execute();
    const duration = elapsedMs(start);
    logger?.info(`[${stageName}] completed in ${duration}ms`);
    await safeHook(() => hooks?.afterStage?.(stageName, value));
    return { value, status: 'success', durationMs: duration };
  } catch (err) {
    const duration = elapsedMs(start);
    const errorMsg = toErrorMessage(err);
    logger?.error(`[${stageName}] failed: ${errorMsg}`);
    await safeHook(() => hooks?.onError?.(stageName, err));

    if (failFast) {
      return { value: fallback(err), status: 'failed', durationMs: duration, error: errorMsg };
    }

    const value = fallback(err);
    await safeHook(() => hooks?.afterStage?.(stageName, value));
    return { value, status: 'degraded', durationMs: duration, warning: `${stageName} degraded: ${errorMsg}` };
  }
}

async function safeHook(fn: () => void | Promise<void> | undefined): Promise<void> {
  try {
    await fn();
  } catch {
    /* hooks must never crash the pipeline */
  }
}
