'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ChevronDown, RefreshCw } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

type RequestRow = {
  id: number | string
  ts: string
  query: string
  latency_embed_ms: number | null
  latency_retrieve_ms: number | null
  latency_generate_ms: number | null
  latency_total_ms: number | null
  best_score: number | null
  tokens_in: number | null
  tokens_out: number | null
}

type ChartRow = RequestRow & { index: number }

type DayTokens = {
  day: string
  tokens_in: number
  tokens_out: number
}

const COLORS = {
  embed: '#93c5fd',
  retrieve: '#3b82f6',
  generate: '#1d4ed8',
  confidence: '#93c5fd',
  tokensIn: '#1d4ed8',
  tokensOut: '#93c5fd',
  average: '#1d4ed8',
  grid: '#222222',
  axis: '#666666',
  axisText: '#a3a3a3',
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

function average(values: number[]) {
  if (!values.length) return undefined
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function truncate(text: string, max = 40) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function dayKey(d: Date) {
  return d.toDateString()
}

const axisTick = { fill: COLORS.axisText, fontSize: 12 }

function PulsingDot() {
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#86efac] opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-[#86efac]" />
    </span>
  )
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <p className="text-sm uppercase tracking-wide text-[#a3a3a3]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-[#a3a3a3]">{subtitle}</p>
    </div>
  )
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5 text-white/80">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-medium text-white">{value}</span>
    </div>
  )
}

function LatencyTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="max-w-[240px] rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2">
      <p className="mb-1.5 text-xs leading-snug text-white">{truncate(row.query)}</p>
      <div className="space-y-0.5">
        <TooltipRow color={COLORS.embed} label="Embed" value={`${Math.round(row.latency_embed_ms ?? 0)} ms`} />
        <TooltipRow color={COLORS.retrieve} label="Retrieve" value={`${Math.round(row.latency_retrieve_ms ?? 0)} ms`} />
        <TooltipRow color={COLORS.generate} label="Generate" value={`${Math.round(row.latency_generate_ms ?? 0)} ms`} />
      </div>
    </div>
  )
}

function ConfidenceTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="max-w-[240px] rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2">
      <p className="mb-1.5 text-xs leading-snug text-white">{truncate(row.query)}</p>
      <TooltipRow color={COLORS.confidence} label="Confidence" value={`${(row.best_score ?? 0).toFixed(1)}%`} />
    </div>
  )
}

function TokensDailyTooltip({ active, payload }: { active?: boolean; payload?: { payload: DayTokens }[] }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="max-w-[200px] rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2">
      <p className="mb-1.5 text-xs leading-snug text-white">{row.day}</p>
      <div className="space-y-0.5">
        <TooltipRow color={COLORS.tokensIn} label="Tokens in" value={row.tokens_in.toFixed(0)} />
        <TooltipRow color={COLORS.tokensOut} label="Tokens out" value={row.tokens_out.toFixed(0)} />
      </div>
    </div>
  )
}

