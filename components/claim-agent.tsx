'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Check, ChevronDown, Copy, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type NodeId = 'extract_facts' | 'rule_gate' | 'judge_extraordinary' | 'draft_letter' | 'respond'
type NodeStatus = 'idle' | 'active' | 'complete' | 'skipped'

type LogLine = { id: number; icon: string; text: string; color: string }

type ClaimResult = {
  eligible: boolean
  amount: number | null
  reasoning: string
  letter: string | null
}

type PendingOutcome = {
  gateBlocked: boolean | null
  gateReason: string | null
  amount: number | null
  extraordinary: boolean | null
  extraordinaryReason: string | null
  response: string | null
  letter: string | null
}

const PIPELINE: { id: NodeId; label: string; description: string }[] = [
  { id: 'extract_facts', label: 'extract_facts', description: 'Parses flight details from your message' },
  { id: 'rule_gate', label: 'rule_gate', description: 'Checks eligibility against EU261 rules' },
  { id: 'judge_extraordinary', label: 'judge_extraordinary', description: 'Judges if the cause was extraordinary' },
  { id: 'draft_letter', label: 'draft_letter', description: 'Drafts the compensation claim letter' },
  { id: 'respond', label: 'respond', description: 'Prepares the final verdict and summary' },
]

const CLAIM_API_URL = 'https://monfared.dev/api/claim/stream'

const idleStatus: Record<NodeId, NodeStatus> = Object.fromEntries(
  PIPELINE.map((n) => [n.id, 'idle']),
) as Record<NodeId, NodeStatus>

const emptyPending: PendingOutcome = {
  gateBlocked: null,
  gateReason: null,
  amount: null,
  extraordinary: null,
  extraordinaryReason: null,
  response: null,
  letter: null,
}

function PulsingDot() {
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3b82f6] opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-[#3b82f6]" />
    </span>
  )
}

