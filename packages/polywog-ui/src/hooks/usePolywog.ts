import { useState, useCallback } from 'react'
import type { Message, PipelineStatus, Metrics, TraceInfo, PolywogRunResult } from '../types'

interface UsePolywogReturn {
  messages: Message[]
  loading: boolean
  pipeline: PipelineStatus | null
  metrics: Metrics | null
  trace: TraceInfo | null
  warnings: string[]
  errors: string[]
  sendMessage: (message: string, debug?: boolean) => Promise<void>
}

let nextId = 1
function generateId(): string {
  return `msg-${Date.now()}-${nextId++}`
}

export function usePolywog(): UsePolywogReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [trace, setTrace] = useState<TraceInfo | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const sendMessage = useCallback(async (message: string, debug = false) => {
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    setErrors([])
    setWarnings([])

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          debug,
          preferences: { formatProfile: 'chat', includeDebug: debug },
        }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result: PolywogRunResult = await response.json()

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: result.response.content,
        timestamp: Date.now(),
        pipeline: result.pipeline,
        metrics: result.metrics,
        trace: result.trace,
        debug: result.debug,
      }

      setMessages(prev => [...prev, assistantMessage])
      setPipeline(result.pipeline)
      setMetrics(result.metrics)
      setTrace(result.trace)
      setWarnings(result.warnings ?? [])
      setErrors(result.errors ?? [])
    } catch (err) {
      const errorContent = err instanceof Error ? err.message : 'An unexpected error occurred'

      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${errorContent}`,
        timestamp: Date.now(),
      }

      setMessages(prev => [...prev, errorMessage])
      setErrors([errorContent])
    } finally {
      setLoading(false)
    }
  }, [])

  return { messages, loading, pipeline, metrics, trace, warnings, errors, sendMessage }
}
