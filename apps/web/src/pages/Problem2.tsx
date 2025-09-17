// apps/web/src/pages/Problem2.tsx
import { useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts"

// shadcn/ui
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// icons
import {
  Activity, Link as LinkIcon, Link2Off, Send, Rocket, Timer, BadgeCheck,
  Signal, RefreshCw, MonitorSmartphone, Server, Info, Wifi, BarChart3, Play,
  ArrowRight, // ← 추가
} from "lucide-react"
import { Link } from "react-router-dom"

type MsgRow = {
  id: number
  text: string
  delayMs: number
  tSend: number
  tRecv?: number
  rText?: string
}
type Proto = "tcp" | "udp"

// --- Flow Timeline 추가 ---
type FlowEvent = {
  t: number        // performance.now()
  who: "client" | "server"
  text: string     // 표시용 메시지
  id?: number
}

const PRIMARY = "#003399"
const WS_BASE = `ws://${location.hostname}:3001/ws/p2` // ws ...?proto=tcp|udp

export default function Problem2() {
  // ---- state ----
  const [pulseConnect, setPulseConnect] = useState(true);   // 최초에 연결하기 버튼이 깜빡
  const [pulsePlay, setPulsePlay] = useState(false);        // 연결 클릭 후 Play Flow가 깜빡

  const [proto, setProto] = useState<Proto>("tcp")
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [status, setStatus] = useState<"closed" | "connecting" | "open" | "error">("closed")

  const [text, setText] = useState("ping")
  const [simulateAsync, setSimulateAsync] = useState(true) // Async 기본 ON
  const [delay, setDelay] = useState(3000)                // 3s 기본 지연
  const [burst, setBurst] = useState(3)
  const [autoId, setAutoId] = useState(1)

  const [rows, setRows] = useState<MsgRow[]>([])
  const inflight = useMemo(() => rows.filter(r => !r.tRecv).length, [rows])

  const stats = useMemo(() => {
    const rtt = rows.filter(r => r.tRecv && r.tSend).map(r => Math.round(r.tRecv! - r.tSend))
    const avg = rtt.length ? Math.round(rtt.reduce((a, b) => a + b, 0) / rtt.length) : 0
    const max = rtt.length ? Math.max(...rtt) : 0
    return { avg, max, count: rtt.length }
  }, [rows])

  const chart = useMemo(
    () => rows
      .filter(r => r.tRecv)
      .slice(0, 200)
      .reverse()
      .slice(-20)
      .map(r => ({ name: `#${r.id}`, rtt: Math.round((r.tRecv! - r.tSend)) })),
    [rows]
  )

  const currentWsUrl = `${WS_BASE}?proto=${proto}`

  // ---- Flow Timeline state ----
  const [flowEvents, setFlowEvents] = useState<FlowEvent[]>([])
  const [flowStart, setFlowStart] = useState<number | null>(null)

  // ---- connect ----
  const connect = () => {
    if (ws || status === "connecting") return
    setStatus("connecting")
    const sock = new WebSocket(currentWsUrl)
    sock.onopen = () => setStatus("open")
    sock.onerror = () => setStatus("error")
    sock.onclose = () => { setStatus("closed"); setWs(null) }
    sock.onmessage = (evt) => {
      try {
        const data = JSON.parse(String(evt.data)) as { type: string; id?: number; text?: string; t: number }
        if (!("id" in data) || typeof data.id !== "number") return

        // 메시지 테이블 업데이트
        setRows(prev => {
          const idx = prev.findIndex(r => r.id === data.id)
          if (idx === -1) {
            return [{ id: data.id, text: data.text ?? "", delayMs: 0, tSend: performance.now(), tRecv: data.t, rText: data.text ?? "" }, ...prev].slice(0, 200)
          }
          const copy = [...prev]
          copy[idx] = { ...copy[idx], tRecv: data.t, rText: data.text ?? copy[idx].rText }
          return copy
        })

        // Flow 타임라인: 서버 응답 이벤트 (요구한 한국어 설명 포함)
        let explain = ""
        if (data.id === 1) explain = " — 첫번째 ping 응답 (동기·3초 지연)"
        else if (data.id === 2) explain = " — 두번째 ping 응답 (비동기·3초 지연)"
        else if (data.id === 3) explain = " — 세번째 foobar 응답 (비동기·지연 없음)"

        setFlowEvents(prev => [...prev, {
          t: performance.now(),
          who: "server",
          id: data.id,
          text: data.text === "pong"
            ? `server responded with "[${data.id}] pong"${explain}`
            : `server responded with "[${data.id}] ${data.text}"${explain}`
        }])
      } catch { /* ignore */ }
    }
    setWs(sock)
  }
  const disconnect = () => { ws?.close(); setWs(null); setStatus("closed") }

  useEffect(() => { if (ws) disconnect() /* proto 변경시 재연결 */ }, [proto])

  // ---- send ----
  const sendOne = (payload: { id: number; text: string; delayMs: number }) => {
    if (!ws || status !== "open") return
    const now = performance.now()
    const msg = { id: payload.id, text: payload.text, delayMs: payload.delayMs }
    ws.send(JSON.stringify(msg))
    setRows(prev => [{ id: payload.id, text: payload.text, delayMs: payload.delayMs, tSend: now }, ...prev].slice(0, 200))

    // Flow 타임라인: 클라이언트 전송 이벤트 (요구한 한국어 설명 포함)
    let explain = ""
    if (payload.id === 1) explain = " — 첫번째 클라이언트가 ping 보냄 (동기·3초 지연)"
    else if (payload.id === 2) explain = " — 두번째 클라이언트가 ping 보냄 (비동기·3초 지연)"
    else if (payload.id === 3) explain = " — 세번째 클라이언트가 foobar 보냄 (비동기·지연 없음·바로 응답)"

    setFlowEvents(prev => [...prev, {
      t: performance.now(),
      who: "client",
      id: payload.id,
      text: `client sent "${payload.text}" with id [${payload.id}]${explain}`
    }])
  }

  const effectiveDelay = simulateAsync ? Math.max(0, delay) : 0 // Sync=0, Async=delay

  const quickSync = () => {
    const base = autoId
    ;[0, 1, 2].forEach(i => sendOne({ id: base + i, text: i < 2 ? "ping" : "foobar", delayMs: 0 }))
    setAutoId(base + 3)
  }
  const quickAsync = () => {
    const base = autoId
    ;[0, 1, 2].forEach(i => sendOne({ id: base + i, text: i < 2 ? "ping" : "foobar", delayMs: 3000 }))
    setAutoId(base + 3)
  }
  const burstSend = () => {
    const base = autoId
    for (let i = 0; i < burst; i++) {
      const id = base + i
      sendOne({ id, text, delayMs: effectiveDelay })
    }
    setAutoId(base + burst)
  }

  // ---- Flow 시퀀스: 요구한 시나리오로 실행 ----
  const playFlow = async () => {
    if (status !== "open") connect()
    // 타임라인 초기화
    setFlowEvents([])
    const start = performance.now()
    setFlowStart(start)

    // 시나리오: [1] ping 3s(Sync), [2] ping 3s(Async), [3] foobar 0s(Async)
    const base = 1
    const send = (id: number, txt: string, d: number) => sendOne({ id, text: txt, delayMs: d })

    // 응답을 기다리지 않고 연속 전송
    send(base + 0, "ping", 3000)   // 동기처럼 3초 지연
    send(base + 1, "ping", 3000)   // 비동기 3초 지연
    send(base + 2, "foobar", 0)    // 비동기 지연 없음 (즉시 응답)

    setAutoId(base + 3)
  }

  useEffect(() => () => disconnect(), [])

  // ---- UI helpers ----
  const statusTone =
    status === "open" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "connecting" ? "bg-amber-50 text-amber-700 border-amber-200"
    : status === "error" ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-slate-50 text-slate-600 border-slate-200"

  // Flow 타임라인용 상대 시간(s)
  const rel = (t: number) => (flowStart ? ((t - flowStart) / 1000).toFixed(1) : "0.0")

  return (
    <div className="min-h-screen bg-slate-50">
      {/* header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-screen-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-5" style={{ color: PRIMARY }} />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Data Analytics</h1>
          </div>
          {/* header 우측 버튼 영역 */}
          <div className="flex items-center gap-3">
            <div className={cn("rounded-md border px-2 py-1 text-xs font-medium", statusTone)}>
              {status === "open" ? "연결됨 (Connected)" :
              status === "connecting" ? "연결 중..." :
              status === "error" ? "에러 (Error)" : "대기 (Disconnected)"}
            </div>

            {status !== "open" ? (
              // 🔔 연결하기 버튼: 처음엔 깜빡, 클릭하면 Play Flow로 깜빡 바통터치
              <div className="relative">
                <Button
                  onClick={() => { setPulseConnect(false); setPulsePlay(true); connect(); }}
                  className={cn("gap-1 text-white", pulseConnect && "animate-pulse")}
                  style={{ backgroundColor: PRIMARY }}
                >
                  <LinkIcon className="size-4" /> 연결하기
                </Button>
                {pulseConnect && (
                  <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
                )}
              </div>
            ) : (
              <Button variant="destructive" onClick={disconnect} className="gap-1">
                <Link2Off className="size-4" /> 끊기
              </Button>
            )}
          </div>

        </div>
      </header>

      {/* layout */}
      <div className="mx-auto max-w-screen-2xl px-4 lg:px-6 py-6 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
        {/* sidebar */}
        <aside className="rounded-xl overflow-hidden border bg-white lg:sticky lg:top-[56px] lg:h-[calc(100vh-56px)]">
          <div className="p-5 text-white" style={{ backgroundColor: PRIMARY }}>
            <div className="text-xl font-bold tracking-wide">우도연 데이터 랩</div>
          </div>
          <nav className="p-2 space-y-[2px] overflow-auto h-[calc(100%-76px)]">
            <SidebarLink to="/" label="홈: 웹사이트 전체 레이아웃" />
            <SidebarLink to="/1" label="문제 1: CSV 파일 분석" />
            <SidebarLink to="/2" label="문제 2: Ping-Pong 클라이언트-서버 프로그램" active />
            <SidebarLink to="/3" label="문제 3: DB 연결 및 쿼리 실행" />
            <SidebarLink to="/4" label="문제 4: 기온과 습도 차트 구현 예시" />
            <SidebarLink to="/5" label="문제 5: 랜덤 응답 서버 호출 및 카운트" />
            <SidebarLink to="/6" label="문제 6: 탑 레이저 신호 수신" />
            <SidebarLink to="/7" label="문제 7: 가장 긴 유효한 괄호 부분" />
            <SidebarLink to="/8" label="조세퍼스 순열" />
            <SidebarLink to="/finish" label="마무리: 코딩테스트 웹사이트 디자인 요약" />
          </nav>

        </aside>

        {/* main */}
        <main className="flex flex-col gap-6">
          {/* title + rule */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: PRIMARY }}>
              문제 2: Ping → Pong
            </h2>
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <Info className="size-4" />
              <span>ping 은 pong, 나머지는 echo. 지연(Delay)로 Async 흐름 확인.</span>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Wifi className="size-5" />} label="상태 (Status)" value={
              status === "open" ? "Connected" : status === "connecting" ? "Connecting" : status === "error" ? "Error" : "Disconnected"
            } tone={status}/>
            <StatCard icon={<Rocket className="size-5" />} label="In-flight" value={`${inflight}`} />
            <StatCard icon={<BarChart3 className="size-5" />} label="RTT Avg" value={`${stats.avg} ms`} />
            <StatCard icon={<BarChart3 className="size-5" />} label="RTT Max" value={`${stats.max} ms`} />
          </div>

          {/* Flow 시뮬레이터 (설명 반영) */}
          <Card className="border-2 border-[rgba(0,51,153,0.15)]">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold" style={{ color: PRIMARY }}>
                  비동기 요청/응답 Flow (설명 반영)
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">[1] ping 3s(Sync), [2] ping 3s(Async), [3] foobar 0s(Async)</span>

                  {/* 🔔 Play Flow: 연결하기 클릭 후 깜빡, 실행하면 멈춤 */}
                  <div className="relative">
                    <Button
                      onClick={() => { setPulsePlay(false); playFlow(); }}
                      className={cn("gap-1", pulsePlay && "animate-pulse")}
                      variant="outline"
                    >
                      <Play className="size-4" /> Play Flow
                    </Button>
                    {pulsePlay && (
                      <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
                    )}
                  </div>

                  {/* ⏭ 문제 3로 이동 (세련된 미니 버튼) */}
                  <Link to="/3" title="문제 3로 이동">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 gap-1 rounded-full border-slate-300 text-slate-600 
                                hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors"
                      style={{ ["--primary" as any]: PRIMARY }}
                    >
                      <span className="hidden sm:inline">문제 3</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>

              </div>

              {/* 2열 타임라인: Client / Server */}
              <div className="grid grid-cols-[1fr_16px_1fr] gap-3 mt-3">
                <div className="text-sm font-semibold text-slate-700">클라이언트 (Client)</div>
                <div />
                <div className="text-sm font-semibold text-slate-700">서버 (Server)</div>

                <div className="col-span-3 h-[1px] bg-slate-200" />

                {/* 이벤트 목록(시간순) */}
                <div className="space-y-2">
                  {flowEvents.filter(e => e.who === "client").map((e, i) => (
                    <FlowBubble key={`c-${i}`} who="client" time={`${rel(e.t)}s`} text={e.text} />
                  ))}
                  {flowEvents.filter(e => e.who === "client").length === 0 && (
                    <div className="text-xs text-slate-500">
                      Play Flow를 누르면 왼쪽에 전송 로그가 나타납니다.
                    </div>
                  )}
                </div>

                {/* 중앙 세로선 */}
                <div className="flex justify-center">
                  <div className="w-[2px] bg-slate-200 rounded" />
                </div>

                <div className="space-y-2">
                  {flowEvents.filter(e => e.who === "server").map((e, i) => (
                    <FlowBubble key={`s-${i}`} who="server" time={`${rel(e.t)}s`} text={e.text} />
                  ))}
                  {flowEvents.filter(e => e.who === "server").length === 0 && (
                    <div className="text-xs text-slate-500">
                      응답이 이곳에 표시됩니다. [3] foobar는 지연 없이 먼저 도착합니다.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3-cols: left controls / center charts / right mode+proto+console */}
          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)_420px]">
            {/* left: controls */}
            <Card className="border-slate-200">
              <CardContent className="space-y-6 text-sm pt-6">
                <section className="space-y-2">
                  <Label className="text-xs text-slate-500">WebSocket 주소</Label>
                  <div className="text-[13px] px-2 py-1 rounded bg-slate-100 border">{currentWsUrl}</div>
                </section>

                <section className="space-y-3">
                  <Label className="text-xs text-slate-500">메시지 보내기</Label>
                  <div className="flex items-center gap-2">
                    <Input className="w-56" value={text} onChange={e => setText(e.target.value)} />
                    <Button
                      size="sm"
                      onClick={() => sendOne({ id: autoId, text, delayMs: simulateAsync ? delay : 0 })}
                      className="gap-1 text-white"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      <Send className="size-4" /> 단건 보내기
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Switch id="async" checked={simulateAsync} onCheckedChange={v => setSimulateAsync(!!v)} />
                    <Label htmlFor="async">지연 사용 (Async)</Label>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-500">지연 (Delay, ms)</Label>
                      <span className="text-xs text-slate-600">{simulateAsync ? `${delay} ms` : "0 ms (Sync)"}</span>
                    </div>
                    <Slider value={[delay]} min={0} max={5000} step={100} onValueChange={v => setDelay(v[0] ?? 0)} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-500">한 번에 보낼 개수 (Burst)</Label>
                      <span className="text-xs text-slate-600">{burst} 개</span>
                    </div>
                    <Slider value={[burst]} min={1} max={10} step={1} onValueChange={v => setBurst(v[0] ?? 1)} />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" onClick={burstSend} className="gap-1">
                      <Rocket className="size-4" /> Burst
                    </Button>
                    <Button variant="outline" onClick={quickSync} className="gap-1">
                      <BadgeCheck className="size-4" /> Sync
                    </Button>
                    <Button variant="outline" onClick={quickAsync} className="gap-1">
                      <Timer className="size-4" /> Async 3s
                    </Button>
                  </div>

                  <section className="space-y-1 pt-2">
                    <Label className="text-xs text-slate-500">현재 상태</Label>
                    <Diag ok={status === "open"} label={`연결: ${status}`} />
                    <Diag ok={true} label={`In-flight: ${inflight}`} />
                    <Diag ok={stats.count > 0} label={`RTT Avg/Max: ${stats.avg}/${stats.max} ms (n=${stats.count})`} />
                  </section>
                </section>
              </CardContent>
            </Card>

            {/* center: chart + table */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="pt-6 h-[360px]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: PRIMARY }}>왕복 시간 (RTT, 최근 20건)</p>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ left: 8, right: 16, top: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis unit="ms" />
                      <Tooltip />
                      <Bar dataKey="rtt" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: PRIMARY }}>메시지 로그 (최근부터)</p>
                    <span className="text-xs text-slate-500">ping → <b className="text-emerald-600">pong</b>, 그 외는 echo</span>
                  </div>
                  <div className="max-h-[420px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 sticky top-0 z-10">
                        <tr>
                          <Th className="w-20">id</Th>
                          <Th className="w-28">보냄 (Send)</Th>
                          <Th className="w-28">받음 (Recv)</Th>
                          <Th className="w-28">지연 (ms)</Th>
                          <Th className="w-28 text-right">RTT (ms)</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={r.id} className={cn("border-t", i % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                            <Td>#{r.id}</Td>
                            <Td className="font-medium">{r.text}</Td>
                            <Td className={cn("font-medium", r.rText === "pong" ? "text-emerald-600" : "text-slate-700")}>
                              {r.rText ?? "…"}
                            </Td>
                            <Td>{r.delayMs}</Td>
                            <Td className="text-right">{r.tRecv ? Math.round(r.tRecv - r.tSend) : "…"}</Td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr><Td colSpan={5} className="text-slate-500 text-center py-10">아직 없습니다. 위에서 메시지를 보내 보세요.</Td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* right: mode / protocol / console */}
            <div className="grid gap-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-semibold mb-3" style={{ color: PRIMARY }}>요청/응답 모드</p>
                  <div className="grid grid-cols-2 gap-3">
                    <PresetCard
                      title="동기 (Sync)"
                      desc="보내고 기다림"
                      icon={<RefreshCw className="size-4" />}
                      active={!simulateAsync}
                      onClick={() => setSimulateAsync(false)}
                    />
                    <PresetCard
                      title="비동기 (Async)"
                      desc="순서 섞일 수 있음"
                      icon={<Signal className="size-4" />}
                      active={simulateAsync}
                      onClick={() => setSimulateAsync(true)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-semibold mb-3" style={{ color: PRIMARY }}>프로토콜 (Protocol)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <ProtoBtn label="TCP" icon={<Server className="size-4" />} active={proto === "tcp"} onClick={() => setProto("tcp")} />
                    <ProtoBtn label="UDP" icon={<MonitorSmartphone className="size-4" />} active={proto === "udp"} onClick={() => setProto("udp")} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-semibold mb-2" style={{ color: PRIMARY }}>콘솔 (Console)</p>
                  <div className="rounded-lg bg-[#0f1115] text-[#e9e9e9] font-mono text-[13px] p-3 h-[220px] overflow-auto">
                    <div className="opacity-80">[info] 실시간 통신 테스트</div>
                    <div className={cn(status === "open" ? "text-emerald-400" : status === "connecting" ? "text-amber-300" : status === "error" ? "text-rose-300" : "text-slate-300")}>
                      {status === "open" ? "[ok] 연결됨" : status === "connecting" ? "[wait] 연결 중..." : status === "error" ? "[err] 에러" : "[idle] 대기"}
                    </div>
                    <div className="opacity-80">[hint] ping → pong, 그 외는 echo</div>
                    <div className="opacity-80">[hint] Delay를 높이면 Async 상황을 쉽게 확인</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ---- small ui helpers ---- */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-semibold text-slate-700", className)}>{children}</th>
}
function Td({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td className={cn("px-3 py-2 text-sm align-top text-slate-700", className)} colSpan={colSpan}>{children}</td>
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
function Diag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn(
      "rounded-md border px-2 py-1.5 text-[13px]",
      ok ? "border-emerald-300 bg-emerald-50/60 text-emerald-700" : "border-rose-300 bg-rose-50/60 text-rose-700"
    )}>{label}</div>
  )
}
function PresetCard({ title, desc, icon, active, onClick }: {
  title: string; desc: string; icon: React.ReactNode; active?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-lg border p-3 transition",
        active ? "border-[color:var(--pc,#003399)] bg-[color:rgb(240,247,255)]" : "hover:border-[color:var(--pc,#003399)]"
      )}
      style={{ ["--pc" as any]: PRIMARY }}
    >
      <div className="flex items-center gap-2 font-semibold" style={{ color: PRIMARY }}>
        {icon}{title}
      </div>
      <div className="text-xs text-slate-600 mt-1">{desc}</div>
    </button>
  )
}
function ProtoBtn({ label, icon, active, onClick }: {
  label: string; icon: React.ReactNode; active?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm",
        active ? "bg-[color:rgb(240,247,255)] border-[color:var(--pc,#003399)] text-[color:var(--pc,#003399)]" : "bg-slate-50 hover:border-[color:var(--pc,#003399)]"
      )}
      style={{ ["--pc" as any]: PRIMARY }}
    >
      {icon}{label}
    </button>
  )
}

