import type { LedgerModule, LedgerTrace, LedgerEvent, ResponseArtifact } from '../types/modules.js';
import type { Logger } from '../types/config.js';
import { WarningCodes, formatWarning } from '../types/warnings.js';
import { syntheticTraceId } from '../utils/ids.js';
import { isoNow } from '../utils/time.js';

/**
 * Centralises all Ledger interactions behind safe wrappers.
 * Every method silently degrades when Ledger is unavailable or throws.
 */
export class LedgerBridge {
  private readonly ledger: LedgerModule | undefined;
  private readonly logger: Logger | undefined;
  readonly warnings: string[] = [];
  private traceId: string | undefined;

  constructor(ledger: LedgerModule | undefined, logger?: Logger) {
    this.ledger = ledger;
    this.logger = logger;
  }

  get hasLedger(): boolean {
    return this.ledger !== undefined;
  }

  get currentTraceId(): string {
    return this.traceId ?? syntheticTraceId();
  }

  async startTrace(metadata?: Record<string, unknown>): Promise<string> {
    if (!this.ledger) {
      this.traceId = syntheticTraceId();
      this.pushWarning(WarningCodes.LEDGER_UNAVAILABLE, 'Ledger not provided; using synthetic trace');
      return this.traceId;
    }

    try {
      const trace: LedgerTrace = await this.ledger.startTrace(metadata);
      this.traceId = trace.traceId;
      return this.traceId;
    } catch (err) {
      this.traceId = syntheticTraceId();
      this.pushWarning(WarningCodes.LEDGER_UNAVAILABLE, `startTrace failed: ${String(err)}`);
      return this.traceId;
    }
  }

  async appendEvent(eventType: string, data?: Record<string, unknown>): Promise<void> {
    if (!this.ledger || !this.traceId) return;

    const event: LedgerEvent = { eventType, timestamp: isoNow(), data };
    try {
      await this.ledger.appendEvent(this.traceId, event);
    } catch (err) {
      this.pushWarning(WarningCodes.LEDGER_EVENT_FAILED, `appendEvent(${eventType}) failed: ${String(err)}`);
    }
  }

  async attachArtifact(artifact: ResponseArtifact): Promise<void> {
    if (!this.ledger || !this.traceId) return;

    try {
      await this.ledger.attachArtifact(this.traceId, artifact);
    } catch (err) {
      this.pushWarning(WarningCodes.LEDGER_ARTIFACT_FAILED, `attachArtifact failed: ${String(err)}`);
    }
  }

  async completeTrace(): Promise<void> {
    if (!this.ledger || !this.traceId) return;

    try {
      await this.ledger.completeTrace(this.traceId);
    } catch (err) {
      this.pushWarning(WarningCodes.LEDGER_COMPLETE_FAILED, `completeTrace failed: ${String(err)}`);
    }
  }

  async failTrace(reason?: string): Promise<void> {
    if (!this.ledger || !this.traceId) return;

    try {
      await this.ledger.failTrace(this.traceId, reason);
    } catch (err) {
      this.pushWarning(WarningCodes.LEDGER_FAIL_TRACE_FAILED, `failTrace failed: ${String(err)}`);
    }
  }

  private pushWarning(code: (typeof WarningCodes)[keyof typeof WarningCodes], detail: string): void {
    const msg = formatWarning(code, detail);
    this.warnings.push(msg);
    this.logger?.warn(msg);
  }
}
