import { useEffect, useMemo, useRef, useState } from "react"
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts"

// shadcn/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// 채팅 제어
import ChatPanel from "@/components/ChatPanel"
import { registerAction } from "@/lib/chatControl"

// 기타
import { Activity, Upload, RotateCcw, Database, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"

type RowStat = {
  line: number
  cnt: number
  min: number
  max: number
  sum: number
  mean: number
  std: number
  median: number
}
type ParseState = "idle" | "parsing" | "done" | "error"
type Mode = "local" | "server"

// ===== 설정 =====
const PREVIEW_LIMIT = 20
const MAX_CHART_POINTS = 900
const PRIMARY = "#003399"
const API_BASE = "/api"

export default function Problem1() {
  // ---------- 상태 ----------
  const [fileName, setFileName] = useState<string>("")
  const [status, setStatus] = useState<ParseState>("idle")
  const [progress, setProgress] = useState(0)
  // ✅ 기본 모드를 서버(SSE)로
  const [mode, setMode] = useState<Mode>("server")

  const [totalLines, setTotalLines] = useState(0)
  const [okLines, setOkLines] = useState(0)
  const [errLines, setErrLines] = useState(0)

  const [preview, setPreview] = useState<RowStat[]>([])
  const [errors, setErrors] = useState<{ line: number; raw: string; badTokens: string[] }[]>([])
  const [badTokenTop, setBadTokenTop] = useState<Array<{ token: string; count: number }>>([])

  // 차트 집계(원본은 ref로 보관)
  const meansRef = useRef<number[]>([])
  const sumsRef = useRef<number[]>([])
  const okVsErrRef = useRef<{ ok: number; err: number }>({ ok: 0, err: 0 })

  // 집계/중단 핸들
  const badTokenMapRef = useRef<Map<string, number>>(new Map())
  const abortRef = useRef<boolean>(false)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const evtSrcRef = useRef<EventSource | null>(null)

  // ⬇️ 채팅 명령에서 재실행을 위해 마지막 파일 기억
  const lastFileRef = useRef<File | null>(null)

  function ThinkingText({
  status, progress, mode,
}: { status: ParseState; progress: number; mode: Mode }) {
  // 진행 퍼센트에 따라 점 개수 변주 (… · .. · .)
  const dots = ".".repeat(((Math.floor(progress / 7) % 3) + 1));
  let phrase = "대기 중";
  if (status === "parsing") phrase = `Analytics Thinking${dots}`;
  if (status === "done")    phrase = "완료";
  if (status === "error")   phrase = "에러 감지";

  const sub =
    status === "parsing"
      ? (mode === "server" ? "SSE로 대용량을 병렬 계산 중" : "로컬 스트리밍 파싱 중")
      : (status === "done" ? "결과 집계 완료" : (status === "error" ? "입력/인코딩/구분자 확인 필요" : "파일 업로드를 시작하세요"));

  return (
    <div className="flex items-center justify-between text-[12px] text-slate-600">
      <span className="font-medium">
        {phrase}
        {status === "parsing" && <span className="ml-1 text-slate-400">({sub})</span>}
        {status !== "parsing" && <span className="ml-1 text-slate-400">{sub}</span>}
      </span>
      <span className="tabular-nums">{progress}%</span>
    </div>
  );
}

function ProgressFancy({
  progress, status, mode,
}: { progress: number; status: ParseState; mode: Mode }) {
  const width = `${Math.max(0, Math.min(100, progress))}%`;

  // 상태 컬러 토큰
  const barColor =
    status === "error" ? "#ef4444" :
    status === "done"  ? "#10b981" :
    "#003399"; // 진행 중 기본: PRIMARY

  return (
    <div className="space-y-2">
      {/* 트랙 */}
      <div className="relative h-3 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-200/60">
        {/* 채움바 */}
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width,
            background: `linear-gradient(90deg, ${barColor}, ${barColor})`,
            boxShadow: `0 0 20px ${barColor}55, inset 0 0 8px ${barColor}33`,
          }}
        />

        {/* 반짝이는 글로우(좌->우) */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 blur-md opacity-30"
          style={{
            transform: `translateX(calc(${width} - 100%))`,
            transition: "transform 300ms ease-out",
            background: "radial-gradient(60px 60px at 0% 50%, white, transparent)",
          }}
        />

        {/* 진행 헤드(칩 아이콘 느낌) */}
        <div
          className="pointer-events-none absolute -top-[6px] size-5 rounded-full ring-2 ring-white shadow-md"
          style={{
            left: `calc(${width} - 10px)`,
            background: barColor,
            boxShadow: `0 0 18px ${barColor}77`,
          }}
        />
      </div>

      {/* 텍스트 라인 */}
      <ThinkingText status={status} progress={progress} mode={mode} />

      {/* 보조 배지 */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 border">
          <span className="size-1.5 rounded-full"
                style={{ backgroundColor: status === "parsing" ? "#22c55e" : status === "error" ? "#ef4444" : "#94a3b8" }} />
          {status === "parsing" ? "작동 중" : status === "error" ? "오류" : "대기"}
        </span>
        <span className="px-1.5 py-0.5 rounded-md bg-slate-50 border">
          모드: <b className="ml-1">{mode === "server" ? "서버(SSE)" : "로컬"}</b>
        </span>
      </div>
    </div>
  );
}


  function resetAll() {
    abortRef.current = true
    try { readerRef.current?.cancel() } catch {}
    try { evtSrcRef.current?.close() } catch {}
    readerRef.current = null
    evtSrcRef.current = null

    setStatus("idle")
    setProgress(0)
    setTotalLines(0); setOkLines(0); setErrLines(0)
    setPreview([]); setErrors([]); setFileName("")
    meansRef.current = []; sumsRef.current = []
    okVsErrRef.current = { ok: 0, err: 0 }
    badTokenMapRef.current = new Map()
    setBadTokenTop([])
    abortRef.current = false
  }

  // ---------- 공통 유틸 ----------
  function detectDelimiter(sampleLines: string[]): "comma" | "semicolon" | "tab" | "space" {
    const score = { comma: 0, semicolon: 0, tab: 0, space: 0 }
    for (const l of sampleLines) {
      score.comma += (l.match(/,/g) || []).length
      score.semicolon += (l.match(/;/g) || []).length
      score.tab += (l.match(/\t/g) || []).length
      score.space += (l.match(/ +/g) || []).length * 0.25
    }
    const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] as any
    return best || "space"
  }
  function buildDelimRegex(kind: "comma" | "semicolon" | "tab" | "space") {
    switch (kind) {
      case "comma": return /,+/
      case "semicolon": return /;+/
      case "tab": return /\t+/
      default: return /[ ]+/
    }
  }
  function parseMaybeNumber(token: string, delimKind: "comma" | "semicolon" | "tab" | "space"): number | null {
    let t = token.trim()
    if (t === "") return null

    if (delimKind !== "comma") {
      if (/^\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, "").replace(",", ".")
      else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(t)) t = t.replace(/,/g, "")
      else if (/^\d+,\d+$/.test(t)) t = t.replace(",", ".")
    } else {
      if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, "")
    }
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  function downSample(arr: number[], target: number) {
    const clean = arr.filter((v) => Number.isFinite(v))
    if (clean.length <= target) return clean.slice()
    const step = clean.length / target
    const out: number[] = []
    for (let i = 0; i < target; i++) out.push(clean[Math.floor(i * step)])
    return out
  }
  function calcStats(nums: number[]) {
    const n = nums.length
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    const sum = nums.reduce((a, b) => a + b, 0)
    const mean = sum / n
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / n
    const std = Math.sqrt(variance)
    const sorted = [...nums].sort((a, b) => a - b)
    const mid = Math.floor(n / 2)
    const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    return { cnt: n, min, max, sum, mean, std, median }
  }

  // ---------- 로컬 초고속: 파일 스트리밍 파싱 ----------
  async function parseFileLocal(f: File) {
    resetAll()
    setStatus("parsing")
    setFileName(f.name)

    let encoding: "utf-8" | "utf-16le" | "utf-16be" = "utf-8"
    {
      const head = new Uint8Array(await f.slice(0, 4).arrayBuffer())
      const bom16LE = head[0] === 0xFF && head[1] === 0xFE
      const bom16BE = head[0] === 0xFE && head[1] === 0xFF
      if (bom16LE) encoding = "utf-16le"
      else if (bom16BE) encoding = "utf-16be"
    }

    const totalBytes = f.size
    const reader = f.stream().getReader()
    readerRef.current = reader
    const decoder = new TextDecoder(encoding)

    let carry = ""
    let bytesRead = 0

    let sampleLines: string[] = []
    let delimKind: "comma" | "semicolon" | "tab" | "space" = "comma"
    let delimRegex = /,+/

    let lineNo = 0
    let totalTmp = 0, okTmp = 0, errTmp = 0
    let previewBuf: RowStat[] = []
    let errorsBuf: typeof errors = []

    const flushUI = (final = false) => {
      if (previewBuf.length) {
        setPreview((prev) => (prev.length >= PREVIEW_LIMIT ? prev : [...prev, ...previewBuf].slice(0, PREVIEW_LIMIT)))
        previewBuf = []
      }
      if (errorsBuf.length) {
        setErrors((prev) => [...prev, ...errorsBuf])
        errorsBuf = []
      }
      setTotalLines(totalTmp)
      setOkLines(okTmp)
      setErrLines(errTmp)
      if (final || lineNo % 2000 === 0) {
        const top = [...badTokenMapRef.current.entries()]
          .sort((a, b) => b[1] - a[1]).slice(0, 30)
          .map(([token, count]) => ({ token, count }))
        setBadTokenTop(top)
      }
    }

    try {
      while (true) {
        if (abortRef.current) throw new Error("ABORTED")
        const { value, done } = await reader.read()
        if (done) break
        bytesRead += value!.byteLength
        setProgress(Math.min(99, Math.round((bytesRead / totalBytes) * 100)))

        const chunkText = decoder.decode(value!, { stream: true })
        const block = carry + chunkText
        const lines = block.split("\n")
        carry = lines.pop() ?? ""

        if (sampleLines.length < 200) {
          for (const ll of lines) {
            const t = ll.trim()
            if (t) sampleLines.push(t)
            if (sampleLines.length >= 200) break
          }
          if (sampleLines.length >= 10 && sampleLines.length <= 220) {
            delimKind = detectDelimiter(sampleLines.slice(0, 10))
            delimRegex = buildDelimRegex(delimKind)
          }
        }

        for (const rawLine of lines) {
          if (abortRef.current) throw new Error("ABORTED")
          lineNo++
          const trimmed = rawLine.trim()
          totalTmp++
          if (!trimmed) continue
          const parts = trimmed.split(delimRegex).map((s) => s.trim()).filter(Boolean)

          if (parts.length === 0) continue

          const nums: number[] = []
          const badTokens: string[] = []
          for (const p of parts) {
            const n = parseMaybeNumber(p, delimKind)
            if (n === null) badTokens.push(p)
            else nums.push(n)
          }

          if (badTokens.length > 0 || nums.length === 0) {
            errTmp++
            okVsErrRef.current.err++
            for (const t of badTokens) {
              const cur = badTokenMapRef.current.get(t) ?? 0
              badTokenMapRef.current.set(t, cur + 1)
            }
            if (errorsBuf.length < 200) errorsBuf.push({ line: lineNo, raw: rawLine, badTokens })
          } else {
            const st = calcStats(nums)
            okTmp++
            okVsErrRef.current.ok++
            meansRef.current.push(st.mean)
            sumsRef.current.push(st.sum)
            if (previewBuf.length < PREVIEW_LIMIT) {
              previewBuf.push({
                line: lineNo, cnt: st.cnt,
                min: +st.min.toFixed(6), max: +st.max.toFixed(6),
                sum: +st.sum.toFixed(6), mean: +st.mean.toFixed(6),
                std: +st.std.toFixed(6), median: +st.median.toFixed(6),
              })
            }
          }

          if (lineNo % 1000 === 0) {
            flushUI()
            await new Promise((r) => setTimeout(r, 0))
          }
        }
      }

      if (carry && !abortRef.current) {
        lineNo++; totalTmp++
        const parts = carry.split(delimRegex).map((s) => s.trim()).filter(Boolean)
        if (parts.length) {
          const nums: number[] = []
          const badTokens: string[] = []
          for (const p of parts) {
            const n = parseMaybeNumber(p, delimKind)
            if (n === null) badTokens.push(p)
            else nums.push(n)
          }
          if (badTokens.length > 0 || nums.length === 0) {
            errTmp++; okVsErrRef.current.err++
            for (const t of badTokens) {
              const cur = badTokenMapRef.current.get(t) ?? 0
              badTokenMapRef.current.set(t, cur + 1)
            }
            if (errorsBuf.length < 200) errorsBuf.push({ line: lineNo, raw: carry, badTokens })
          } else {
            const st = calcStats(nums)
            okTmp++; okVsErrRef.current.ok++
            meansRef.current.push(st.mean)
            sumsRef.current.push(st.sum)
            if (previewBuf.length < PREVIEW_LIMIT) {
              previewBuf.push({
                line: lineNo, cnt: st.cnt,
                min: +st.min.toFixed(6), max: +st.max.toFixed(6),
                sum: +st.sum.toFixed(6), mean: +st.mean.toFixed(6),
                std: +st.std.toFixed(6), median: +st.median.toFixed(6),
              })
            }
          }
        }
      }

      setProgress(100)
      flushUI(true)
      setStatus("done")
    } catch (e) {
      if ((e as any)?.message !== "ABORTED") setStatus("error")
    } finally {
      try { readerRef.current?.releaseLock() } catch {}
      readerRef.current = null
    }
  }

  // ---------- 서버 초고속: SSE ----------
  async function parseFileServer(f: File) {
    resetAll()
    setStatus("parsing")
    setFileName(f.name)

    const text = await f.text()
    const sample = text.replace(/\r/g, "").split("\n").filter(Boolean).slice(0, 10)
    const kind = detectDelimiter(sample)
    const delimiter = kind === "comma" ? "," : kind === "semicolon" ? ";" : kind === "tab" ? "\t" : " "
    const round = 2
    const ignoreEmpty = true

    const r1 = await fetch(`${API_BASE}/p1/compute-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, delimiter, round, ignoreEmpty })
    })
    if (!r1.ok) { setStatus("error"); return }
    const { jobId } = await r1.json()

    const url = `${API_BASE}/p1/compute-stream?job=${encodeURIComponent(jobId)}`
    const es = new EventSource(url)
    evtSrcRef.current = es

    let okTmp = 0, errTmp = 0

    es.addEventListener("hello", (ev: any) => {
      const data = JSON.parse(ev.data)
      setTotalLines(data.lines ?? 0)
      setProgress(5)
    })
    es.addEventListener("tick", (ev: any) => {
      const data = JSON.parse(ev.data)
      if (data.ok) {
        okTmp++; okVsErrRef.current.ok++
        const row = data.row as RowStat
        meansRef.current.push(row.mean)
        sumsRef.current.push(row.sum)
        setPreview((prev) => prev.length < PREVIEW_LIMIT ? [...prev, row] : prev)
      } else {
        errTmp++; okVsErrRef.current.err++
        setErrors((prev) => prev.length < 200 ? [...prev, { line: data.line, raw: data.raw, badTokens: [] }] : prev)
      }
      setOkLines(okTmp); setErrLines(errTmp)
    })
    es.addEventListener("progress", (ev: any) => {
      const data = JSON.parse(ev.data)
      const { processed = 0, totalLines = 1 } = data
      setProgress(Math.min(99, Math.round((processed / totalLines) * 100)))
    })
    es.addEventListener("done", (ev: any) => {
      const data = JSON.parse(ev.data)
      setProgress(100)
      setTotalLines(data.total)
      setOkLines(data.calculated)
      setErrLines(data.failed)

      if (Array.isArray(data.rows)) {
        for (const r of data.rows) {
          meansRef.current.push(r.mean)
          sumsRef.current.push(r.sum)
        }
        if (data.rows.length) setPreview(data.rows.slice(0, PREVIEW_LIMIT))
      }
      setStatus("done")
      es.close()
      evtSrcRef.current = null
    })
    es.addEventListener("error", () => {
      setStatus("error")
      try { es.close() } catch {}
      evtSrcRef.current = null
    })
  }

  // ---------- 파생 데이터(그래프/표) ----------
  const okErrPie = useMemo(() => ([
    { name: "Valid", value: okVsErrRef.current.ok },
    { name: "Error", value: okVsErrRef.current.err },
  ]), [okLines, errLines])

  const lineSeries = useMemo(() => {
    const mean = downSample(meansRef.current, MAX_CHART_POINTS)
    const sum = downSample(sumsRef.current, MAX_CHART_POINTS)
    const len = Math.min(mean.length, sum.length)
    const arr = new Array(len).fill(0).map((_, i) => ({
      x: i + 1,
      mean: Number.isFinite(mean[i]) ? Number(mean[i].toFixed(4)) : null,
      sum: Number.isFinite(sum[i]) ? Number(sum[i].toFixed(4)) : null,
    }))
    return arr.filter((d) => d.mean !== null || d.sum !== null)
  }, [okLines])

  const hasLineData = lineSeries.length > 0
  const hasPieData = okErrPie[0].value + okErrPie[1].value > 0
  const disabled = status === "parsing"

  // ---------- 채팅 명령 등록 ----------
  useEffect(() => {
    // run: 마지막 파일로 재실행
    const offRun = registerAction("run", async () => {
      const f = lastFileRef.current
      if (!f) return
      if (mode === "local") await parseFileLocal(f)
      else await parseFileServer(f)
    })

    // upload: 파일 선택창 열기
    const offUpload = registerAction("upload", () => {
      document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
    })

    // reset: 전체 초기화
    const offReset = registerAction("reset", () => resetAll())

    // stop: 진행 중단
    const offStop = registerAction("stop", () => {
      abortRef.current = true
      try { readerRef.current?.cancel() } catch {}
      try { evtSrcRef.current?.close() } catch {}
    })

    // mode: 모드 변경 (mode local / mode server)
    const offMode = registerAction("mode", (arg?: string) => {
      const v = (arg || "").toLowerCase()
      if (v.includes("local")) setMode("local")
      else if (v.includes("server")) setMode("server")
    })

    return () => { offRun(); offUpload(); offReset(); offStop(); offMode() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])
  
  
  // ---------- UI ----------
  return (
     <div className="min-h-screen bg-slate-50">
    {/* ✨ 정답 타이틀 깜빡임 효과 */}
    <style>
      {`
        @keyframes bq-blink {
          0%, 100% { opacity: 1; text-shadow: 0 0 0 transparent; }
          50%      { opacity: 0.82; text-shadow: 0 0 10px rgba(0, 51, 153, 0.35); }
        }
        .bq-blink {
          animation: bq-blink 1.6s ease-in-out infinite;
          will-change: opacity, text-shadow;
        }
      `}
    </style>

    {/* 헤더 (56px 가정) */}
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
      <div className="mx-auto max-w-screen-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-5" style={{ color: PRIMARY }} />
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Data Analytics</h1>
        </div>

        {/* ✅ 서버버튼이 기본으로 (UI 토글 동일, 상태 연동) */}
        <div className="flex items-center gap-2">
          {/* 모드 토글 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">모드:</span>
            <Button
              variant={mode === "local" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("local")}
              disabled={status==="parsing"}
              style={mode==="local"?{backgroundColor:PRIMARY}:{}}>
              로컬(초고속)
            </Button>
            <Button
              variant={mode === "server" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("server")}
              disabled={status==="parsing"}
              style={mode==="server"?{backgroundColor:PRIMARY}:{}}>
              서버(SSE)
            </Button>
          </div>
          <Button variant="outline" onClick={resetAll} disabled={status==="parsing"} className="gap-1">
            <RotateCcw className="size-4" /> 초기화
          </Button>
        </div>
      </div>
    </header>

    {/* 2컬럼(좌 사이드바 / 우 본문) */}
    <div className="mx-auto max-w-screen-xl px-4 lg:px-5 py-5 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
      {/* Sidebar */}
      <aside className="rounded-xl overflow-hidden border bg-white lg:sticky lg:top-[56px] lg:h-[calc(100vh-56px)]">
        <div className="p-5 text-white" style={{ backgroundColor: PRIMARY }}>
          <div className="text-xl font-bold tracking-wide">우도연 데이터 랩</div>
        </div>
        <nav className="p-2 space-y-[2px] overflow-auto h-[calc(100%-76px)]">
          <SidebarLink to="/" label="홈: 웹사이트 전체 레이아웃" />
          <SidebarLink to="/1" label="문제 1: CSV 파일 분석" active />
          <SidebarLink to="/2" label="문제 2: Ping-Pong 클라이언트-서버 프로그램" />
          <SidebarLink to="/3" label="문제 3: DB 연결 및 쿼리 실행" />
          <SidebarLink to="/4" label="문제 4: 기온과 습도 차트 구현 예시" />
          <SidebarLink to="/5" label="문제 5: 랜덤 응답 서버 호출 및 카운트" />
          <SidebarLink to="/6" label="문제 6: 탑 레이저 신호 수신" />
          <SidebarLink to="/7" label="문제 7: 가장 긴 유효한 괄호 부분" />
          <SidebarLink to="/8" label="문제 8: 조세퍼스 순열" />
          <SidebarLink to="/finish" label="마무리: 디자인 요약" />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex flex-col gap-5">
        <h2 className="text-3xl font-extrabold" style={{ color: PRIMARY }}>문제 1: CSV 파일 분석</h2>

        {/* 규칙 안내 */}
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold" style={{ color: PRIMARY }}>
            출력 규칙
          </CardTitle>

          {/* 최신 세련 Next 버튼 */}
          <Link to="/2" title="문제 2로 이동">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 gap-1 rounded-full border-slate-300 text-slate-600 
                        hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] 
                        transition-colors"
            >
              <span className="hidden sm:inline">다음 문제</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="text-sm text-slate-700 space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>숫자에 해당하는 값만</b> 계산 결과를 출력합니다.</li>
            <li>한 행에 <b>숫자가 아닌 값이 하나라도</b> 있으면 <b>그 행은 계산에서 제외</b>합니다.</li>
            <li>계산 후, <b>숫자가 아닌 값들만 모아</b> 아래에 별도로 출력합니다.</li>
          </ul>
        </CardContent>
      </Card>



        {/* ✅ ChatPanel: 출력 규칙 바로 아래 */}
        <ChatPanel
          items={[
            { to: "/1", label: "CSV 분석하기" },
            { to: "/2", label: "Ping-Pong 통신 테스트" },
            { to: "/3", label: "DB 연결·쿼리 실행" },
            { to: "/4", label: "기온·습도 라인차트" },
            { to: "/5", label: "랜덤 응답 카운트" },
            { to: "/6", label: "Top Laser 신호" },
            { to: "/7", label: "가장 긴 유효 괄호" },
            { to: "/8", label: "조세퍼스 순열" },
          ]}
          brand={PRIMARY}
          headerTopPx={56}
          widthClamp="clamp(320px,26vw,420px)"
          floating={false}
        />

        {/* 업로드 */}
        <Card>
          <CardHeader><CardTitle className="text-lg" style={{ color: PRIMARY }}>CSV 업로드</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">CSV 파일</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={disabled}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    lastFileRef.current = f
                    setFileName(f.name)
                    if (mode === "local") parseFileLocal(f)
                    else parseFileServer(f)
                  }}
                />
                {/* ✅ 깜빡이는 업로드 버튼 */}
                <div className="relative">
                  <Button
                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                    disabled={status==="parsing"}
                    className="gap-1 text-white animate-pulse"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <Upload className="size-4" /> 업로드
                  </Button>
                  <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
                </div>
              </div>
              <div className="text-xs text-slate-500">{fileName ? `선택됨: ${fileName}` : "선택된 파일 없음"}</div>
              <div className="text-[12px] text-slate-600">
                <b>로컬(초고속)</b>: 브라우저에서 직접 스트리밍 파싱 · 네트워크 0.<br />
                <b>서버(SSE)</b>: 초대용량 파일에 적합 · 진행상황 실시간 수신.
              </div>
            </div>

            {/* 진행률 · BRIQUE Thinking */}
            <ProgressFancy progress={progress} status={status} mode={mode} />
          
          </CardContent>
        </Card>

        {/* 유효 행 0 → 경고 배너 */}
        {okLines === 0 && totalLines > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            모든 행이 <b>계산에서 제외</b>되었습니다. CSV의 <b>인코딩/구분자/소수점 표기</b>를 확인해주세요.
            <div className="mt-1 text-amber-700">
              예) UTF-16로 저장된 파일, 세미콜론(;) CSV, <code>1,23</code> 형태의 콤마 소수점 등
            </div>
            {badTokenTop.length > 0 && (
              <div className="mt-2">
                발견된 비숫자 예시: <code>{badTokenTop.slice(0, 5).map((t) => t.token).join(", ")}</code>
              </div>
            )}
          </div>
        )}

        {/* 계산 결과 표 (상위 20행) */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: PRIMARY }}>
              계산 결과 (상위 {PREVIEW_LIMIT}행)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-full table-fixed">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                  <tr>
                    <Th className="w-[8%]">행 번호</Th>
                    <Th className="w-[8%]">개수</Th>
                    <Th className="w-[12%] bq-blink">최소값</Th>
                    <Th className="w-[12%] bq-blink">최대값</Th>
                    <Th className="w-[15%] bq-blink">합계</Th>
                    <Th className="w-[15%] bq-blink">평균</Th>
                    <Th className="w-[15%] bq-blink">표준편차</Th>
                    <Th className="w-[15%] bq-blink">중간값</Th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.line} className="border-t">
                      <Td className="tabular-nums text-center">{r.line}</Td>
                      <Td className="tabular-nums text-center">{r.cnt}</Td>
                      <Td className="tabular-nums text-right pr-4">{r.min}</Td>
                      <Td className="tabular-nums text-right pr-4">{r.max}</Td>
                      <Td className="tabular-nums text-right pr-4">{r.sum}</Td>
                      <Td className="tabular-nums text-right pr-4">{r.mean}</Td>
                      <Td className="tabular-nums text-right pr-4">{r.std}</Td>
                      <Td className="tabular-nums text-right pr-4">{r.median}</Td>
                    </tr>
                  ))}
                  {preview.length === 0 && (
                    <tr><Td colSpan={8} className="text-slate-500 text-center py-8">표시할 데이터가 없습니다.</Td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 데이터 시각화 */}
        <section className="grid xl:grid-cols-3 gap-5">
          {/* 평균/합계 라인차트 */}
          <Card className="xl:col-span-2">
            <CardHeader><CardTitle className="text-lg" style={{ color: PRIMARY }}>데이터 시각화 · 평균/합계</CardTitle></CardHeader>
            <CardContent className="h-[320px]">
              {hasLineData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineSeries} margin={{ left: 8, right: 16, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="x" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="mean" name="평균(Mean)" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sum" name="합계(Sum)" stroke="#ec4899" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-sm text-slate-500">표시할 데이터가 없습니다.</div>
              )}
            </CardContent>
          </Card>

          {/* 유효/오류 비율 + 비숫자 상위 */}
          <div className="grid gap-5">
            <Card>
              <CardHeader><CardTitle className="text-lg" style={{ color: PRIMARY }}>유효/오류 비율</CardTitle></CardHeader>
              <CardContent className="h-[220px]">
                {hasPieData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={okErrPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                        {okErrPie.map((_, i) => <Cell key={i} fill={i === 0 ? "#2563eb" : "#ef4444"} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full grid place-items-center text-sm text-slate-500">데이터 없음</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg" style={{ color: PRIMARY }}>숫자가 아닌 값 상위(Top 15)</CardTitle></CardHeader>
              <CardContent className="h-[220px]">
                {badTokenTop.length === 0 ? (
                  <div className="h-full grid place-items-center text-sm text-slate-500">비숫자 토큰이 없습니다.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={badTokenTop.slice(0, 15)} margin={{ left: 8, right: 16, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="token" hide />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 요약/오류 리스트 */}
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <CardHeader><CardTitle className="text-lg" style={{ color: PRIMARY }}>요약</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Database className="size-4" style={{ color: PRIMARY }} />
                <span>총 라인 수: <b className="tabular-nums">{totalLines}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>계산된 라인 수: <b className="tabular-nums">{okLines}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" />
                <span>오류 라인 수: <b className="tabular-nums">{errLines}</b></span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg bq-blink" style={{ color: PRIMARY }}>
                오류 라인 예시(최대 200)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {errors.length === 0 ? (
                <div className="text-sm text-slate-500">오류가 없습니다.</div>
              ) : (
                <ul className="divide-y max-h-[260px] overflow-auto">
                  {errors.slice(0, 200).map((e) => (
                    <li key={e.line} className="px-2 py-2 text-sm">
                      <span className="font-medium">행 {e.line}</span> ·
                      <span className="text-slate-600 break-all"> {e.raw}</span>
                      {e.badTokens.length > 0 && (
                        <span className="text-slate-500"> · 비숫자: [{e.badTokens.join(" | ")}]</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  </div>
  )
}

/* ---------- 작은 UI 헬퍼 ---------- */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-semibold", className)}>{children}</th>
}
function Td({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td className={cn("px-3 py-2 text-sm align-top", className)} colSpan={colSpan}>{children}</td>
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
