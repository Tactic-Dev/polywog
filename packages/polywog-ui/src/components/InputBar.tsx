import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'

interface InputBarProps {
  onSend: (message: string, debug?: boolean) => void
  disabled: boolean
}

export function InputBar({ onSend, disabled }: InputBarProps) {
  const [value, setValue] = useState('')
  const [debug, setDebug] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * 5
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
  }, [])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      adjustHeight()
    },
    [adjustHeight],
  )

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, debug)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend, debug])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className="border-t border-white/5 bg-[#0d0d14] p-4">
      <div className="flex items-end gap-3 max-w-3xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Send a message..."
            rows={1}
            className="w-full resize-none rounded-xl bg-[#14141f] border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all disabled:opacity-50"
            style={{ lineHeight: '24px' }}
          />
        </div>

        <div className="flex items-center gap-2 pb-0.5">
          <button
            onClick={() => setDebug(d => !d)}
            title="Toggle debug mode"
            className={`p-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              debug
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
            }`}
          >
            DBG
          </button>

          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {disabled ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
