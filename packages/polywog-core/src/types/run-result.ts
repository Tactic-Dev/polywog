import type { AxleResponse } from './modules.js';

export type StageStatus = 'success' | 'degraded' | 'failed' | 'skipped';

export interface TraceInfo {
  traceId: string;
  status: 'active' | 'completed' | 'failed';
  intentId?: string;
  routePlanId?: string;
  executionId?: string;
}

export interface PipelineStatus {
  intentStatus: StageStatus;
  routeStatus: StageStatus;
  weaveStatus: StageStatus;
  executionStatus: StageStatus;
  formatStatus: StageStatus;
}

export interface PipelineMetrics {
  totalDurationMs: number;
  interpreterMs: number;
  routerMs: number;
  weaveMs: number;
  executorMs: number;
  formatMs: number;
}

export interface DebugInfo {
  stageOutputs?: Record<string, unknown>;
  stageDurations?: Record<string, number>;
  fallbackNotes?: string[];
}

export interface PolywogRunResult {
  response: AxleResponse;
  trace: TraceInfo;
  pipeline: PipelineStatus;
  metrics: PipelineMetrics;
  warnings: string[];
  errors: string[];
  debug?: DebugInfo;
}
