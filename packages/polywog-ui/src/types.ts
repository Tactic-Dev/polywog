export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  pipeline?: PipelineStatus
  metrics?: Metrics
  trace?: TraceInfo
  debug?: DebugInfo
}

export interface PipelineStatus {
  intentStatus: StageStatus
  routeStatus: StageStatus
  weaveStatus: StageStatus
  executionStatus: StageStatus
  formatStatus: StageStatus
}

export type StageStatus = 'success' | 'degraded' | 'failed' | 'pending' | 'skipped'

export interface Metrics {
  totalDurationMs: number
  interpreterMs: number
  routerMs: number
  weaveMs: number
  executorMs: number
  formatMs: number
}

export interface TraceInfo {
  traceId: string
  status: string
  intentId?: string
  routePlanId?: string
  executionId?: string
}

export interface DebugInfo {
  stageOutputs?: Record<string, unknown>
  stageDurations?: Record<string, number>
  fallbackNotes?: string[]
}

export interface PolywogRunResult {
  response: {
    responseId: string
    content: string
    contentType: string
    status: string
    artifacts?: unknown[]
    metadata?: Record<string, unknown>
  }
  trace: TraceInfo
  pipeline: PipelineStatus
  metrics: Metrics
  warnings: string[]
  errors: string[]
  debug?: DebugInfo
}
