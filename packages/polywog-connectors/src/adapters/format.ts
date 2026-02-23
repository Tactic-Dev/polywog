import type { FormatModule, FormatInput, AxleResponse } from '@polywog/core';
import { mapCoreInputToPkgFormatterInput, mapPkgAxleResponseToCore, type PkgAxleResponse } from '../mappers/response.js';

/**
 * Loose contract for what we accept as the real formatter instance.
 * Matches `PolywogFormatter` from @polywog/format without importing it.
 */
export interface RealFormatter {
  format(input: unknown): unknown;
}

/**
 * Wraps a real PolywogFormatter to conform to Core's FormatModule contract.
 *
 * - Sync → async
 * - Maps input: `intent/route/execution` → `intentEnvelope/routePlan/executionResult`
 * - Maps output: `id` → `responseId`, `answer.text` → `content`, status values
 * - Stores rich output in `metadata.raw` for access
 */
export class FormatAdapter implements FormatModule {
  private readonly real: RealFormatter;

  constructor(formatter: RealFormatter) {
    this.real = formatter;
  }

  async format(input: FormatInput): Promise<AxleResponse> {
    const pkgInput = mapCoreInputToPkgFormatterInput(input);
    const result = this.real.format(pkgInput) as PkgAxleResponse;
    return mapPkgAxleResponseToCore(result);
  }
}
