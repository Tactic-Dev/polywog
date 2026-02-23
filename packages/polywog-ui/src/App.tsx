import { useState } from 'react'
import { usePolywog } from './hooks/usePolywog'
import { ChatPanel } from './components/ChatPanel'
import { PipelinePanel } from './components/PipelinePanel'

function App() {
  const { messages, loading, pipeline, metrics, trace, warnings, errors, sendMessage } =
    usePolywog()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="h-screen flex bg-[#0a0a0f]">
      {sidebarOpen && (
        <aside className="w-[280px] shrink-0 hidden md:block">
          <PipelinePanel
            pipeline={pipeline}
            metrics={metrics}
            trace={trace}
            warnings={warnings}
            errors={errors}
          />
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-[#0c0c14] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer hidden md:block"
              title="Toggle sidebar"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <MobileSidebarButton onClick={() => setSidebarOpen(o => !o)} />
            <span className="text-xs text-zinc-500 font-medium">Chat</span>
          </div>
          {metrics && (
            <span className="text-[10px] font-mono text-zinc-600">
              Last: {metrics.totalDurationMs < 1000
                ? `${Math.round(metrics.totalDurationMs)}ms`
                : `${(metrics.totalDurationMs / 1000).toFixed(2)}s`}
            </span>
          )}
        </header>

        <div className="flex-1 min-h-0">
          <ChatPanel messages={messages} loading={loading} onSend={sendMessage} />
        </div>
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-[280px] h-full">
            <PipelinePanel
              pipeline={pipeline}
              metrics={metrics}
              trace={trace}
              warnings={warnings}
              errors={errors}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

function MobileSidebarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer md:hidden"
      title="Toggle sidebar"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    </button>
  )
}

export default App
