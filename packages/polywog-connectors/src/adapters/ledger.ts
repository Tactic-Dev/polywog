import type { LedgerModule, LedgerTrace, LedgerEvent } from '@polywog/core';
import {
  mapCoreMetadataToStartInput,
  mapCoreEventToAppendInput,
  mapPkgTraceRecordToCoreLedgerTrace,
  type PkgTraceRecord,
} from '../mappers/ledger.js';

/**
 * Loose contract for what we accept as the real ledger instance.
 * Matches `PolywogLedger` from @polywog/ledger without importing it.
 */
export interface RealLedger {
  startTrace(input: unknown): Promise<unknown>;
  appendEvent(input: unknown): Promise<unknown>;
  attachArtifact(input: unknown): Promise<unknown>;
  completeTrace(input: unknown): Promise<unknown>;
  failTrace(input: unknown): Promise<unknown>;
}

/**
 * Wraps a real PolywogLedger to conform to Core's LedgerModule contract.
 *
 * - Maps separate args to single-object inputs
 * - Maps event types to stage/status values
 * - Maps TraceRecord → LedgerTrace returns
 */
export class LedgerAdapter implements LedgerModule {
  private readonly real: RealLedger;
  private rawText = '';

  constructor(ledger: RealLedger) {
    this.real = ledger;
  }

  setRawText(text: string): void {
    this.rawText = text;
  }

  async startTrace(metadata?: Record<string, unknown>): Promise<LedgerTrace> {
    const input = mapCoreMetadataToStartInput(metadata, this.rawText);
    const record = await this.real.startTrace(input) as PkgTraceRecord;
    return mapPkgTraceRecordToCoreLedgerTrace(record);
  }

  async appendEvent(traceId: string, event: LedgerEvent): Promise<void> {
    const input = mapCoreEventToAppendInput(traceId, event);
    await this.real.appendEvent(input);
  }

  async attachArtifact(
    traceId: string,
    artifact: { artifactId: string; type: string; content: unknown },
  ): Promise<void> {
    await this.real.attachArtifact({
      traceId,
      type: mapArtifactType(artifact.type),
      title: artifact.artifactId,
      metadata: { content: artifact.content },
    });
  }

  async completeTrace(traceId: string): Promise<void> {
    await this.real.completeTrace({ traceId });
  }

  async failTrace(traceId: string, reason?: string): Promise<void> {
    await this.real.failTrace({
      traceId,
      error: { code: 'PIPELINE_FAILURE', message: reason ?? 'Pipeline failed' },
    });
  }
}

function mapArtifactType(type: string): string {
  const typeMap: Record<string, string> = {
    text: 'document',
    json: 'json',
    image: 'image',
    code: 'code',
    email: 'email_draft',
    report: 'report',
    link: 'link',
  };
  return typeMap[type] ?? 'other';
}
