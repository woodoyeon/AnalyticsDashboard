// apps/web/src/pages/Problem4.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts"

// shadcn/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// icons
import { Sparkles, Shuffle, RotateCcw, Download, TrendingUp, Activity, Thermometer, Droplets, ArrowRight, Loader2 } from "lucide-react"
import { Link } from "react-router-dom"

/* ======================= Types & Constants ======================= */
type MonthRow = { m: number; label: string; temp: number; hum: number }

const API  = import.meta.env.VITE_API_BASE ?? "" // '' -> Vite 프록시
const P4   = `${API}/api/problem4`

// ===== 디자인 공통 =====
const PRIMARY = "#003399"
const C_TEMP = "#ef4444"      // 기온(선명한 빨강)
const C_HUM = "#2563eb"       // 습도(선명한 파랑)
const C_TEMP_AVG = "#f97316"  // 기온 이동평균(오렌지)
const C_HUM_AVG = "#0ea5e9"   // 습도 이동평균(스카이)
const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"]

// 초기값(서울 감성)
const DEFAULT_DATA: MonthRow[] = [
  { m:1,  label:"1월",  temp:-1, hum:62 },
  { m:2,  label:"2월",  temp: 1, hum:60 },
  { m:3,  label:"3월",  temp: 6, hum:60 },
  { m:4,  label:"4월",  temp:12, hum:62 },
  { m:5,  label:"5월",  temp:18, hum:69 },
  { m:6,  label:"6월",  temp:22, hum:75 },
  { m:7,  label:"7월",  temp:25, hum:80 },
  { m:8,  label:"8월",  temp:26, hum:78 },
  { m:9,  label:"9월",  temp:21, hum:72 },
  { m:10, label:"10월", temp:14, hum:66 },
  { m:11, label:"11월", temp: 7, hum:63 },
  { m:12, label:"12월", temp: 1, hum:62 },
]

/* ======================= Utils ======================= */
const clamp      = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
const normalize  = (v: number, min: number, max: number) => (v - min) / (max - min)
const mean       = (arr: number[]) => (arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0)

const mvAvg = (nums: number[], win: number) => {
  if (win <= 1) return nums.slice()
  const half = Math.floor(win/2)
  return nums.map((_, i) => {
    const s = Math.max(0, i - half)
    const e = Math.min(nums.length - 1, i + half)
    return mean(nums.slice(s, e + 1))
  })
}

// 계절성 + 노이즈 랜덤 (클라이언트 폴백)
function localRandomData(noise = 1): MonthRow[] {
  return MONTH_LABELS.map((label, i) => {
    const t = (i + 1) / 12
    const baseTemp = 16 * Math.sin(Math.PI * (t - 0.25)) + 12   // 대략 -4 ~ 28
    const baseHum  = -15 * Math.sin(Math.PI * (t - 0.25)) + 65  // 대략 50 ~ 80
    const temp = clamp(Math.round(baseTemp + randN() * noise), -10, 35)
    const hum  = clamp(Math.round(baseHum  + randN() * noise * 2), 35, 90)
    return { m: i + 1, label, temp, hum }
  })
  function randN(){ return (Math.random() + Math.random() + Math.random() - 1.5) }
}

// CSV 다운로드
function downloadCSV(rows: MonthRow[]) {
  const header = "month,temp,hum\n"
  const body = rows.map(r => `${r.m},${r.temp},${r.hum}`).join("\n")
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "problem4-data.csv"
  a.click()
  URL.revokeObjectURL(url)
}

