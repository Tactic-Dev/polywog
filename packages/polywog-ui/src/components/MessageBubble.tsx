import { useState } from 'react'
import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
}

const STAGE_LABELS: Record<string, string> = {
  intentStatus: 'Interpreter',
  routeStatus: 'Router',
  weaveStatus: 'Weave',
  executionStatus: 'Executor',
  formatStatus: 'Formatter',
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'success'
      ? 'bg-emerald-400'
      : status === 'degraded'
        ? 'bg-amber-400'
        : status === 'failed'
          ? 'bg-red-400'
          : 'bg-zinc-500'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(false)
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-3 bg-indigo-600 text-white shadow-lg shadow-indigo-500/10">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <span className="block text-[10px] text-indigo-200/60 mt-1.5 text-right">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-[#14141f] border border-white/5 shadow-lg">
        <p className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
          {message.content}
        </p>

        <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          {message.metrics && (
            <span className="font-mono">{formatMs(message.metrics.totalDurationMs)}</span>
          )}
          {message.pipeline && (
            <span className="flex items-center gap-1">
              <StatusDot
                status={
                  Object.values(message.pipeline).every(s => s === 'success')
                    ? 'success'
                    : Object.values(message.pipeline).some(s => s === 'failed')
                      ? 'failed'
                      : 'degraded'
                }
              />
              <span className="capitalize">
                {Object.values(message.pipeline).every(s => s === 'success')
                  ? 'Success'
                  : Object.values(message.pipeline).some(s => s === 'failed')
                    ? 'Failed'
                    : 'Degraded'}
              </span>
            </span>
          )}
        </div>

        {(message.pipeline || message.debug) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            {expanded ? '▾ Hide details' : '▸ Show details'}
          </button>
        )}

        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            {message.pipeline && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Stages
                </span>
                {Object.entries(message.pipeline).map(([key, status]) => (
                  <div key={key} className="flex items-center gap-2 text-xs text-zinc-400">
                    <StatusDot status={status} />
                    <span>{STAGE_LABELS[key] ?? key}</span>
                    {message.metrics && (
                      <span className="ml-auto font-mono text-zinc-600">
                        {formatMs(
                          message.metrics[
                            (key.replace('Status', 'Ms').replace('intent', 'interpreter')
                              .replace('route', 'router')
                              .replace('execution', 'executor')
                              .replace('format', 'format')) as keyof typeof message.metrics
                          ] as number ?? 0,
                        )}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {message.trace && (
              <div className="text-[10px] text-zinc-500 space-y-0.5">
                <span className="uppercase tracking-wider font-semibold block">Trace</span>
                <span className="font-mono block">ID: {message.trace.traceId}</span>
                <span className="block">Status: {message.trace.status}</span>
              </div>
            )}

            {message.debug?.fallbackNotes && message.debug.fallbackNotes.length > 0 && (
              <div className="text-[10px] text-amber-400/80 space-y-0.5">
                <span className="uppercase tracking-wider font-semibold block">
                  Fallback Notes
                </span>
                {message.debug.fallbackNotes.map((note, i) => (
                  <span key={i} className="block">
                    • {note}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