// Flow 타임라인 버블
function FlowBubble({ who, time, text }: { who: "client"|"server"; time: string; text: string }) {
  const isClient = who === "client"
  return (
    <div className={cn(
      "flex items-start gap-2",
      isClient ? "justify-start" : "justify-end"
    )}>
      {isClient && <span className="text-[11px] text-slate-500 mt-1 shrink-0">{time}</span>}
      <div className={cn(
        "max-w-full rounded-lg border px-2.5 py-1.5 text-[13px] leading-5",
        isClient ? "bg-white border-slate-200" : "bg-[rgb(240,247,255)] border-[color:var(--pc,#003399)]"
      )} style={{ ["--pc" as any]: PRIMARY }}>
        {text}
      </div>
      {!isClient && <span className="text-[11px] text-slate-500 mt-1 shrink-0">{time}</span>}
    </div>
  )
}

function StatCard({
  icon, label, value, tone = "closed",
}: { icon: React.ReactNode; label: string; value: string; tone?: "closed" | "connecting" | "open" | "error" }) {
  const toneClass =
    tone === "open" ? "bg-emerald-50 border-emerald-200"
    : tone === "connecting" ? "bg-amber-50 border-amber-200"
    : tone === "error" ? "bg-rose-50 border-rose-200"
    : "bg-white border-slate-200"
  return (
    <div className={cn("rounded-xl border p-3 flex items-center gap-3", toneClass)}>
      <div className="shrink-0 rounded-lg border bg-white/70 p-2" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-semibold text-slate-900 truncate">{value}</div>
      </div>
    </div>
  )
}
