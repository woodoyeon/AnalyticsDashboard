// apps/web/src/pages/Problem5.tsx
import { useEffect, useMemo, useRef, useState } from "react"
import type { ThHTMLAttributes, TdHTMLAttributes } from "react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts"

// shadcn/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

// icons
import {
  Activity, Play, Square, RotateCcw, Download, Globe, Gauge,
  CheckCircle2, XCircle, ArrowRight,
} from "lucide-react"

// router (sidebar 네비)
import { Link } from "react-router-dom"

/* =========================
 * Types
 * ========================= */
type RandomResp = { id: number; quote: string }
type CountRow  = { id: number; count: number; quote: string }
type ConnState = "idle" | "connecting" | "open" | "closed" | "error"

/* =========================
 * Constants
 * ========================= */
const API_BASE = import.meta.env.VITE_API_BASE ?? ""          // '' -> 같은 오리진의 /api
const DEFAULT_ENDPOINT =
  import.meta.env.VITE_P5_ENDPOINT || `${API_BASE}/api/p5/random`
const PRIMARY = "#003399"

/* =========================
 * Component
 * ========================= */
export default function Problem5() {
  /* ------- Controls (user-config) ------- */
  const [endpoint, setEndpoint]     = useState<string>(DEFAULT_ENDPOINT)
  const [totalCalls, setTotalCalls] = useState<number>(100)
  const [concurrency, setConcurrency] = useState<number>(10)
  const [delayMs, setDelayMs]       = useState<number>(0)
  const [accumulate, setAccumulate] = useState<boolean>(false)

  /* ------- Runtime states ------- */
  const [running, setRunning] = useState<boolean>(false)
  const [completed, setCompleted] = useState<number>(0)
  const [failed, setFailed] = useState<number>(0)
  const [preview, setPreview] = useState<RandomResp[]>([])
  const [counts, setCounts] = useState<Record<number, { count: number; quote: string }>>({})

  /* ------- Diagnostics ------- */
  const [connState, setConnState] = useState<ConnState>("idle")
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [helloOk, setHelloOk] = useState<boolean>(false)
  const [didDone, setDidDone] = useState<boolean>(false)
  const [progressMonotonic, setProgressMonotonic] = useState<boolean>(true)
  const lastCompletedRef = useRef<number>(0)
  const esRef = useRef<EventSource | null>(null)

  // 시작 깜빡임 추가
  const [shouldBlink, setShouldBlink] = useState<boolean>(true)


  /* ------- Derived values ------- */
  const percent = useMemo(() => (totalCalls ? Math.round((completed / totalCalls) * 100) : 0), [completed, totalCalls])

  const sortedCounts: CountRow[] = useMemo(() => {
    const rows = Object.entries(counts).map(([id, v]) => ({
      id: Number(id),
      count: v.count,
      quote: v.quote,
    }))
    return rows.sort((a, b) => b.count - a.count || a.id - b.id)
  }, [counts])

  const successSum = useMemo(() => sortedCounts.reduce((s, r) => s + r.count, 0), [sortedCounts])
  const chartData  = useMemo(() => sortedCounts.slice(0, 10).map(r => ({ name: `#${r.id}`, count: r.count })), [sortedCounts])

  // 무결성 체크: 완료 = 성공합 + 실패
  const sanityOk = completed === successSum + failed

  /* =========================
   * Helpers
   * ========================= */
  function closeStream() {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
  }

  function resetAll() {
    setRunning(false)
    setCompleted(0)
    setFailed(0)
    setPreview([])
    setCounts({})
    setConnState("idle")
    setLatencyMs(null)
    setHelloOk(false)
    setDidDone(false)
    setProgressMonotonic(true)
    lastCompletedRef.current = 0
    setShouldBlink(true)  
    closeStream()
  }

  function csvDownload() {
    const header = "id,count,quote\n"
    const body = sortedCounts
      .map(r => `${r.id},${r.count},"${(r.quote || "").replace(/"/g, '""')}"`)
      .join("\n")
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "problem5-results.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  /* =========================
   * Runner (SSE streaming)
   * ========================= */
  function start(opts?: { total?: number; concurrency?: number; delayMs?: number }) {
    if (!accumulate) {
      setCounts({})
      setPreview([])
      setCompleted(0)
      setFailed(0)
    }
    setShouldBlink(false)  
    setHelloOk(false)
    setDidDone(false)
    setProgressMonotonic(true)
    lastCompletedRef.current = 0

    const T = opts?.total ?? totalCalls
    const C = opts?.concurrency ?? concurrency
    const D = opts?.delayMs ?? delayMs

    const q = new URLSearchParams({
      total: String(T),
      concurrency: String(C),
      delayMs: String(D),
      endpoint,
    })

    const t0 = performance.now()
    setConnState("connecting")
    const es = new EventSource(`${API_BASE}/api/p5/stream-run?${q.toString()}`)
    esRef.current = es

    es.onopen = () => {
      setRunning(true)
      setConnState("open")
      setLatencyMs(Math.round(performance.now() - t0))
    }
    es.onerror = () => {
      setRunning(false)
      setConnState("error")
      closeStream()
    }

    es.addEventListener("hello", () => setHelloOk(true))

    es.addEventListener("tick", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data) as RandomResp
      setPreview(prev => [data, ...prev].slice(0, 20))
      setCounts(prev => {
        const next = { ...prev }
        const cur  = next[data.id] || { count: 0, quote: data.quote }
        next[data.id] = { count: cur.count + 1, quote: cur.quote || data.quote }
        return next
      })
    })

    es.addEventListener("progress", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data) as { completed: number; failed: number }
      if (data.completed < lastCompletedRef.current) setProgressMonotonic(false)
      lastCompletedRef.current = data.completed
      setCompleted(data.completed)
      setFailed(data.failed)
    })

    es.addEventListener("done", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data) as { rows: CountRow[]; totalCount: number; failed: number }
      setCounts(() => {
        const map: Record<number, { count: number; quote: string }> = {}
        data.rows.forEach(r => (map[r.id] = { count: r.count, quote: r.quote }))
        return map
      })
      // 완료 = 성공합 + 실패
      setCompleted(data.totalCount + data.failed)
      setFailed(data.failed)
      setDidDone(true)
      setRunning(false)
      setConnState("closed")
      closeStream()
    })
  }

  function stop() {
    closeStream()
    setRunning(false)
    setConnState("closed")
  }

  // Quick sample: 6회 / 동시성 3 / 지연 0
  function quickSelfTest() {
    if (running) return
    start({ total: 6, concurrency: Math.min(concurrency, 3), delayMs: 0 })
  }

  useEffect(() => () => stop(), [])

  /* =========================
   * UI
   * ========================= */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-5" style={{ color: PRIMARY }} />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Data Analytics</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* 시작/중단 + 리셋 + CSV */}
            {!running ? (
              <div className="relative">
                <Button
                  onClick={() => start()}
                  className={cn("gap-1", shouldBlink && "animate-pulse")}  // ← 깜빡임
                >
                  <Play className="size-4" /> 시작
                </Button>
                {shouldBlink && (
                  <span
                    className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping"
                    aria-hidden
                  />
                )}
              </div>
            ) : (
              <Button variant="destructive" onClick={stop} className="gap-1">
                <Square className="size-4" /> 중단
              </Button>
            )}

            <Button variant="outline" onClick={resetAll} className="gap-1">
              <RotateCcw className="size-4" /> 리셋
            </Button>
            <Button variant="outline" onClick={csvDownload} className="gap-1">
              <Download className="size-4" /> CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar + Main */}
      <div className="mx-auto max-w-screen-xl px-4 lg:px-5 py-5 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
        {/* Sidebar */}
        <aside className="rounded-xl overflow-hidden border bg-white lg:sticky lg:top-[56px] lg:h-[calc(100vh-56px)]">
          <div className="p-5 text-white" style={{ backgroundColor: PRIMARY }}>
            <div className="text-xl font-bold tracking-wide">우도연 데이터 랩</div>
          </div>
          <nav className="p-2 space-y-[2px] overflow-auto h-[calc(100%-76px)]">
            <SidebarLink to="/"   label="홈: 웹사이트 전체 레이아웃" />
            <SidebarLink to="/1"  label="문제 1: CSV 파일 분석" />
            <SidebarLink to="/2"  label="문제 2: Ping-Pong 프로그램" />
            <SidebarLink to="/3"  label="문제 3: DB 연결 및 쿼리 실행" />
            <SidebarLink to="/4"  label="문제 4: 기온·습도 차트" />
            <SidebarLink to="/5"  label="문제 5: 랜덤 응답 카운트" active />
            <SidebarLink to="/6"  label="문제 6: Top Laser 신호" />
            <SidebarLink to="/7"  label="문제 7: 가장 긴 유효 괄호" />
            <SidebarLink to="/8"  label="문제 8: 조세퍼스 순열" />
            <SidebarLink to="/finish" label="마무리: 디자인 요약" />
          </nav>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold" style={{ color: PRIMARY }}>
              문제 5: 랜덤 API 호출 · 빈도 집계 (SSE)
            </h2>

            {/* 문제 6로 이동 버튼 */}
            <Link to="/6" title="문제 6로 이동">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 gap-1 rounded-full border-slate-300 text-slate-600
                          hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors"
                style={{ ["--primary" as any]: PRIMARY }}
              >
                <span className="hidden sm:inline">문제 6</span>
                <ArrowRight className="size-5" />
              </Button>
            </Link>
          </div>

          {/* 1) Controls & Live Status */}
          <Card>
            <CardHeader>
              <CardTitle>컨트롤 & 상태</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Controls */}
              <section className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">엔드포인트</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-slate-500" />
                    <Input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder="/api/p5/random 또는 http://codingtest.brique.kr:8080/random"
                    />
                  </div>
                  <p className="text-[12px] text-slate-500">
                    기본값은 서버 프록시 <code className="px-1 rounded bg-slate-100">/api/p5/random</code> 입니다.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">총 호출 수</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-28"
                        value={totalCalls}
                        onChange={(e) => setTotalCalls(Math.max(1, Math.min(10000, Number(e.target.value) || 0)))}
                      />
                      <Gauge className="size-4 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-500">동시성 (1~50)</Label>
                    <Slider value={[concurrency]} min={1} max={50} step={1} onValueChange={(v) => setConcurrency(v[0] ?? 1)} />
                    <div className="text-xs text-slate-600">현재: {concurrency}</div>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs text-slate-500">호출 간 지연(ms)</Label>
                    <Slider value={[delayMs]} min={0} max={500} step={10} onValueChange={(v) => setDelayMs(v[0] ?? 0)} />
                    <div className="text-xs text-slate-600">현재: {delayMs} ms</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch checked={accumulate} onCheckedChange={(v) => setAccumulate(!!v)} id="acc" />
                  <Label htmlFor="acc">결과 누적 모드(이전 집계 유지)</Label>
                </div>

                <div className="flex gap-2 pt-1">
                  {!running ? (
                    <Button onClick={() => start()} className="gap-1">
                      <Play className="size-4" /> 시작
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={stop} className="gap-1">
                      <Square className="size-4" /> 중단
                    </Button>
                  )}
                  <Button variant="outline" onClick={resetAll} className="gap-1">
                    <RotateCcw className="size-4" /> 리셋
                  </Button>
                  <Button variant="outline" onClick={csvDownload} className="gap-1">
                    <Download className="size-4" /> CSV
                  </Button>
                </div>
              </section>

              {/* Live Status & Diagnostics */}
              <section className="space-y-4">
                {/* Progress bar */}
                <div>
                  <Label className="text-xs text-slate-500">진행률</Label>
                  <div className="mt-2 h-2 rounded bg-slate-200 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex justify-between text-[12px] text-slate-600 mt-1">
                    <span>완료: {completed} / {totalCalls}</span>
                    <span>실패: {failed}</span>
                  </div>
                </div>

                {/* Diagnostics */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500">자체 점검(6회 샘플)</Label>
                  <Button size="sm" variant="outline" onClick={quickSelfTest}>Quick Self-Test</Button>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <DiagItem
                    ok={connState === "open" || connState === "closed"}
                    label={`SSE 연결 상태: ${connState}`}
                    note={latencyMs != null ? `${latencyMs} ms 연결` : undefined}
                  />
                  <DiagItem ok={helloOk} label="hello 이벤트 수신" />
                  <DiagItem ok={progressMonotonic} label="진행 값 단조 증가" />
                  <DiagItem ok={sanityOk} label="무결성: 완료 = 성공합 + 실패" note={`완료 ${completed}, 성공합 ${successSum}, 실패 ${failed}`} />
                  <DiagItem ok={didDone} label="done 이벤트 수신(최종 집계 동기화)" />
                </div>
              </section>
            </CardContent>
          </Card>

          {/* 2) Preview */}
          <Card>
            <CardHeader><CardTitle>최근 응답 미리보기</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {preview.length === 0 && (
                <div className="text-sm text-slate-500">아직 응답이 없습니다. 시작을 눌러 주세요.</div>
              )}
              <div className="space-y-2 max-h-[540px] overflow-auto pr-1">
                {preview.map((r, idx) => (
                  <div key={`${r.id}-${idx}`} className="rounded border bg-white p-3">
                    <div className="text-xs text-slate-500">id: <b>#{r.id}</b></div>
                    <div className="mt-1 text-sm">{r.quote}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3) Aggregation */}
          <Card>
            <CardHeader><CardTitle>결과 집계 (빈도 상위)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 8, right: 8, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <Th className="w-16">rank</Th>
                      <Th className="w-20">id</Th>
                      <Th className="w-24 text-right">count</Th>
                      <Th>quote</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCounts.map((r, i) => (
                      <tr key={r.id} className="border-t">
                        <Td>{i + 1}</Td>
                        <Td>#{r.id}</Td>
                        <Td className="text-right font-medium">{r.count}</Td>
                        <Td className="truncate max-w-[240px]" title={r.quote}>{r.quote}</Td>
                      </tr>
                    ))}
                    <tr className={cn("border-t font-semibold", sanityOk ? "bg-slate-50" : "bg-rose-50")}>
                      <Td colSpan={2}>총합(성공)</Td>
                      <Td className="text-right">{successSum}</Td>
                      <Td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

/* =========================
 * Small utilities (table & badges)
 * ========================= */
type ThProps = ThHTMLAttributes<HTMLTableCellElement>
type TdProps = TdHTMLAttributes<HTMLTableCellElement>

function Th({ children, className, ...props }: ThProps) {
  return (
    <th className={cn("px-3 py-2 text-left text-sm font-semibold", className)} {...props}>
      {children}
    </th>
  )
}

function Td({ children, className, ...props }: TdProps) {
  return (
    <td className={cn("px-3 py-2 text-sm align-top", className)} {...props}>
      {children}
    </td>
  )
}

function DiagItem({ ok, label, note }: { ok: boolean; label: string; note?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-2 py-1.5",
        ok ? "border-emerald-300 bg-emerald-50/60" : "border-rose-300 bg-rose-50/60"
      )}
    >
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-rose-600" />}
        <span className="text-[13px]">{label}</span>
      </div>
      {note && <span className="text-[12px] text-slate-600">{note}</span>}
    </div>
  )
}

function SidebarLink({ to, label, active = false }: { to: string; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "block w-full px-3 py-2 rounded-md text-sm transition",
        active ? "bg-[#003399]/10 text-[#003399] font-medium" : "text-slate-700 hover:bg-slate-100"
      )}
      title={label}
    >
      {label}
    </Link>
  )
}
