// apps/web/src/pages/Problem8.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Play, Square, RotateCcw, Gauge, Sparkles, Download, Info, Timer, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

/* -------------------- constants -------------------- */
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const PRIMARY = "#003399";

/* -------------------- types -------------------- */
type StepEvt = { removed: number; removedIndex: number; remaining: number[] };

/* =========================================================
   문제 8 · 조세퍼스 순열
   - 기능 로직은 기존과 동일
   - 레이아웃/시각 요소만 전면 리디자인
========================================================= */
export default function Problem8() {
  /* 입력/옵션 */
  const [N, setN] = useState(7);
  const [M, setM] = useState(3);
  const [useStream, setUseStream] = useState(true);
  const [speed, setSpeed] = useState(60); // 클수록 빠름
  const delayMs = useMemo(() => Math.max(20, 220 - speed * 2), [speed]);

  /* 상태 */
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [alive, setAlive] = useState<number[]>(Array.from({ length: 7 }, (_, i) => i + 1));
  const [lastOut, setLastOut] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // 시작 버튼 깜빡임(첫 클릭 시 해제)
  const [startHint, setStartHint] = useState(true);

  const total = N;

  /* -------------------- actions -------------------- */
  async function start() {
    reset(false);
    if (useStream) {
      const q = new URLSearchParams({ N: String(N), M: String(M), delayMs: String(delayMs) });
      const es = new EventSource(`${API_BASE}/api/p8/stream?${q.toString()}`);
      esRef.current = es;
      setRunning(true);

      es.addEventListener("hello", () => setAlive(Array.from({ length: N }, (_, i) => i + 1)));

      es.addEventListener("step", (evt) => {
        const data = JSON.parse((evt as MessageEvent).data) as StepEvt;
        setLastOut(data.removed);
        setOrder((o) => [...o, data.removed]);
        setAlive(data.remaining);
      });

      es.addEventListener("progress", (evt) => {
        const { completed } = JSON.parse((evt as MessageEvent).data) as { completed: number };
        setCompleted(completed);
      });

      es.addEventListener("done", (evt) => {
        const data = JSON.parse((evt as MessageEvent).data) as { order: number[] };
        setOrder(data.order);
        setCompleted(data.order.length);
        setRunning(false);
        es.close();
        esRef.current = null;
      });

      es.onerror = () => {
        setRunning(false);
        es.close();
        esRef.current = null;
      };
    } else {
      // 동기 계산
      const res = await fetch(`${API_BASE}/api/p8/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ N, M }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        alert(json?.error ?? "오류");
        return;
      }
      setAlive([]); // 결과만 표시
      setOrder(json.order as number[]);
      setCompleted(json.order.length);
    }
  }

  function handleStart() {
    if (startHint) setStartHint(false); // 첫 클릭 시 깜빡임 종료
    start();
  }

  function stop() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setRunning(false);
  }

  function reset(resetAlive = true) {
    stop();
    setCompleted(0);
    setOrder([]);
    if (resetAlive) setAlive(Array.from({ length: N }, (_, i) => i + 1));
    setLastOut(null);
  }

  /* -------------------- derived -------------------- */
  const chartData = useMemo(() => order.map((id, i) => ({ step: i + 1, id })), [order]);

  // 링 좌표 (원 크게, 레이블 안겹치도록)
  const nodes = useMemo(() => {
    const actors = new Set(alive);
    const all = Array.from({ length: total }, (_, i) => i + 1);

    const radius = total <= 12 ? 160 : total <= 24 ? 170 : 180;
    const centerX = 260;
    const centerY = 220;

    return all.map((id, i) => {
      const angle = (2 * Math.PI * i) / total - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const outIdx = order.indexOf(id);
      const isOut = outIdx >= 0;
      const isLast = id === lastOut;
      const aliveNow = actors.has(id);
      return { id, x, y, isOut, isLast, aliveNow, outIdx };
    });
  }, [alive, order, lastOut, total]);

  const nextIndex = useMemo(() => (completed < total ? completed + 1 : null), [completed, total]);
  const lastIndex = useMemo(() => (lastOut ? order.indexOf(lastOut) + 1 : null), [lastOut, order]);

  /* -------------------- export -------------------- */
  function downloadCSV() {
    const header = "step,id\n";
    const body = order.map((id, i) => `${i + 1},${id}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `josephus_${N}_${M}.csv`;
    a.click();
  }

  /* -------------------- effects -------------------- */
  useEffect(() => () => stop(), []);

  /* -------------------- render -------------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-screen-2xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5" style={{ color: PRIMARY }} />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Data Analytics</h1>
          </div>

          <div className="flex items-center gap-2">
            {!running ? (
              <div className="relative">
                <Button
                  onClick={handleStart}
                  className={cn("gap-1", startHint && "animate-pulse")}
                  title="시작"
                >
                  <Play className="size-4" /> 시작
                </Button>
                {startHint && (
                  <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
                )}
              </div>
            ) : (
              <Button variant="destructive" onClick={stop} className="gap-1">
                <Square className="size-4" /> 중단
              </Button>
            )}
            <Button variant="outline" onClick={() => reset()} className="gap-1">
              <RotateCcw className="size-4" /> 리셋
            </Button>
          </div>
        </div>
      </header>

      {/* Body with Sidebar */}
      <div className="mx-auto max-w-screen-2xl px-4 lg:px-5 py-5 grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)] gap-5">
        {/* Sidebar */}
        <aside className="rounded-xl overflow-hidden border bg-white lg:sticky lg:top-[56px] lg:h-[calc(100vh-56px)]">
          <div className="p-5 text-white" style={{ backgroundColor: PRIMARY }}>
            <div className="text-xl font-bold tracking-wide">우도연 데이터 랩</div>
            
          </div>
          <nav className="p-2 space-y-[2px] overflow-auto h-[calc(100%-76px)]">
            <SidebarLink to="/" label="홈: 웹사이트 전체 레이아웃" />
            <SidebarLink to="/1" label="문제 1: CSV 파일 분석" />
            <SidebarLink to="/2" label="문제 2: Ping-Pong 프로그램" />
            <SidebarLink to="/3" label="문제 3: DB 연결 및 쿼리 실행" />
            <SidebarLink to="/4" label="문제 4: 기온·습도 차트" />
            <SidebarLink to="/5" label="문제 5: 랜덤 응답 카운트" />
            <SidebarLink to="/6" label="문제 6: Top Laser 신호" />
            <SidebarLink to="/7" label="문제 7: 가장 긴 유효 괄호" />
            <SidebarLink to="/8" label="문제 8: 조세퍼스 순열" active />
            <SidebarLink to="/finish" label="마무리: 디자인 요약" />
          </nav>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-6">
          {/* Title + Finish button */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-3xl font-extrabold" style={{ color: PRIMARY }}>
              문제 8: 조세퍼스 순열 (N, M)
            </h2>

            <Link to="/finish" title="마무리로 이동">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 gap-1 rounded-full border-slate-300 text-slate-600
                           hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors"
                style={{ ["--primary" as any]: PRIMARY }}
              >
                <span className="hidden sm:inline">마무리</span>
                <ArrowRight className="size-5" />
              </Button>
            </Link>
          </div>

          {/* Explain */}
          <p className="text-sm text-slate-600 flex items-start gap-2">
            <Info className="size-4 mt-0.5 shrink-0" />
            원형으로 앉은 N명 중 M번째 사람을 차례로 제거하며, 제거된 순서를 출력합니다.
            예: (7,3) → {"<3, 6, 2, 7, 5, 1, 4>"}.
          </p>

          {/* 3-Column Workspace */}
          <section className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_380px] gap-6">
            {/* Left · Controls */}
            <Card className="xl:sticky xl:top-[64px]">
              <CardHeader>
                <CardTitle>입력 & 실행</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>N (사람 수, ≤ 2000)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="mt-1"
                      value={N}
                      onChange={(e) =>
                        setN(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))
                      }
                    />
                  </div>
                  <div>
                    <Label>M (제거 간격, 1 ≤ M ≤ N)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="mt-1"
                      value={M}
                      onChange={(e) =>
                        setM(Math.max(1, Math.min(N, Number(e.target.value) || 1)))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>시뮬레이션 모드 (SSE)</Label>
                    <div className="text-[12px] text-slate-500">
                      실시간 스트리밍 / 해제 시 한 번에 계산
                    </div>
                  </div>
                  <Switch checked={useStream} onCheckedChange={(v) => setUseStream(!!v)} />
                </div>

                {useStream && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">속도</Label>
                    <Slider
                      value={[speed]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(v) => setSpeed(v[0] ?? 60)}
                    />
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <Timer className="size-3" />
                      delay ≈ {delayMs} ms
                    </div>
                  </div>
                )}

                {/* Progress */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">진행률</Label>
                  <div className="h-2 rounded bg-slate-200 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.round((completed / total) * 100)}%`,
                        backgroundColor: PRIMARY,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[12px] text-slate-600">
                    <span>완료: {completed} / {total}</span>
                    <span>남은: {Math.max(0, total - completed)}</span>
                  </div>
                </div>

                {/* Sticky actions */}
                <div className="flex gap-2 pt-1">
                  {!running ? (
                    <div className="relative grow">
                      <Button
                        onClick={handleStart}
                        className={cn("gap-1 w-full", startHint && "animate-pulse")}
                      >
                        <Play className="size-4" /> 시작
                      </Button>
                      {startHint && (
                        <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
                      )}
                    </div>
                  ) : (
                    <Button variant="destructive" onClick={stop} className="gap-1 grow">
                      <Square className="size-4" /> 중단
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => reset()} className="gap-1">
                    <RotateCcw className="size-4" /> 리셋
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Center · Circle Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>원형 시뮬레이션</CardTitle>
              </CardHeader>
              <CardContent>
                {/* State badges */}
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <StatBadge label="마지막 제거" value={lastOut ?? "-"} />
                  <StatBadge label="마지막 index" value={lastIndex ?? "-"} />
                  <StatBadge label="다음 차례(step)" value={nextIndex ?? "-"} />
                </div>

                {/* Circle */}
                <div className="relative w-full h-[440px] border rounded-lg bg-white">
                  {/* ring guide */}
                  <div className="absolute inset-0 grid place-items-center pointer-events-none">
                    <div className="w-[360px] h-[360px] rounded-full border-2 border-dashed border-slate-300" />
                  </div>

                  {/* nodes */}
                  {nodes.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full border flex items-center justify-center text-sm select-none",
                        n.isLast
                          ? "bg-rose-500 text-white border-rose-600 shadow"
                          : n.aliveNow
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      )}
                      style={{ left: n.x, top: n.y }}
                      title={n.isOut ? `제거 순서 ${n.outIdx + 1}` : "생존"}
                    >
                      {n.id}
                    </div>
                  ))}
                </div>

                {/* Result preview */}
                <div className="mt-4">
                  <div className="text-sm font-semibold">결과 순열</div>
                  <div className="mt-1 rounded border bg-white p-2 text-sm whitespace-pre-wrap break-all">
                    {order.length ? `<${order.join(", ")}>` : "아직 없음"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right · Chart & Table */}
            <Card className="xl:sticky xl:top-[64px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>제거 순서</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={downloadCSV} disabled={!order.length}>
                  <Download className="size-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-white">
                  <div className="px-3 py-2 text-[13px] text-slate-600 border-b">
                    상위 20개 막대 차트
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.slice(0, 20)} margin={{ left: 8, right: 8, top: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="step" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="id" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border bg-white max-h-[320px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <Th className="w-24">step</Th>
                        <Th>id</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.map((id, i) => (
                        <tr key={`${id}-${i}`} className="border-t">
                          <Td>{i + 1}</Td>
                          <Td>{id}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

/* -------------------- small helpers -------------------- */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left text-sm font-semibold", className)}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 text-sm", className)}>{children}</td>;
}

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{String(value)}</span>
    </span>
  );
}

/* ---- 사이드바 링크 ---- */
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
  );
}