/* ======================= Page ======================= */
export default function Problem4() {
  const [rows, setRows] = useState<MonthRow[]>(DEFAULT_DATA)
  const [noise, setNoise] = useState(1)
  const [show, setShow] = useState({ temp: true, hum: true, avg: true })
  const [smooth, setSmooth] = useState(3) // 이동평균 창크기 (1이면 미적용)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [randHint, setRandHint] = useState(true)

  // 서버 데이터 시도 → 실패 시 로컬 폴백
  async function loadDefault() {
    setLoading(true); setProgress(8)
    try {
      const r = await fetch(`${P4}/default`)
      setProgress(60)
      if (!r.ok) throw new Error()
      const j = await r.json()
      setRows(Array.isArray(j?.rows) ? j.rows : DEFAULT_DATA)
      setProgress(100)
    } catch {
      setRows(DEFAULT_DATA) // 폴백
      setProgress(100)
    } finally {
      setTimeout(()=>setProgress(0), 380)
      setLoading(false)
    }
  }
  async function loadRandom() {
    setLoading(true); setProgress(8)
    try {
      const r = await fetch(`${P4}/random?noise=${encodeURIComponent(noise)}`)
      setProgress(60)
      if (!r.ok) throw new Error()
      const j = await r.json()
      setRows(Array.isArray(j?.rows) ? j.rows : localRandomData(noise))
      setProgress(100)
    } catch {
      setRows(localRandomData(noise)) // 폴백
      setProgress(100)
    } finally {
      setTimeout(()=>setProgress(0), 380)
      setLoading(false)
    }
  }

  useEffect(() => { loadDefault() }, [])

  // 통계
  const avgTemp = useMemo(() => +mean(rows.map(r=>r.temp)).toFixed(1), [rows])
  const avgHum  = useMemo(() => +mean(rows.map(r=>r.hum)).toFixed(1),  [rows])
  const minTemp = useMemo(() => rows.reduce((a,b)=> a.temp < b.temp ? a : b), [rows])
  const maxTemp = useMemo(() => rows.reduce((a,b)=> a.temp > b.temp ? a : b), [rows])
  const minHum  = useMemo(() => rows.reduce((a,b)=> a.hum  < b.hum  ? a : b), [rows])
  const maxHum  = useMemo(() => rows.reduce((a,b)=> a.hum  > b.hum  ? a : b), [rows])

  // 차트 데이터
  const lineData = useMemo(() => {
    const t = rows.map(r=>r.temp)
    const h = rows.map(r=>r.hum)
    const tAvg = mvAvg(t, smooth)
    const hAvg = mvAvg(h, smooth)
    return rows.map((r, i) => ({
      name: r.label,
      "평균 기온": r.temp,
      "평균 습도": r.hum,
      "기온 이동평균": +tAvg[i].toFixed(1),
      "습도 이동평균": +hAvg[i].toFixed(1),
    }))
  }, [rows, smooth])

  const barData   = lineData
  const areaData  = lineData

  // 입력 변경 + 유효성
  function updateCell(i: number, key: "temp" | "hum", raw: string) {
    const num = Number(raw)
    setRows(prev => {
      const next = [...prev]
      const v = Number.isNaN(num) ? 0 : key === "temp" ? clamp(num, -30, 50) : clamp(num, 0, 100)
      next[i] = { ...next[i], [key]: v }
      return next
    })
  }

  // AI풍 요약
  const insightText = useMemo(() => {
    const hot  = maxTemp.label, cold = minTemp.label
    const humH = maxHum.label,  humL = minHum.label
    return `가장 더운 달은 ${hot}(${maxTemp.temp}℃), 가장 추운 달은 ${cold}(${minTemp.temp}℃)입니다.
평균 습도는 ${avgHum}%로, 가장 습한 달은 ${humH}(${maxHum.hum}%) · 가장 건조한 달은 ${humL}(${minHum.hum}%) 입니다.`
  }, [maxTemp, minTemp, maxHum, minHum, avgHum])

  /* ----------------------- UI ----------------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-screen-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-5" style={{ color: PRIMARY }} />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Data Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 🔵 Random: 항상 깜빡, 클릭 시 꺼짐 */}
            <div className="relative inline-block">
              <Button
                onClick={() => { if (randHint) setRandHint(false); loadRandom() }}
                className={cn("gap-1 text-white transition", randHint && "animate-pulse")}
                style={{ backgroundColor: PRIMARY }}
                disabled={loading}
                title="무작위 데이터 가져오기"
              >
                {/* 로딩 중엔 스피너만 교체 (깜빡임은 randHint로만 제어) */}
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Shuffle className="size-4" />}
                Random
              </Button>

              {/* 링 효과: randHint가 true일 때만 */}
              {randHint && (
                <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
              )}
            </div>

            <Button variant="outline" onClick={loadDefault} className="gap-1" disabled={loading}>
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button variant="outline" onClick={() => downloadCSV(rows)} className="gap-1" disabled={loading}>
              <Download className="size-4" /> CSV 저장
            </Button>
          </div>


          
        </div>
        {/* 진행바 */}
        <div className="h-1 bg-transparent">
          {progress > 0 && (
            <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: PRIMARY }} />
          )}
        </div>
      </header>

      {/* 레이아웃: 좌 240px / 우 본문 */}
      <div className="mx-auto max-w-screen-2xl px-4 lg:px-5 py-5 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
        {/* Sidebar */}
        <aside className="rounded-xl overflow-hidden border bg-white lg:sticky lg:top-[120px] h-max">
          <div className="p-4 text-white" style={{ backgroundColor: PRIMARY }}>
            <div className="text-lg font-bold tracking-wide">우도연 데이터 랩</div>
          </div>
          <nav className="p-2 space-y-[2px]">
            <SidebarLink to="/" label="홈: 웹사이트 전체 레이아웃" />
            <SidebarLink to="/1" label="문제 1: CSV 파일 분석" />
            <SidebarLink to="/2" label="문제 2: Ping-Pong 프로그램" />
            <SidebarLink to="/3" label="문제 3: DB 연결 및 쿼리 실행" />
            <SidebarLink to="/4" label="문제 4: 기온·습도 차트" active />
            <SidebarLink to="/5" label="문제 5: 랜덤 응답 카운트" />
            <SidebarLink to="/6" label="문제 6: Top Laser 신호" />
            <SidebarLink to="/7" label="문제 7: 가장 긴 유효 괄호" />
            <SidebarLink to="/8" label="문제 8: 조세퍼스 순열" />
            <SidebarLink to="/finish" label="마무리: 디자인 요약" />
          </nav>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-5">
          {/* 상단 타이틀 + 다음문제 이동 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-3xl font-extrabold" style={{ color: PRIMARY }}>
              문제 4: 월별 기온/습도 · 실시간 차트
            </h2>

            <Link to="/5" title="문제 5로 이동">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 gap-1 rounded-full border-slate-300 text-slate-600
                          hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors"
                style={{ ["--primary" as any]: PRIMARY }}
              >
                <span className="hidden sm:inline">문제 5</span>
                <ArrowRight className="size-5" />
              </Button>
            </Link>
          </div>

          {/* 설정/설명 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: PRIMARY }}>문제 설명 & 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>입력 테이블에서 <b>기온(℃)</b>, <b>습도(%)</b>를 수정하면 차트가 즉시 반영됩니다.</li>
                <li>차트 라이브러리: <b>Recharts</b></li>
                <li>가산점: <b>Random</b> · <b>CSV 저장</b> · <b>이동평균</b></li>
              </ul>

              <section className="grid md:grid-cols-2 gap-x-8 gap-y-6 items-start">
                {/* 왼쪽: 랜덤 노이즈 */}
                <div className="space-y-3">
                  <Label className="text-xs text-slate-600 inline-flex items-center gap-1">
                    <Sparkles className="size-4 text-indigo-600" /> 랜덤 노이즈 강도
                  </Label>

                  <div className="rounded-md border bg-white/60 px-3 py-3 focus-within:ring-2 focus-within:ring-indigo-300">
                    <Slider
                      value={[noise]}
                      min={0}
                      max={4}
                      step={0.5}
                      onValueChange={(v)=>setNoise(v[0] ?? 1)}
                      className="
                        [&_[data-orientation='horizontal']]:h-2
                        [&_[data-orientation='horizontal']]:rounded-full
                        [&_[data-orientation='horizontal']]:bg-indigo-100
                        [&_[data-orientation='horizontal']>span]:bg-indigo-600
                        [&_[role='slider']]:h-5 [&_[role='slider']]:w-5
                        [&_[role='slider']]:border-2 [&_[role='slider']]:border-indigo-500
                        [&_[role='slider']]:bg-white
                        [&_[role='slider']:hover]:bg-indigo-50
                        [&_[role='slider']:focus-visible]:ring-2 [&_[role='slider']:focus-visible]:ring-indigo-400/50
                      "
                    />
                  </div>

                  <div className="text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700">
                      현재: <b className="tabular-nums">{noise}</b>
                    </span>
                  </div>
                </div>

                {/* 오른쪽: 시리즈 / 스무딩 */}
                <div className="space-y-4">
                  <Label className="text-xs text-slate-600">표시할 시리즈</Label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={()=>setShow(s=>({ ...s, temp: !s.temp }))}
                      className={cn(
                        "inline-flex h-8 items-center gap-2 px-3 rounded-full border text-xs transition",
                        show.temp ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                      title="평균 기온 표시"
                    >
                      <Thermometer className="size-4" style={{ color: C_TEMP }} />
                      평균 기온
                    </button>

                    <button
                      type="button"
                      onClick={()=>setShow(s=>({ ...s, hum: !s.hum }))}
                      className={cn(
                        "inline-flex h-8 items-center gap-2 px-3 rounded-full border text-xs transition",
                        show.hum ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                      title="평균 습도 표시"
                    >
                      <Droplets className="size-4" style={{ color: C_HUM }} />
                      평균 습도
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox checked={show.avg} onCheckedChange={(v)=>setShow(s=>({ ...s, avg: !!v }))} id="ma" />
                    <Label htmlFor="ma" className="inline-flex items-center gap-2">
                      <span className="inline-block size-2 rounded-full" style={{ background: C_TEMP_AVG }} />
                      <span className="inline-block size-2 rounded-full" style={{ background: C_HUM_AVG }} />
                      이동평균(스무딩) 표시
                    </Label>
                  </div>

                  <div className="space-y-2 max-w-md">
                    <Label className="text-xs text-slate-600">스무딩 창 크기 (1=끄기)</Label>

                    <div className="rounded-md border bg-white/60 px-3 py-3 focus-within:ring-2 focus-within:ring-amber-300">
                      <Slider
                        value={[smooth]}
                        min={1}
                        max={7}
                        step={2}
                        onValueChange={(v)=>setSmooth(v[0] ?? 1)}
                        className="
                          [&_[data-orientation='horizontal']]:h-2
                          [&_[data-orientation='horizontal']]:rounded-full
                          [&_[data-orientation='horizontal']]:bg-amber-100
                          [&_[data-orientation='horizontal']>span]:bg-amber-500
                          [&_[role='slider']]:h-5 [&_[role='slider']]:w-5
                          [&_[role='slider']]:border-2 [&_[role='slider']]:border-amber-500
                          [&_[role='slider']]:bg-white
                          [&_[role='slider']:hover]:bg-amber-50
                          [&_[role='slider']:focus-visible]:ring-2 [&_[role='slider']:focus-visible]:ring-amber-400/50
                        "
                      />
                    </div>

                    <div className="text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-700">
                        현재: <b className="tabular-nums">{smooth}</b>
                      </span>
                    </div>
                  </div>
                </div>
              </section>



              <section className="space-y-2">
                <Label className="text-xs text-slate-500">AI 인사이트</Label>
                <div className="rounded-md border bg-slate-50 p-3 text-[13px] leading-5">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <TrendingUp className="size-4" style={{ color: PRIMARY }} />
                    자동 요약
                  </div>
                  <p className="mt-1 text-slate-700 whitespace-pre-line">{insightText}</p>
                </div>
              </section>
            </CardContent>
          </Card>

          {/* 중앙: 입력 + 메인 차트 */}
          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
            <section className="flex flex-col gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" style={{ color: PRIMARY }}>입력 테이블</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto border rounded bg-white">
                    <table className="min-w-[560px] w-full">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <Th className="w-20">월</Th>
                          <Th className="w-40">기온 (℃)</Th>
                          <Th className="w-40">습도 (%)</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const tempInvalid = r.temp < -30 || r.temp > 50
                          const humInvalid  = r.hum  <   0 || r.hum  > 100
                          return (
                            <tr key={r.m} className="border-t">
                              <Td className="font-medium">{r.label}</Td>
                              <Td>
                                <Input
                                  type="number"
                                  value={r.temp}
                                  onChange={e=>updateCell(i, "temp", e.target.value)}
                                  className={cn("w-28", tempInvalid && "ring-2 ring-rose-400")}
                                  aria-invalid={tempInvalid}
                                />
                                {tempInvalid && <p className="text-[11px] text-rose-600 mt-1">-30~50 범위로 입력</p>}
                              </Td>
                              <Td>
                                <Input
                                  type="number"
                                  value={r.hum}
                                  onChange={e=>updateCell(i, "hum", e.target.value)}
                                  className={cn("w-28", humInvalid && "ring-2 ring-rose-400")}
                                  aria-invalid={humInvalid}
                                />
                                {humInvalid && <p className="text-[11px] text-rose-600 mt-1">0~100 범위로 입력</p>}
                              </Td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr className="font-semibold">
                          <Td>평균</Td>
                          <Td>{avgTemp.toFixed(1)} ℃</Td>
                          <Td>{avgHum.toFixed(1)} %</Td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" style={{ color: PRIMARY }}>라인 차트 (이중축 + 이동평균)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ left: 8, right: 24, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="temp" unit="℃" domain={[-20, 40]} />
                      <YAxis yAxisId="hum" orientation="right" unit="%" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      {show.temp && (
                        <Line yAxisId="temp" type="monotone" dataKey="평균 기온" dot={false} strokeWidth={2} stroke={C_TEMP} />
                      )}
                      {show.hum && (
                        <Line yAxisId="hum" type="monotone" dataKey="평균 습도" dot={false} strokeWidth={2} stroke={C_HUM} />
                      )}
                      {show.avg && (
                        <Line yAxisId="temp" type="monotone" dataKey="기온 이동평균" dot={false} strokeWidth={2} stroke={C_TEMP_AVG} strokeDasharray="4 3" />
                      )}
                      {show.avg && (
                        <Line yAxisId="hum" type="monotone" dataKey="습도 이동평균" dot={false} strokeWidth={2} stroke={C_HUM_AVG} strokeDasharray="4 3" />
                      )}

                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </section>

            {/* 우측: 통계 & 보조 차트 */}
            <section className="flex flex-col gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" style={{ color: PRIMARY }}>통계 요약</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Stat label="평균 기온" value={`${avgTemp.toFixed(1)} ℃`} />
                    <Stat label="평균 습도" value={`${avgHum.toFixed(1)} %`} />
                    <Stat label="최저 기온" value={`${minTemp.temp} ℃ (${minTemp.label})`} />
                    <Stat label="최고 기온" value={`${maxTemp.temp} ℃ (${maxTemp.label})`} />
                    <Stat label="최저 습도" value={`${minHum.hum} % (${minHum.label})`} />
                    <Stat label="최고 습도" value={`${maxHum.hum} % (${maxHum.label})`} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" style={{ color: PRIMARY }}>막대 차트 (습도)</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ left: 8, right: 16, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis unit="%" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="평균 습도" fill={C_HUM} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" style={{ color: PRIMARY }}>에리어 차트 (기온)</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData} margin={{ left: 8, right: 16, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis unit="℃" domain={[-20, 40]} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="평균 기온" strokeWidth={2} stroke={C_TEMP} fill={C_TEMP} fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg" style={{ color: PRIMARY }}>레이더 차트 (정규화 비교)</CardTitle>
                </CardHeader>
                <CardContent className="h-64 pb-8">{/* 아래 여백을 조금 줘서 Legend와도 안 겹치게 */}
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={rows.map(r => ({
                        subject: r.label,
                        tempN: normalize(r.temp, -10, 35),
                        humN:  normalize(r.hum, 35, 90),
                      }))}
                      outerRadius="72%" // 🔹도형을 살짝 안쪽으로
                    >
                      <PolarGrid radialLines={false} />
                      <PolarAngleAxis
                        dataKey="subject"
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#475569" }} // 🔹라벨 더 선명
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} /> {/* 🔹불필요한 눈금 제거 */}

                      <Radar name="기온(정규화)" dataKey="tempN" strokeWidth={2} stroke={C_TEMP} fill={C_TEMP} fillOpacity={0.15} />
                      <Radar name="습도(정규화)" dataKey="humN"  strokeWidth={2} stroke={C_HUM}  fill={C_HUM}  fillOpacity={0.15} />

                      <Legend verticalAlign="bottom" height={24} /> {/* 🔹아래로 내림 */}
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>

              </Card>
            </section>
          </section>
        </main>
      </div>

      {/* Thinking Overlay */}
      {progress > 0 && <ThinkingOverlay progress={progress} />}
    </div>
  )
}

/* ======================= Small UI Helpers ======================= */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-semibold", className)}>{children}</th>
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 text-sm", className)}>{children}</td>
}
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-2 bg-slate-50">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
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

function ThinkingOverlay({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="rounded-2xl bg-white shadow-xl px-6 py-5 w-[min(92vw,420px)] border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="size-6 text-indigo-600 animate-pulse" />
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-emerald-500 animate-[ping_1s_ease_infinite]" />
          </div>
          <div>
            <div className="font-semibold">Analytics Thinking…</div>
            <div className="text-xs text-slate-500">데이터 생성/로딩 중입니다.</div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full rounded bg-slate-200 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <div className="mt-1 text-right text-[11px] text-slate-500 tabular-nums">{Math.min(100, Math.round(progress))}%</div>
      </div>
    </div>
  )
}
