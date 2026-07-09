'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const STARTER_PROMPTS = [
  'Tell me about yourself',
  'What is AIME?',
  'What did you build at SMS Group?',
]

const CHAT_API_URL = 'https://monfared.dev/api/chat'

export function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const expanded = focused || messages.length > 0 || loading

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(question: string) {
    const trimmed = question.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <section className="mx-auto max-w-3xl lg:max-w-4xl px-4 sm:px-6 pb-4">
      <div className="rounded-2xl border border-border bg-[#1a1a1a] p-3 sm:p-4">
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div
              ref={scrollRef}
              className="max-h-[320px] space-y-3 overflow-y-auto px-1 pb-4 pt-1"
            >
              {messages.length === 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : (
                messages.map((message, i) => (
                  <div
                    key={i}
                    className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-xl px-3.5 py-2 text-[15px] leading-[1.6] text-foreground',
                        message.role === 'user' ? 'bg-[#2a2a2a]' : 'bg-[#1e1e1e]',
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-xl bg-[#1e1e1e] px-3.5 py-2.5">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-2 pl-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask me anything"
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </section>
  )
}
