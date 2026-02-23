import { useEffect, useRef } from 'react'
import type { Message } from '../types'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'

interface ChatPanelProps {
  messages: Message[]
  loading: boolean
  onSend: (message: string, debug?: boolean) => void
}

export function ChatPanel({ messages, loading, onSend }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, loading])

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-200 mb-2">Polywog Pipeline</h2>
              <p className="text-sm text-zinc-500 max-w-md">
                Send a message to run it through the full pipeline — Interpreter, Router, Weave,
                Executor, and Formatter.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="flex justify-start mb-4">
              <div className="rounded-2xl rounded-bl-md px-5 py-4 bg-[#14141f] border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"
                    style={{ animationDelay: '300ms' }}
                  />
                  <span className="text-xs text-zinc-500 ml-2">Running pipeline...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <InputBar onSend={onSend} disabled={loading} />
    </div>
  )
}
