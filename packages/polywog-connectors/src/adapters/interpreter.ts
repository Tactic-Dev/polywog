import type { InterpreterModule, InterpreterInput, IntentEnvelope } from '@polywog/core';
import { mapCoreInputToPkgInput, mapPkgOutputToCoreEnvelope, type PkgIntentEnvelope } from '../mappers/intent.js';

/**
 * Loose contract for what we accept as the real interpreter instance.
 * Matches `PolywogInterpreter` from @polywog/interpreter without importing it.
 */
export interface RealInterpreter {
  interpret(input: unknown, options?: unknown): unknown;
}

/**
 * Wraps a real PolywogInterpreter to conform to Core's InterpreterModule contract.
 *
 * - Sync → async
 * - Maps input shape (mimeType/size on attachments → type)
 * - Maps output shape (id → intentId, intentType → action, Entity[] → Record)
 * - Stores original output in `raw` for downstream adapters
 */
export class InterpreterAdapter implements InterpreterModule {
  private readonly real: RealInterpreter;

  constructor(interpreter: RealInterpreter) {
    this.real = interpreter;
  }

  async interpret(input: InterpreterInput): Promise<IntentEnvelope> {
    const pkgInput = mapCoreInputToPkgInput(input);
    const result = this.real.interpret(pkgInput) as PkgIntentEnvelope;
    return mapPkgOutputToCoreEnvelope(result);
  }
}
