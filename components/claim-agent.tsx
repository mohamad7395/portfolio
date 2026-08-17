'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Check, ChevronDown, Copy, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type NodeId =
  | 'extract_facts'
  | 'confirm_facts'
  | 'rule_gate'
  | 'judge_extraordinary'
  | 'draft_letter'
  | 'respond'
  | 'ask_clarification'
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

const TRACKABLE_NODES: NodeId[] = [
  'extract_facts',
  'confirm_facts',
  'rule_gate',
  'judge_extraordinary',
  'draft_letter',
  'respond',
  'ask_clarification',
]

const CLAIM_API_URL = 'https://monfared.dev/api/claim/stream'


const idleStatus: Record<NodeId, NodeStatus> = Object.fromEntries(
  TRACKABLE_NODES.map((id) => [id, 'idle']),
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

function GraphBox({ status, label }: { status: NodeStatus; label: string }) {
  return (
    <div
      className={cn(
        'flex h-full items-center justify-center gap-1.5 rounded-lg border px-2 transition-colors',
        status === 'idle' && 'border-[#333333] bg-[#1a1a1a]',
        status === 'active' && 'border-[#3b82f6] bg-[#1a1a1a] claim-node-active',
        status === 'complete' && 'border-[#86efac] bg-[#1a1a1a]',
        status === 'skipped' && 'border-[#333333] bg-[#161616] opacity-50',
      )}
    >
      <span className={cn('truncate font-mono text-[12px]', status === 'skipped' ? 'text-muted-foreground' : 'text-white')}>
        {label}
      </span>
      {status === 'complete' && <Check className="size-3 shrink-0 text-[#86efac]" />}
      {status === 'active' && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-[#3b82f6]" />}
    </div>
  )
}

function RouterDiamond({ cx, cy }: { cx: number; cy: number }) {
  return (
    <rect
      x={cx - 7}
      y={cy - 7}
      width={14}
      height={14}
      rx={2}
      fill="#2a2a2a"
      stroke="#555555"
      strokeWidth={1}
      transform={`rotate(45 ${cx} ${cy})`}
    />
  )
}

function GraphArrow({ d }: { d: string }) {
  return <path d={d} fill="none" stroke="#444444" strokeWidth={1.25} markerEnd="url(#claim-arrowhead)" />
}

// Hand-tuned tree layout matching the LangGraph topology: extract_facts and
// router1 branch to ask_clarification / confirm_facts / an early "missing
// fields" respond, confirm_facts either loops back to extract_facts or
// re-enters router1 toward rule_gate, then router2/router3 gate on
// blocked/extraordinary before the flow reaches draft_letter -> respond -> END.
const BOX_W = 120
const LEFT_X = 0
const CENTER_X = 140
const RIGHT_X = 280
const CENTER_CX = CENTER_X + BOX_W / 2
const RIGHT_CX = RIGHT_X + BOX_W / 2

const GRAPH_VIEWBOX = '-6 0 412 480'

function PipelineGraph({ status }: { status: Record<NodeId, NodeStatus> }) {
  return (
    <svg viewBox={GRAPH_VIEWBOX} className="h-auto w-full" role="img" aria-label="Claim agent pipeline graph">
      <defs>
        <marker id="claim-arrowhead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill="#444444" />
        </marker>
      </defs>

      {/* extract_facts -> router1 */}
      <GraphArrow d={`M${CENTER_CX},48 L${CENTER_CX},65`} />
      {/* router1 -> confirm_facts (straight down) */}
      <GraphArrow d={`M${CENTER_CX},79 L${CENTER_CX},90`} />
      {/* router1 -> ask_clarification (left) */}
      <GraphArrow d={`M193,72 Q150,90 120,106`} />
      {/* router1 -> respond "fields missing" (right) */}
      <GraphArrow d={`M207,72 Q250,90 280,106`} />
      {/* router1 -> rule_gate, bulging around confirm_facts */}
      <GraphArrow d={`M204,79 C260,95 260,140 ${CENTER_CX},156`} />

      {/* ask_clarification loops back up to extract_facts */}
      <GraphArrow d={`M60,90 C60,55 140,55 140,48`} />
      {/* confirm_facts -> extract_facts (corrected) */}
      <GraphArrow d={`M140,105 C90,90 90,60 150,48`} />
      {/* confirm_facts -> router1 (confirmed) */}
      <GraphArrow d={`M230,90 Q225,80 207,76`} />

      {/* rule_gate -> router2 */}
      <GraphArrow d={`M${CENTER_CX},196 L${CENTER_CX},215`} />
      {/* router2 -> respond "blocked" (left) */}
      <GraphArrow d={`M193,222 Q150,240 120,256`} />
      {/* router2 -> judge_extraordinary (right) */}
      <GraphArrow d={`M207,222 Q250,240 280,260`} />

      {/* judge_extraordinary -> router3 */}
      <GraphArrow d={`M${RIGHT_CX},280 L${RIGHT_CX},299`} />
      {/* router3 -> respond "extraordinary" (left) */}
      <GraphArrow d={`M333,306 Q300,322 260,340`} />
      {/* router3 -> draft_letter (straight down) */}
      <GraphArrow d={`M${RIGHT_CX},313 L${RIGHT_CX},324`} />

      {/* draft_letter -> final respond */}
      <GraphArrow d={`M${RIGHT_CX},364 L${RIGHT_CX},390`} />
      {/* final respond -> END */}
      <GraphArrow d={`M${RIGHT_CX},430 L${RIGHT_CX},448`} />

      <RouterDiamond cx={CENTER_CX} cy={72} />
      <RouterDiamond cx={CENTER_CX} cy={222} />
      <RouterDiamond cx={RIGHT_CX} cy={306} />

      {/* extract_facts */}
      <foreignObject x={CENTER_X} y={8} width={BOX_W} height={40}>
        <GraphBox status={status.extract_facts} label="extract_facts" />
      </foreignObject>

      {/* router1 branches */}
      <foreignObject x={LEFT_X} y={90} width={BOX_W} height={32}>
        <GraphBox status={status.ask_clarification} label="ask_clarification" />
      </foreignObject>
      <foreignObject x={CENTER_X} y={90} width={BOX_W} height={40}>
        <GraphBox status={status.confirm_facts} label="confirm_facts" />
      </foreignObject>
      <foreignObject x={RIGHT_X} y={90} width={BOX_W} height={32}>
        <GraphBox status={status.respond} label="respond" />
      </foreignObject>

      <foreignObject x={CENTER_X} y={156} width={BOX_W} height={40}>
        <GraphBox status={status.rule_gate} label="rule_gate" />
      </foreignObject>

      {/* router2 branches */}
      <foreignObject x={LEFT_X} y={240} width={BOX_W} height={32}>
        <GraphBox status={status.respond} label="respond" />
      </foreignObject>
      <foreignObject x={RIGHT_X} y={240} width={BOX_W} height={40}>
        <GraphBox status={status.judge_extraordinary} label="judge_extraordinary" />
      </foreignObject>

      {/* router3 branches */}
      <foreignObject x={CENTER_X} y={324} width={BOX_W} height={32}>
        <GraphBox status={status.respond} label="respond" />
      </foreignObject>
      <foreignObject x={RIGHT_X} y={324} width={BOX_W} height={40}>
        <GraphBox status={status.draft_letter} label="draft_letter" />
      </foreignObject>

      {/* final respond */}
      <foreignObject x={RIGHT_X} y={390} width={BOX_W} height={40}>
        <GraphBox status={status.respond} label="respond" />
      </foreignObject>

      <text x={RIGHT_CX} y={464} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#666666">
        END
      </text>
    </svg>
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
  }

  function pushLog(icon: string, text: string, color: string) {
    setLogs((prev) => {
      const nextId = (prev.at(-1)?.id ?? 0) + 1
      return [...prev, { id: nextId, icon, text, color }]
    })
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
      for (const id of TRACKABLE_NODES) {
        if (next[id] === 'idle') next[id] = 'skipped'
        if (next[id] === 'active') next[id] = 'complete'
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
      case 'clarification_asked': {
        pushLog('❓', String(event.detail ?? ''), '#a3a3a3')
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
        if (decision && TRACKABLE_NODES.includes(decision as NodeId)) {
          markActive(decision as NodeId)
        }
        break
      }
      case 'node_complete': {
        const node = event.node as string
        if (TRACKABLE_NODES.includes(node as NodeId)) {
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
      case 'error': {
        pushLog('⚠️', event.message ? `Pipeline error: ${event.message}` : 'Pipeline error.', '#f87171')
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
    <section className="mx-auto max-w-[76.8rem] px-4 sm:px-6 pb-4">
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
            <div className="rounded-xl border border-[#2a2a2a] bg-[#161616] px-4 py-3">
              <h3 className="text-sm font-medium text-white">EU261 Flight Compensation Checker</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Describe your flight disruption in plain English. The agent extracts the facts, checks EU Regulation
                261/2004 deterministically, and — if eligible — drafts a compensation claim letter with legal
                citations. No guessing: if information is missing, it asks.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 rounded-full border border-border bg-background px-2 py-2 pl-4">
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
                <PipelineGraph status={nodeStatus} />

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
