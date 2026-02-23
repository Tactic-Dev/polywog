import type { ExecutorModule, ExecutorInput, ExecutionResult } from '@polywog/core';
import { mapCoreInputToPkgExecutorInput, mapPkgExecutionResultToCore, type PkgExecutionResult } from '../mappers/execution.js';

/**
 * Loose contract for the real execute function.
 * Matches the `execute()` export from @polywog/executor without importing it.
 */
export type RealExecuteFn = (input: unknown) => Promise<unknown>;

/**
 * Wraps the real `execute()` function to conform to Core's ExecutorModule contract.
 *
 * - Function → object with `execute()` method
 * - Maps input: `route/context/hooks` → `routePlan/contextBundle/ledgerHook`
 * - Maps hooks: Core's simple callbacks → package's event objects
 * - Maps output: `id` → `executionId`, extended status → 3-value status
 * - Stores original output in `raw` for downstream adapters
 */
export class ExecutorAdapter implements ExecutorModule {
  private readonly realExecute: RealExecuteFn;
  private readonly spokeRegistry: unknown;
  private traceId = '';

  constructor(executeFn: RealExecuteFn, spokeRegistry?: unknown) {
    this.realExecute = executeFn;
    this.spokeRegistry = spokeRegistry;
  }

  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  async execute(input: ExecutorInput): Promise<ExecutionResult> {
    const pkgInput = mapCoreInputToPkgExecutorInput(input, this.traceId);
    if (this.spokeRegistry) {
      (pkgInput as unknown as Record<string, unknown>).spokeRegistry = this.spokeRegistry;
    }
    const result = await this.realExecute(pkgInput) as PkgExecutionResult;
    return mapPkgExecutionResultToCore(result);
  }
}
