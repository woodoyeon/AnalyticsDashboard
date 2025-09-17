// apps/web/src/pages/Problem3.tsx
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts"

// shadcn/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// 기타
import { Activity, RotateCcw, Database, AlertTriangle, Download, RefreshCw, ChevronLeft, ChevronRight, Search, Sparkles, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"

type Row = {
  emp_no: number
  first_name: string
  last_name: string
  gender: "M" | "F"
  hire_date: string
  dept_name: string | null
  title: string | null
  max_salary: number
}
type ApiResp = {
  page: number
  size: number
  total: number
  totalPages: number
  rows: Row[]
}
type Stats = {
  total: number
  min_salary: number | null
  max_salary: number | null
  avg_salary: number | null
  departments: { label: string | null; cnt: number }[]
  titles: { label: string | null; cnt: number }[]
  genders: { label: "M" | "F"; cnt: number }[]
  hiresByYear: { y: number; cnt: number }[]
  salaryBuckets: { bucket: number; cnt: number }[]
}
type Options = { departments: string[]; titles: string[] }

const API = import.meta.env.VITE_API_BASE ?? "" // '' -> Vite 프록시
const P3 = `${API}/api/problem3`                 // ★ 문제3 전용 prefix

// ===== 디자인 공통 =====
const PRIMARY = "#003399"
const PIE_COLORS = ["#2563eb", "#ec4899"] // 남/여
const BAR_COLOR = "#2563eb"
const BAR2_COLOR = "#22c55e"

const KOR = {
  emp_no: "사번",
  first_name: "이름",
  last_name: "성",
  gender: "성별",
  hire_date: "고용일자",
  dept_name: "부서명",
  title: "직급",
  max_salary: "최대 급여",
} as const
type ColumnKey = keyof typeof KOR

export default function Problem3() {
  const [statsLoading, setStatsLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [size] = useState(15)

  const [data, setData] = useState<ApiResp | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [opts, setOpts] = useState<Options>({ departments: [], titles: [] })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0) // Thinking 퍼센트
  const isStatsBusy = statsLoading || !stats; 

  // --- 필터 상태 ---
  const [filters, setFilters] = useState({
    genders: [] as ("M" | "F")[],
    depts: [] as string[],
    titles: [] as string[],
    salaryMin: "" as string | number,
    salaryMax: "" as string | number,
    q: "", // 이름/성 통합 검색
  })

  // 표시 컬럼 (기본 8개 모두 ON, 필요시 OFF 가능 / 표는 항상 8개 이하)
  const [cols, setCols] = useState<Record<ColumnKey, boolean>>({
    emp_no: true, first_name: true, last_name: true, gender: true,
    hire_date: true, dept_name: true, title: true, max_salary: true,
  })

  const totalPages = data?.totalPages ?? 1

  // 서버 파라미터
  const qs = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), size: String(size) })
    if (filters.q.trim()) p.set("q", filters.q.trim())
    if (filters.genders.length) p.set("gender", filters.genders.join(","))
    if (filters.depts.length) p.set("dept", filters.depts.join(","))
    if (filters.titles.length) p.set("title", filters.titles.join(","))
    if (filters.salaryMin !== "") p.set("salaryMin", String(filters.salaryMin))
    if (filters.salaryMax !== "") p.set("salaryMax", String(filters.salaryMax))
    return p.toString()
  }, [page, size, filters])

  // fetch with abort
  const listAbortRef = useRef<AbortController | null>(null)
  const statAbortRef = useRef<AbortController | null>(null)

  async function fetchOptions() {
    const res = await fetch(`${P3}/employees/options`)
    const json: Options = await res.json()
    setOpts(json)
  }

  function beginThinking() {
    setProgress(8)
    const t = setInterval(() => setProgress(p => (p < 88 ? p + 4 : p)), 120)
    return () => clearInterval(t)
  }

  async function fetchList() {
    listAbortRef.current?.abort()
    const ac = new AbortController()
    listAbortRef.current = ac
    setLoading(true); setError(null)
    const stop = beginThinking()
    try {
      const res = await fetch(`${P3}/employees/hired-after-2000?${qs}`, { signal: ac.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setProgress(96)
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message ?? "ERROR")
    } finally {
      stop()
      setLoading(false)
      setProgress(100)
      setTimeout(() => setProgress(0), 500)
    }
  }

  async function fetchStats() {
    statAbortRef.current?.abort()
    const ac = new AbortController()
    statAbortRef.current = ac
    setStatsLoading(true)
    try {
      const res = await fetch(`${P3}/employees/stats?${qs}`, { signal: ac.signal })
      const json: Stats = await res.json()
      setStats(json)
    } catch {/* ignore */}
    finally{
      setStatsLoading(false)
    }
  }

  useEffect(() => { fetchOptions() }, [])
  useEffect(() => {
    fetchList()
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs])

  const canPrev = page > 1 && !loading
  const canNext = data ? page < totalPages && !loading : false

  function toggleCol(k: ColumnKey) { setCols(prev => ({ ...prev, [k]: !prev[k] })) }
  function updateFilter<K extends keyof typeof filters>(k: K, v: (typeof filters)[K]) {
    setPage(1); setFilters(prev => ({ ...prev, [k]: v }))
  }

  function clearAllFilters() {
    setPage(1)
    setFilters({ genders: [], depts: [], titles: [], salaryMin: "", salaryMax: "", q: "" })
  }

  function downloadPageCSV() {
    if (!data?.rows?.length) return
    const header = ["emp_no","first_name","last_name","gender","hire_date","dept_name","title","max_salary"]
    const body = data.rows.map(r => [
      r.emp_no, r.first_name, r.last_name, r.gender, r.hire_date?.slice(0,10),
      r.dept_name ?? "", r.title ?? "", r.max_salary
    ].join(",")).join("\n")
    const blob = new Blob([header.join(",") + "\n" + body], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `problem3-page-${data.page}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ---- 차트 데이터 ----
  const genderPie = useMemo(
    () => (stats?.genders ?? []).map((g) => ({ name: g.label === "M" ? "남" : "여", value: g.cnt })),
    [stats]
  )
  const deptBar = useMemo(
    () => (stats?.departments ?? []).slice(0, 10).map(d => ({ name: d.label ?? "-", count: d.cnt })),
    [stats]
  )
  const titleBar = useMemo(
    () => (stats?.titles ?? []).slice(0, 10).map(t => ({ name: t.label ?? "-", count: t.cnt })),
    [stats]
  )
  const hiresArea = useMemo(
    () => (stats?.hiresByYear ?? []).map(r => ({ name: String(r.y), count: r.cnt })),
    [stats]
  )
  const salaryHist = useMemo(
    () => (stats?.salaryBuckets ?? []).map(b => ({ name: `${b.bucket.toLocaleString()}`, count: b.cnt })),
    [stats]
  )

  // --- 칩 멀티선택용 필터 ---
  const [deptSearch, setDeptSearch] = useState("")
  const [titleSearch, setTitleSearch] = useState("")
  const filteredDepts = useMemo(
    () => opts.departments.filter(d => d.toLowerCase().includes(deptSearch.toLowerCase())),
    [opts.departments, deptSearch]
  )
  const filteredTitles = useMemo(
    () => opts.titles.filter(t => t.toLowerCase().includes(titleSearch.toLowerCase())),
    [opts.titles, titleSearch]
  )

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
            <Button variant="outline" onClick={clearAllFilters} className="gap-1" disabled={loading}>
              <RotateCcw className="size-4" /> 초기화
            </Button>
            <Button variant="outline" onClick={() => { fetchList(); fetchStats(); }} disabled={loading} className="gap-1">
              <RefreshCw className="size-4" /> 새로고침
            </Button>
          </div>
        </div>
        {/* 빠른 필터 바 */}
        <div className="border-t bg-white">
          <div className="mx-auto max-w-screen-2xl px-5 py-2 flex flex-wrap gap-3 items-center">
            {/* 이름/성 통합 검색 */}
            <div className="relative">
              <Search className="size-4 text-slate-400 absolute left-2 top-2.5" />
              <Input
                className="pl-8 w-56"
                placeholder="이름/성 검색"
                value={filters.q}
                onChange={(e) => updateFilter("q", e.target.value)}
              />
            </div>

            {/* 성별 토글 */}
            <div className="flex items-center gap-1">
              <QuickToggle
                label="전체"
                active={filters.genders.length === 0}
                onClick={() => updateFilter("genders", [])}
              />
              <QuickToggle
                label="남"
                active={filters.genders.includes("M")}
                onClick={() =>
                  updateFilter("genders",
                    filters.genders.includes("M")
                      ? filters.genders.filter(g => g !== "M")
                      : [...filters.genders, "M"])}
              />
              <QuickToggle
                label="여"
                active={filters.genders.includes("F")}
                onClick={() =>
                  updateFilter("genders",
                    filters.genders.includes("F")
                      ? filters.genders.filter(g => g !== "F")
                      : [...filters.genders, "F"])}
              />
            </div>

            {/* 급여 범위 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">급여</span>
              <Input
                className="w-28"
                placeholder="최소"
                inputMode="numeric"
                value={filters.salaryMin}
                onChange={(e) => updateFilter("salaryMin", e.target.value.replace(/[^\d]/g, ""))}
              />
              <span>~</span>
              <Input
                className="w-28"
                placeholder="최대"
                inputMode="numeric"
                value={filters.salaryMax}
                onChange={(e) => updateFilter("salaryMax", e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>

            <div className="ml-auto text-xs text-slate-500">
              대상: <b>2000-01-01 이후 입사자</b>
            </div>
          </div>
        </div>
      </header>

      {/* 본문 레이아웃 */}
      <div className="mx-auto max-w-screen-2xl px-4 lg:px-5 py-5 grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_360px] gap-5">
        {/* 좌측 내비 */}
        <aside className="rounded-xl overflow-hidden border bg-white xl:sticky xl:top-[120px] h-max">
          <div className="p-4 text-white" style={{ backgroundColor: PRIMARY }}>
            <div className="text-lg font-bold tracking-wide">우도연 데이터 랩</div>
          </div>
          <nav className="p-2 space-y-[2px]">
            <SidebarLink to="/" label="홈: 웹사이트 전체 레이아웃" />
            <SidebarLink to="/1" label="문제 1: CSV 파일 분석" />
            <SidebarLink to="/2" label="문제 2: Ping-Pong 프로그램" />
            <SidebarLink to="/3" label="문제 3: DB 연결 및 쿼리 실행" active />
            <SidebarLink to="/4" label="문제 4: 기온·습도 차트" />
            <SidebarLink to="/5" label="문제 5: 랜덤 응답 카운트" />
            <SidebarLink to="/6" label="문제 6: Top Laser 신호" />
            <SidebarLink to="/7" label="문제 7: 가장 긴 유효 괄호" />
            <SidebarLink to="/8" label="문제 8: 조세퍼스 순열" />
            <SidebarLink to="/finish" label="마무리: 디자인 요약" />
          </nav>
        </aside>

        {/* 가운데: 결과/차트 */}
        <main className="flex flex-col gap-5">
          {/* 제목 + 다음 문제 이동 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-3xl font-extrabold" style={{ color: PRIMARY }}>
              문제 3: DB 연결 및 쿼리 실행
            </h2>

            <Link to="/4" title="문제 4로 이동">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 gap-1 rounded-full border-slate-300 text-slate-600 
                          hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors"
                style={{ ["--primary" as any]: PRIMARY }}
              >
                <span className="hidden sm:inline">문제 4</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          {/* 필터(부서/직급 칩 선택) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: PRIMARY }}>세부 필터</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 부서 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SectionLabel>부서 선택</SectionLabel>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateFilter("depts", filteredDepts)} disabled={!filteredDepts.length}>전체선택</Button>
                    <Button variant="outline" size="sm" onClick={() => updateFilter("depts", [])}>해제</Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input className="w-64" placeholder="부서 검색" value={deptSearch} onChange={(e) => setDeptSearch(e.target.value)} />
                  <span className="text-xs text-slate-500">선택 {filters.depts.length} / {filteredDepts.length}</span>
                </div>
                <ChipGrid
                  items={filteredDepts}
                  selected={filters.depts}
                  onToggle={(v) =>
                    updateFilter("depts",
                      filters.depts.includes(v) ? filters.depts.filter(d => d !== v) : [...filters.depts, v]
                    )
                  }
                />
              </div>

              {/* 직급 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <SectionLabel>직급 선택</SectionLabel>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateFilter("titles", filteredTitles)} disabled={!filteredTitles.length}>전체선택</Button>
                    <Button variant="outline" size="sm" onClick={() => updateFilter("titles", [])}>해제</Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input className="w-64" placeholder="직급 검색" value={titleSearch} onChange={(e) => setTitleSearch(e.target.value)} />
                  <span className="text-xs text-slate-500">선택 {filters.titles.length} / {filteredTitles.length}</span>
                </div>
                <ChipGrid
                  items={filteredTitles}
                  selected={filters.titles}
                  onToggle={(v) =>
                    updateFilter("titles",
                      filters.titles.includes(v) ? filters.titles.filter(t => t !== v) : [...filters.titles, v]
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* 결과 테이블 */}
          <Card>
            <CardHeader><CardTitle className="text-lg" style={{ color: PRIMARY }}>결과 테이블</CardTitle></CardHeader>
            <CardContent>
              {error && (
                <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-4" /> <span>오류: {error}</span>
                </div>
              )}

              {/* 컬럼 토글 */}
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                {(Object.keys(KOR) as ColumnKey[]).map(k => (
                  <label key={k} className="inline-flex items-center gap-1 border px-2 py-1 rounded bg-white">
                    <input type="checkbox" checked={cols[k]} onChange={() => toggleCol(k)} />
                    <span>{KOR[k]}</span>
                  </label>
                ))}
              </div>

              <div className="overflow-x-auto border rounded bg-white">
                <table className="min-w-[900px] w-full">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                    <tr>
                      {cols.emp_no && <Th>{KOR.emp_no}</Th>}
                      {cols.first_name && <Th>{KOR.first_name}</Th>}
                      {cols.last_name && <Th>{KOR.last_name}</Th>}
                      {cols.gender && <Th>{KOR.gender}</Th>}
                      {cols.hire_date && <Th>{KOR.hire_date}</Th>}
                      {cols.dept_name && <Th>{KOR.dept_name}</Th>}
                      {cols.title && <Th>{KOR.title}</Th>}
                      {cols.max_salary && <Th className="text-right">{KOR.max_salary}</Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {/* 로딩 스켈레톤 */}
                    {loading && (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={`sk-${i}`} className="border-t">
                          {Array.from({ length: 8 }).map((__, j) => (
                            <td key={j} className="px-3 py-3">
                              <div className="h-3 w-32 bg-slate-200/70 animate-pulse rounded" />
                            </td>
                          ))}
                        </tr>
                      ))
                    )}

                    {!loading && data?.rows?.map((r) => (
                      <tr key={r.emp_no} className="border-t hover:bg-slate-50/70">
                        {cols.emp_no && <Td className="tabular-nums">{r.emp_no}</Td>}
                        {cols.first_name && <Td>{r.first_name}</Td>}
                        {cols.last_name && <Td>{r.last_name}</Td>}
                        {cols.gender && <Td>{r.gender}</Td>}
                        {cols.hire_date && <Td>{r.hire_date?.slice(0, 10)}</Td>}
                        {cols.dept_name && <Td>{r.dept_name ?? "-"}</Td>}
                        {cols.title && <Td>{r.title ?? "-"}</Td>}
                        {cols.max_salary && <Td className="text-right tabular-nums">{r.max_salary?.toLocaleString()}</Td>}
                      </tr>
                    ))}

                    {!loading && (data?.rows?.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-14">
                          <div className="inline-flex items-center gap-2 text-slate-500">
                            <Sparkles className="size-4" />
                            조건에 맞는 결과가 없습니다. 필터를 조정해 보세요.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 차트 로딩 안내 */}
          {statsLoading && (
            <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 flex items-center gap-2">
              <Activity className="size-4 animate-pulse" />
              <span>BRIQUE Chart 생성중… 데이터를 수집하고 있어요.</span>
            </div>
          )}


          {/* 입사추이 & 급여 히스토그램 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ChartCard title="연도별 입사 추이">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hiresArea} margin={{ left: 8, right: 16, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke={BAR_COLOR} fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="최대 급여 히스토그램 (원 단위 구간)">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryHist} margin={{ left: 8, right: 16, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill={BAR_COLOR} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </main>

        {/* 우측: 통계/인사이트 */}
        <aside className="flex flex-col gap-5">
          <Card>
            {/* flex-row로 강제 + items-center/justify-between 유지 */}
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg" style={{ color: PRIMARY }}>
                통계
              </CardTitle>

              {/* 차트 로딩 안내 (값 나오기 전까지 깜빡) */}
              {isStatsBusy && (
                <div className="relative" role="status" aria-live="polite">
                  <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/30 animate-ping" />
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] bg-indigo-50 border-indigo-200 text-indigo-700 animate-pulse">
                    <Activity className="size-3" />
                    차트 출력 중… 잠시만 기다려주세요
                  </span>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat label="총 인원" value={stats?.total?.toLocaleString() ?? 0} />
                <Stat label="평균 급여" value={stats?.avg_salary ? Math.round(stats.avg_salary).toLocaleString() : "-"} />
                <Stat label="최소 급여" value={stats?.min_salary?.toLocaleString() ?? "-"} />
                <Stat label="최대 급여" value={stats?.max_salary?.toLocaleString() ?? "-"} />
              </div>

              <div>
                <SectionLabel>성별 분포</SectionLabel>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip />
                      <Pie data={genderPie} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" stroke="none">
                        {genderPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <SectionLabel>부서 TOP 10</SectionLabel>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptBar} margin={{ left: 8, right: 8, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={BAR_COLOR} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <SectionLabel>직급 TOP 10</SectionLabel>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={titleBar} margin={{ left: 8, right: 8, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={BAR2_COLOR} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 요약 카드 */}
          <Card>
            <CardHeader><CardTitle className="text-lg" style={{ color: PRIMARY }}>요약</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Database className="size-4" style={{ color: PRIMARY }} />
                <span>총 인원: <b className="tabular-nums">{stats?.total?.toLocaleString() ?? 0}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                <span>평균 급여: <b className="tabular-nums">{stats?.avg_salary ? Math.round(stats.avg_salary).toLocaleString() : "-"}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-slate-400 inline-block" />
                <span>최소/최대: <b className="tabular-nums">{stats?.min_salary?.toLocaleString() ?? "-"}</b> ~ <b className="tabular-nums">{stats?.max_salary?.toLocaleString() ?? "-"}</b></span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* 플로팅 하단 바 */}
      <div className="sticky bottom-0 z-30 bg-white/90 backdrop-blur border-t">
        <div className="mx-auto max-w-screen-2xl px-5 py-2 flex items-center gap-3">
          <div className="text-sm text-slate-600">
            {data ? <span>총 <b>{data.total.toLocaleString()}</b>건 · 페이지 <b>{data.page}</b>/<b>{data.totalPages}</b></span> : "…"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!canPrev} className="gap-1">
              <ChevronLeft className="size-4" /> 이전
            </Button>
            <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={!canNext} className="gap-1">
              다음 <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" onClick={downloadPageCSV} disabled={!data?.rows?.length} className="gap-1">
              <Download className="size-4" /> CSV(현재 페이지)
            </Button>
          </div>
        </div>
      </div>

      {/* Brique Thinking 오버레이 */}
      {progress > 0 && (
        <ThinkingOverlay progress={progress} />
      )}
    </div>
  )
}

/* ---------- 작은 UI 컴포넌트 ---------- */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-semibold", className)}>{children}</th>
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 text-sm", className)}>{children}</td>
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-medium text-slate-600">{children}</div>
}
function Stat({ label, value }: { label: string; value: ReactNode }) {
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
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <header className="px-4 py-2 border-b bg-white/60">
        <h3 className="font-medium text-sm">{title}</h3>
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}
function QuickToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs border transition",
        active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  )
}
function ChipGrid({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
  if (!items.length) return <div className="text-xs text-slate-400">항목이 없습니다.</div>
  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((v) => {
        const on = selected.includes(v)
        return (
          <button
            key={v}
            onClick={() => onToggle(v)}
            className={cn(
              "px-3 py-1.5 rounded-full border text-xs text-left truncate",
              on ? "bg-indigo-50 border-indigo-400 text-indigo-700" : "bg-white hover:bg-slate-50"
            )}
            title={v}
          >
            {v}
          </button>
        )
      })}
    </div>
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
            <div className="text-xs text-slate-500">데이터 조회 및 계산 중입니다. 잠시만 기다려주세요.</div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full rounded bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="mt-1 text-right text-[11px] text-slate-500 tabular-nums">{Math.min(100, Math.round(progress))}%</div>
      </div>
    </div>
  )
}
