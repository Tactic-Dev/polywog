import type { WeaveModule, WeaveInput, ContextBundle } from '@polywog/core';
import { mapCoreInputToPkgWeaveInput, mapPkgContextBundleToCore, type PkgContextBundle } from '../mappers/context.js';

/**
 * Loose contract for the real weave function.
 * Matches the `weave()` export from @polywog/weave without importing it.
 */
export type RealWeaveFn = (input: unknown, adapters?: unknown) => Promise<unknown>;

export interface WeaveAdapters {
  session?: unknown;
  memory?: unknown;
  retrieval?: unknown;
  trace?: unknown;
}

/**
 * Wraps the real `weave()` function to conform to Core's WeaveModule contract.
 *
 * - Function → object with `assemble()` method
 * - Maps input: `intent/route/message` → `intentEnvelope/routePlan/requestContext`
 * - Maps output: `id` → `contextId`, `contextItems` → `entries`
 * - Stores original output in `raw` for downstream adapters
 */
export class WeaveAdapter implements WeaveModule {
  private readonly realWeave: RealWeaveFn;
  private readonly adapters: WeaveAdapters;
  private traceId = '';

  constructor(weaveFn: RealWeaveFn, adapters: WeaveAdapters = {}) {
    this.realWeave = weaveFn;
    this.adapters = adapters;
  }

  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  async assemble(input: WeaveInput): Promise<ContextBundle> {
    const pkgInput = mapCoreInputToPkgWeaveInput(input, this.traceId);
    const result = await this.realWeave(pkgInput, this.adapters) as PkgContextBundle;
    return mapPkgContextBundleToCore(result);
  }
}