function PipelineNode({ status, label, description }: { status: NodeStatus; label: string; description: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        status === 'idle' && 'border-[#2a2a2a] bg-[#1a1a1a]',
        status === 'active' && 'border-[#3b82f6] bg-[#1a1a1a] claim-node-active',
        status === 'complete' && 'border-[#2a2a2a] bg-[#1a1a1a]',
        status === 'skipped' && 'border-[#2a2a2a] bg-[#161616] opacity-50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('font-mono text-sm font-medium', status === 'skipped' ? 'text-muted-foreground' : 'text-foreground')}>
          {label}
        </span>
        {status === 'complete' && <Check className="size-3.5 shrink-0 text-[#86efac]" />}
        {status === 'active' && <span className="size-2 shrink-0 animate-pulse rounded-full bg-[#3b82f6]" />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function ClaimAgent() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [nodeStatus, setNodeStatus] = useState<Record<NodeId, NodeStatus>>(idleStatus)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [clarification, setClarification] = useState<string | null>(null)
  const [clarificationInput, setClarificationInput] = useState('')
  const [result, setResult] = useState<ClaimResult | null>(null)
  const [letterOpen, setLetterOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const logIdRef = useRef(0)
  const pendingRef = useRef<PendingOutcome>({ ...emptyPending })

  const hasStarted = logs.length > 0 || result !== null || clarification !== null

  function resetRun() {
    setNodeStatus({ ...idleStatus })
    setLogs([])
    setResult(null)
    setClarification(null)
    setLetterOpen(false)
    setThreadId(null)
    pendingRef.current = { ...emptyPending }
    logIdRef.current = 0
  }

  function pushLog(icon: string, text: string, color: string) {
    logIdRef.current += 1
    setLogs((prev) => [...prev, { id: logIdRef.current, icon, text, color }])
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  function markActive(id: NodeId) {
    setNodeStatus((prev) => (prev[id] === 'complete' ? prev : { ...prev, [id]: 'active' }))
  }

  function markComplete(id: NodeId) {
    setNodeStatus((prev) => ({ ...prev, [id]: 'complete' }))
  }

  function finalizePipeline() {
    setNodeStatus((prev) => {
      const next = { ...prev }
      for (const node of PIPELINE) {
        if (next[node.id] === 'idle') next[node.id] = 'skipped'
        if (next[node.id] === 'active') next[node.id] = 'complete'
      }
      return next
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEvent(event: any) {
    switch (event.type) {
      case 'thread': {
        setThreadId(event.thread_id ?? null)
        break
      }
      case 'gate_thinking': {
        markActive('rule_gate')
        pushLog('⚙️', String(event.detail ?? ''), '#a3a3a3')
        break
      }
      case 'judge_thinking': {
        markActive('judge_extraordinary')
        const detail: string = event.detail ?? ''
        const icon = detail.startsWith('searching') || detail.startsWith('found') ? '🔍' : detail.startsWith('verdict') ? '⚖️' : '💭'
        pushLog(icon, detail, '#a3a3a3')
        break
      }
      case 'route_decision': {
        const detail: string = event.detail ?? ''
        pushLog('→', detail, '#666666')
        const decision = detail.match(/->\s*(\w+)/)?.[1]
        if (decision && PIPELINE.some((n) => n.id === decision)) {
          markActive(decision as NodeId)
        }
        break
      }
      case 'node_complete': {
        const node = event.node as string
        if (PIPELINE.some((n) => n.id === node)) {
          markComplete(node as NodeId)
          pushLog('✓', `${node} complete`, '#86efac')
        }
        const output = event.output ?? {}
        if (node === 'rule_gate') {
          if (output.gate_result) {
            pendingRef.current.gateBlocked = output.gate_result.blocked ?? null
            pendingRef.current.gateReason = output.gate_result.reason ?? null
          }
          if (typeof output.amount === 'number') pendingRef.current.amount = output.amount
        } else if (node === 'judge_extraordinary') {
          pendingRef.current.extraordinary = output.extraordinary ?? null
          pendingRef.current.extraordinaryReason = output.extraordinary_reason ?? null
        } else if (node === 'respond') {
          pendingRef.current.response = output.response ?? null
          pendingRef.current.letter = output.final_letter ?? null
        }
        break
      }
      case 'interrupt': {
        setClarification(event.question ?? 'Can you provide more detail?')
        setRunning(false)
        break
      }
      case 'done': {
        finalizePipeline()
        const p = pendingRef.current
        const eligible = p.gateBlocked === false && p.extraordinary !== true
        setResult({
          eligible,
          amount: eligible ? p.amount : null,
          reasoning: p.response ?? p.gateReason ?? p.extraordinaryReason ?? '',
          letter: p.letter,
        })
        setRunning(false)
        break
      }
      default:
        break
    }
  }

  async function streamRequest(message: string, resumeThreadId: string | null) {
    setRunning(true)
    setClarification(null)
    markActive('extract_facts')

    try {
      const res = await fetch(CLAIM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, thread_id: resumeThreadId }),
      })
      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          const jsonStr = line.slice(5).trim()
          if (!jsonStr) continue
          try {
            handleEvent(JSON.parse(jsonStr))
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch {
      pushLog('⚠️', 'Connection error — please try again.', '#f87171')
      setRunning(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || running) return
    setOpen(true)
    resetRun()
    setInput('')
    streamRequest(trimmed, null)
  }

  function handleClarificationSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = clarificationInput.trim()
    if (!trimmed || running || !threadId) return
    setClarificationInput('')
    streamRequest(trimmed, threadId)
  }

  async function handleCopyLetter() {
    if (!result?.letter) return
    try {
      await navigator.clipboard.writeText(result.letter)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-4">
      <div ref={containerRef} className="rounded-2xl border border-[#222222] bg-[#111111] p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2.5">
            <PulsingDot />
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              EU261 Flight Claim Agent
            </span>
          </span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </button>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            open ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-2 pl-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your flight disruption..."
                disabled={running}
                className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={running || !input.trim()}
                aria-label="Submit"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>

            {hasStarted && (
              <div className="mt-4 grid gap-4 lg:grid-cols-[35%_1fr]">
                {/* Pipeline graph */}
                <div>
                  {PIPELINE.map((node, i) => (
                    <div key={node.id}>
                      <PipelineNode status={nodeStatus[node.id]} label={node.label} description={node.description} />
                      {i < PIPELINE.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="h-4 w-px bg-[#2a2a2a]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Log + result */}
                <div className="space-y-4">
                  <div
                    ref={logRef}
                    className="max-h-[300px] overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] p-3 font-mono text-sm leading-relaxed"
                  >
                    {logs.length === 0 ? (
                      <p className="text-muted-foreground">Waiting for pipeline events…</p>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="flex gap-2">
                          <span className="shrink-0">{log.icon}</span>
                          <span style={{ color: log.color }} className="break-words">
                            {log.text}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {clarification && (
                    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                      <p className="text-base text-foreground">{clarification}</p>
                      <form
                        onSubmit={handleClarificationSubmit}
                        className="mt-3 flex items-center gap-2 rounded-full border border-border bg-background px-2 py-2 pl-4"
                      >
                        <input
                          type="text"
                          value={clarificationInput}
                          onChange={(e) => setClarificationInput(e.target.value)}
                          placeholder="Your answer..."
                          disabled={running}
                          className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={running || !clarificationInput.trim()}
                          aria-label="Reply"
                          className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          <Send className="size-4" />
                        </button>
                      </form>
                    </div>
                  )}

                  {result && (
                    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium',
                          result.eligible ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400',
                        )}
                      >
                        {result.eligible ? 'Eligible' : 'Not eligible'}
                      </span>

                      {result.eligible && result.amount != null && (
                        <p className="mt-3 text-4xl font-semibold text-white">€{result.amount}</p>
                      )}

                      {result.reasoning && (
                        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{result.reasoning}</p>
                      )}

                      {result.letter && (
                        <div className="mt-4 border-t border-[#2a2a2a] pt-3">
                          <button
                            type="button"
                            onClick={() => setLetterOpen((v) => !v)}
                            className="flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity hover:opacity-75"
                          >
                            <ChevronDown className={cn('size-3.5 transition-transform duration-200', letterOpen && 'rotate-180')} />
                            View Claim Letter
                          </button>

                          <div
                            className={cn(
                              'grid transition-[grid-template-rows] duration-300 ease-in-out',
                              letterOpen ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]',
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] p-3">
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{result.letter}</p>
                                <button
                                  type="button"
                                  onClick={handleCopyLetter}
                                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                                  {copied ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