export function MonitoringWidget({
  forceOpen = false,
  embedded = false,
}: { forceOpen?: boolean; embedded?: boolean } = {}) {
  const [open, setOpen] = useState(forceOpen)
  const [rows, setRows] = useState<ChartRow[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [last24hCount, setLast24hCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (forceOpen) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!open) return

    const id = setInterval(() => {
      loadData()
    }, 30_000)

    return () => clearInterval(id)
  }, [open])

  async function loadData() {
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    setLoading(true)
    setError(null)

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [totalRes, last24hRes, rowsRes] = await Promise.all([
      supabase.from('requests').select('*', { count: 'exact', head: true }),
      supabase.from('requests').select('*', { count: 'exact', head: true }).gte('ts', since24h),
      supabase
        .from('requests')
        .select(
          'id, ts, query, latency_embed_ms, latency_retrieve_ms, latency_generate_ms, latency_total_ms, best_score, tokens_in, tokens_out',
        )
        .order('ts', { ascending: false })
        .limit(50),
    ])

    if (rowsRes.error) {
      setError(rowsRes.error.message)
      setLoading(false)
      return
    }

    setTotalCount(totalRes.count ?? 0)
    setLast24hCount(last24hRes.count ?? 0)

    const chronological = (rowsRes.data ?? []).slice().reverse() as RequestRow[]
    setRows(chronological.map((row, i) => ({ ...row, index: i + 1 })))
    setLoading(false)
  }

  function refresh() {
    setFetched(true)
    loadData()
  }

  function handleToggle() {
    if (forceOpen) return
    setOpen((prev) => !prev)
    if (!fetched) refresh()
  }

  const allRows = rows ?? []
  const last20 = allRows.slice(-20)

  const avgConfidence = average(allRows.map((r) => r.best_score).filter((v): v is number => v != null))
  const avgLatency = average(allRows.map((r) => r.latency_total_ms).filter((v): v is number => v != null))
  const avgConfidenceLast20 = average(last20.map((r) => r.best_score).filter((v): v is number => v != null))

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const tokensByDay: DayTokens[] = last7Days.map((d) => {
    const key = dayKey(d)
    const dayRows = allRows.filter((r) => dayKey(new Date(r.ts)) === key)
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      tokens_in: average(dayRows.map((r) => r.tokens_in ?? 0)) ?? 0,
      tokens_out: average(dayRows.map((r) => r.tokens_out ?? 0)) ?? 0,
    }
  })

  const hasData = !!rows && rows.length > 0
  const showInitialLoading = loading && rows === null
  const showInitialError = !loading && error && rows === null
  const showEmpty = !loading && !error && rows && rows.length === 0

  return (
    <section className={embedded ? 'pb-4' : 'mx-auto max-w-[76.8rem] px-4 sm:px-6 pb-4'}>
      <div ref={containerRef} className="rounded-2xl border border-[#222222] bg-[#111111] p-3 sm:p-4">
        <div className="flex w-full items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className={cn('flex flex-1 items-center gap-2.5 text-left', forceOpen && 'cursor-default')}
          >
            <PulsingDot />
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Live Chat Metrics
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                refresh()
              }}
              aria-label="Refresh metrics"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            </button>
            {!forceOpen && (
              <button type="button" onClick={handleToggle} aria-label={open ? 'Collapse metrics' : 'Expand metrics'}>
                <ChevronDown
                  className={cn('size-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
                />
              </button>
            )}
          </div>
        </div>

        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            open ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            {showInitialLoading && <p className="py-16 text-center text-sm text-muted-foreground">Loading metrics…</p>}
            {showInitialError && <p className="py-16 text-center text-sm text-muted-foreground">{error}</p>}
            {showEmpty && (
              <p className="py-16 text-center text-sm text-muted-foreground">No requests logged yet.</p>
            )}

            {hasData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatCard
                    label="Total Queries"
                    value={totalCount.toLocaleString()}
                    subtitle={`${last24hCount.toLocaleString()} in last 24h`}
                  />
                  <StatCard
                    label="Avg Confidence"
                    value={avgConfidence != null ? `${avgConfidence.toFixed(1)}%` : '—'}
                    subtitle="across last 50 queries"
                  />
                  <StatCard
                    label="Avg Latency"
                    value={avgLatency != null ? `${Math.round(avgLatency)}ms` : '—'}
                    subtitle="across last 50 queries"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-3">
                    <p className="mb-2 text-sm uppercase tracking-wide text-[#a3a3a3]">Latency — last 20 queries</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={last20} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={COLORS.grid} vertical={false} />
                        <XAxis dataKey="index" stroke={COLORS.axis} tick={axisTick} tickLine={false} />
                        <YAxis stroke={COLORS.axis} tick={axisTick} tickLine={false} width={44} unit="ms" />
                        <Legend wrapperStyle={{ fontSize: 12, color: COLORS.axisText }} />
                        <Bar dataKey="latency_embed_ms" name="Embed" stackId="latency" fill={COLORS.embed} />
                        <Bar dataKey="latency_retrieve_ms" name="Retrieve" stackId="latency" fill={COLORS.retrieve} />
                        <Bar
                          dataKey="latency_generate_ms"
                          name="Generate"
                          stackId="latency"
                          fill={COLORS.generate}
                          radius={[2, 2, 0, 0]}
                        />
                        <Tooltip content={<LatencyTooltip />} cursor={{ fill: '#222222' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-3">
                    <p className="mb-2 text-sm uppercase tracking-wide text-[#a3a3a3]">Confidence — last 20 queries</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={last20} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={COLORS.grid} vertical={false} />
                        <XAxis dataKey="index" stroke={COLORS.axis} tick={axisTick} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke={COLORS.axis} tick={axisTick} tickLine={false} width={36} />
                        {avgConfidenceLast20 != null && (
                          <ReferenceLine y={avgConfidenceLast20} stroke={COLORS.average} strokeDasharray="4 4" />
                        )}
                        <Line
                          type="monotone"
                          dataKey="best_score"
                          name="Confidence"
                          stroke={COLORS.confidence}
                          strokeWidth={2}
                          dot={{ r: 2.5, fill: COLORS.confidence, strokeWidth: 0 }}
                          activeDot={{ r: 4 }}
                        />
                        <Tooltip content={<ConfidenceTooltip />} cursor={{ stroke: '#333333' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-3">
                  <p className="mb-2 text-sm uppercase tracking-wide text-[#a3a3a3]">
                    Daily avg tokens — last 7 days
                  </p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={tokensByDay} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={COLORS.grid} vertical={false} />
                      <XAxis dataKey="day" stroke={COLORS.axis} tick={axisTick} tickLine={false} />
                      <YAxis stroke={COLORS.axis} tick={axisTick} tickLine={false} width={44} />
                      <Legend wrapperStyle={{ fontSize: 12, color: COLORS.axisText }} />
                      <Bar dataKey="tokens_in" name="Tokens in" fill={COLORS.tokensIn} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="tokens_out" name="Tokens out" fill={COLORS.tokensOut} radius={[2, 2, 0, 0]} />
                      <Tooltip content={<TokensDailyTooltip />} cursor={{ fill: '#222222' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
