import type { PipelineStatus, Metrics, TraceInfo } from '../types'

interface PipelinePanelProps {
  pipeline: PipelineStatus | null
  metrics: Metrics | null
  trace: TraceInfo | null
  warnings: string[]
  errors: string[]
}

const STAGES: { key: keyof PipelineStatus; metricsKey: keyof Metrics; label: string }[] = [
  { key: 'intentStatus', metricsKey: 'interpreterMs', label: 'Interpreter' },
  { key: 'routeStatus', metricsKey: 'routerMs', label: 'Router' },
  { key: 'weaveStatus', metricsKey: 'weaveMs', label: 'Weave' },
  { key: 'executionStatus', metricsKey: 'executorMs', label: 'Executor' },
  { key: 'formatStatus', metricsKey: 'formatMs', label: 'Formatter' },
]

function statusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-emerald-400'
    case 'degraded':
      return 'bg-amber-400'
    case 'failed':
      return 'bg-red-400'
    case 'skipped':
      return 'bg-zinc-600'
    default:
      return 'bg-zinc-600'
  }
}

function statusBorder(status: string): string {
  switch (status) {
    case 'success':
      return 'border-emerald-400/30'
    case 'degraded':
      return 'border-amber-400/30'
    case 'failed':
      return 'border-red-400/30'
    default:
      return 'border-zinc-700/50'
  }
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`
}

export function PipelinePanel({
  pipeline,
  metrics,
  trace,
  warnings,
  errors,
}: PipelinePanelProps) {
  return (
    <div className="h-full flex flex-col bg-[#0c0c14] border-r border-white/5">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-200 tracking-tight">Polywog</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5">
        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">
            Pipeline
          </h3>
          <div className="space-y-1">
            {STAGES.map((stage, i) => {
              const status = pipeline?.[stage.key] ?? 'pending'
              const duration = metrics?.[stage.metricsKey] as number | undefined
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusColor(status)} transition-colors`} />
                    {i < STAGES.length - 1 && (
                      <span className={`w-px h-5 ${pipeline ? 'bg-zinc-700' : 'bg-zinc-800'} transition-colors`} />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="text-xs text-zinc-300">{stage.label}</span>
                    {duration !== undefined && (
                      <span className="text-[10px] font-mono text-zinc-600">{formatMs(duration)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {metrics && (
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">
              Total
            </h3>
            <div className="rounded-lg bg-[#14141f] border border-white/5 px-3 py-2">
              <span className="text-lg font-mono font-semibold text-zinc-200">
                {formatMs(metrics.totalDurationMs)}
              </span>
            </div>
          </section>
        )}

        {trace && (
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">
              Trace
            </h3>
            <div className="rounded-lg bg-[#14141f] border border-white/5 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">ID</span>
                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[150px]">
                  {trace.traceId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">Status</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    trace.status === 'success'
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : trace.status === 'failed'
                        ? 'bg-red-400/10 text-red-400'
                        : 'bg-zinc-600/20 text-zinc-400'
                  }`}
                >
                  {trace.status}
                </span>
              </div>
            </div>
          </section>
        )}

        {warnings.length > 0 && (
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mb-2">
              Warnings
            </h3>
            <div className={`rounded-lg border ${statusBorder('degraded')} bg-amber-400/5 px-3 py-2 space-y-1`}>
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-300/80">
                  {w}
                </p>
              ))}
            </div>
          </section>
        )}

        {errors.length > 0 && (
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-red-500 font-semibold mb-2">
              Errors
            </h3>
            <div className={`rounded-lg border ${statusBorder('failed')} bg-red-400/5 px-3 py-2 space-y-1`}>
              {errors.map((e, i) => (
                <p key={i} className="text-[11px] text-red-300/80">
                  {e}
                </p>
              ))}
            </div>
          </section>
        )}

        {!pipeline && !trace && (
          <div className="text-center py-8">
            <p className="text-[11px] text-zinc-600">No pipeline data yet.</p>
            <p className="text-[10px] text-zinc-700 mt-1">Send a message to begin.</p>
          </div>
        )}
      </div>
    </div>
  )
}
