// apps/web/src/pages/Problem6.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// icons
import { Activity, Play, RotateCcw, Download, Sparkles, ArrowRight } from "lucide-react";

/* =========================================================
   Constants & Utils
========================================================= */
const API_BASE = import.meta.env.VITE_API_BASE ?? ""; // '' -> same origin /api
const PRIMARY = "#003399";
const COLORS = ["#6366F1", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#0EA5E9", "#84CC16"] as const;

type Step =
  | { action: "start"; i: number }
  | { action: "pop"; poppedIndex: number }
  | { action: "push"; i: number }
  | { action: "recv"; i: number; receiver: number };

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON (HTTP ${res.status}) :: ${text.slice(0, 160)}...`);
  }
}

function parseHeights(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.trunc(n));
}

function scaleY(v: number, min: number, max: number, h: number) {
  if (max === min) return Math.max(8, Math.round(h * 0.12));
  const r = (v - min) / (max - min);
  return Math.max(8, Math.round(r * (h - 24)));
}

/* =========================================================
   Page
========================================================= */
export default function Problem6() {
  // ---- Input
  const [raw, setRaw] = useState("6 9 5 7 4");
  const heights = useMemo(() => parseHeights(raw), [raw]);

  // ---- Options
  const [animate, setAnimate] = useState(true);
  const [speed, setSpeed] = useState(50);

  // ---- Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Results
  const [receivers, setReceivers] = useState<number[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [cursor, setCursor] = useState(0);

  // ---- Derived
  const maxH = useMemo(() => (heights.length ? Math.max(...heights) : 0), [heights]);
  const minH = useMemo(() => (heights.length ? Math.min(...heights) : 0), [heights]);

  // ---- Refs
  const visRef = useRef<HTMLDivElement>(null);

  // ---- UI hint for "Run" button (blink until first click)
  const [runHint, setRunHint] = useState(true);

  /* -------------------- Actions -------------------- */
  const run = async () => {
    setError(null);
    setLoading(true);
    setReceivers([]);
    setSteps([]);
    setCursor(0);

    try {
      const res = await fetch(`${API_BASE}/api/p6/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heights, withSteps: true }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      if (!json?.ok) throw new Error("UNEXPECTED_RESPONSE");

      setReceivers(json.receivers as number[]);
      setSteps((json.steps ?? []) as Step[]);
      setCursor(animate ? 0 : (json.steps?.length ?? 0));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunClick = () => {
    if (runHint) setRunHint(false); // 첫 클릭 시 깜빡임 종료
    run();
  };

  const randomize = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/p6/random?count=10&min=1&max=100`);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!json?.ok) throw new Error("RANDOM_ERROR");
      setRaw(String(json.heights.join(" ")));
      // 입력이 바뀌면 다시 "실행" 유도하고 싶다면 아래 주석 해제
      // setRunHint(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const downloadCSV = () => {
    const header = "index,height,receiver\n";
    const body = heights.map((h, i) => `${i + 1},${h},${receivers[i] ?? 0}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "problem6-result.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* -------------------- Auto play -------------------- */
  useEffect(() => {
    if (!animate || steps.length === 0) return;
    let raf = 0;
    let t0 = performance.now();
    const duration = Math.max(240, 1200 - speed * 10);

    const tick = (t: number) => {
      if (t - t0 >= duration) {
        setCursor((c) => {
          const n = Math.min(c + 1, steps.length);
          if (n < steps.length) {
            t0 = performance.now();
            raf = requestAnimationFrame(tick);
          }
          return n;
        });
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, steps, speed]);

  /* -------------------- Partial receivers while animating -------------------- */
  const partialReceivers = useMemo(() => {
    if (!animate || steps.length === 0) return receivers;
    const r = Array<number>(heights.length).fill(0);
    let seen = 0;
    for (const s of steps) {
      if (s.action === "recv") {
        r[s.i] = s.receiver ?? 0;
        seen++;
      }
      if (seen >= cursor) break;
    }
    return r;
  }, [animate, steps, cursor, heights.length, receivers]);

  /* =========================================================
     UI
  ========================================================= */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b">
        <div className="mx-auto max-w-screen-xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-5" style={{ color: PRIMARY }} />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Data Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={randomize}><Sparkles className="size-4" /> 랜덤</Button>

            {/* 실행 버튼: 깜빡임 효과 (첫 클릭 시 중단) */}
            <div className="relative">
              <Button
                onClick={handleRunClick}
                disabled={heights.length === 0 || loading}
                className={cn("gap-1", runHint && "animate-pulse")}
                title="입력을 계산해서 시각화합니다"
              >
                <Play className="size-4" /> 실행
              </Button>
              {runHint && (
                <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
              )}
            </div>

            <Button variant="outline" onClick={downloadCSV} disabled={receivers.length === 0} className="gap-1">
              <Download className="size-4" /> CSV
            </Button>
          </div>
        </div>
      </header>

      {/* 2-Column: Sidebar + Main */}
      <div className="mx-auto max-w-screen-xl px-4 lg:px-5 py-5 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
        {/* Sidebar */}
        <aside className="rounded-xl overflow-hidden border bg-white lg:sticky lg:top-[56px] lg:h-[calc(100vh-56px)]">
          <div className="p-5 text-white" style={{ backgroundColor: PRIMARY }}>
            <div className="text-xl font-bold tracking-wide">우도연 데이터 랩</div>
          </div>
          <nav className="p-2 space-y-[2px] overflow-auto h-[calc(100%-76px)]">
            <SideLink to="/" label="홈: 전체 레이아웃" />
            <SideLink to="/1" label="문제 1: CSV 분석" />
            <SideLink to="/2" label="문제 2: Ping-Pong" />
            <SideLink to="/3" label="문제 3: DB 쿼리" />
            <SideLink to="/4" label="문제 4: 기온·습도" />
            <SideLink to="/5" label="문제 5: 랜덤 카운트" />
            <SideLink to="/6" label="문제 6: 탑-레이저" active />
            <SideLink to="/7" label="문제 7: 유효 괄호" />
            <SideLink to="/8" label="문제 8: 조세퍼스" />
            <SideLink to="/finish" label="마무리 요약" />
          </nav>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-5">
          {/* 제목 + 우측 이동 버튼 */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-3xl font-extrabold" style={{ color: PRIMARY }}>
              문제 6: 탑-레이저 (Monotonic Stack O(N))
            </h2>

            <Link to="/7" title="문제 7로 이동">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 gap-1 rounded-full border-slate-300 text-slate-600
                           hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors"
                style={{ ["--primary" as any]: PRIMARY }}
              >
                <span className="hidden sm:inline">문제 7</span>
                <ArrowRight className="size-5" />
              </Button>
            </Link>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_360px] gap-6">
            {/* Left: Input & Options */}
            <Card>
              <CardHeader><CardTitle>입력 & 옵션</CardTitle></CardHeader>
              <CardContent className="space-y-5 text-sm">
                <div className="space-y-2">
                  <Label>탑 높이 (공백/콤마 구분)</Label>
                  <Input
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder="예) 6 9 5 7 4"
                  />
                  <p className="text-xs text-slate-500">
                    예: <code>6 9 5 7 4</code> → 결과 <code>0 0 2 2 4</code>
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>애니메이션</Label>
                    <Switch checked={animate} onCheckedChange={(v) => setAnimate(!!v)} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">속도</Label>
                    <Slider value={[speed]} min={0} max={100} step={1} onValueChange={(v) => setSpeed(v[0] ?? 50)} />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-rose-300 bg-rose-50/80 p-2 text-rose-700 text-sm">{error}</div>
                )}

                <div className="rounded-md border p-2 text-[12px] text-slate-600 flex items-center gap-2">
                  <Activity className="size-4 text-indigo-600" />
                  길이 {heights.length} · 최소 {minH || "-"} · 최대 {maxH || "-"}
                </div>
              </CardContent>
            </Card>

            {/* Center: Visualization */}
            <Card>
              <CardHeader><CardTitle>시각화 (막대 + 신호 화살표)</CardTitle></CardHeader>
              <CardContent>
                <div ref={visRef} className="relative w-full h-[420px] border rounded-lg bg-white/60 overflow-hidden">
                  <Bars heights={heights} minH={minH} maxH={maxH} />
                  <Arrows heights={heights} receivers={partialReceivers} containerRef={visRef} colorScale={COLORS} />
                </div>

                {/* Indices / Heights / Result */}
                <table className="mt-4 w-full text-sm border rounded overflow-hidden">
                  <tbody>
                    <tr className="bg-slate-100 border-b">
                      {heights.map((_, i) => (
                        <td key={`idx-${i}`} className="px-2 py-1 text-center font-medium text-slate-700">
                          {i + 1}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      {heights.map((h, i) => (
                        <td key={`h-${i}`} className="px-2 py-1 text-center">
                          {h}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50">
                      {heights.map((_, i) => (
                        <td key={`r-${i}`} className="px-2 py-1 text-center text-indigo-700 font-semibold">
                          {receivers[i] ?? 0}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>

                {/* Step slider */}
                {steps.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-xs text-slate-500">진행(스텝)</Label>
                    <Slider
                      value={[cursor]}
                      min={0}
                      max={steps.length}
                      step={1}
                      onValueChange={(v) => setCursor(v[0] ?? 0)}
                      disabled={!animate}
                    />
                    <div className="text-xs text-slate-600 mt-1">step {cursor} / {steps.length}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Algorithm */}
            <Card>
              <CardHeader>
                <CardTitle>알고리즘 요약</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>모든 탑이 <b>왼쪽으로 레이저</b>를 발사. “자신보다 큰 첫 번째 탑”만 수신.</p>
                <p className="text-slate-700">단조감소 스택으로 O(N) 해결:</p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                  <li>왼→오 순회, 현재 높이보다 <b>작거나 같은</b> 스택 top은 모두 pop</li>
                  <li>pop이 끝난 뒤 스택 top이 남아있다면 top의 인덱스가 수신자</li>
                  <li>현재 인덱스를 push</li>
                </ol>
                <p className="text-xs text-slate-500">예: 6 9 5 7 4 → 수신: 0 0 2 2 4</p>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   Visualization: Bars
========================================================= */
function Bars({ heights, minH, maxH }: { heights: number[]; minH: number; maxH: number }) {
  return (
    <div
      className="absolute inset-0 grid"
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, heights.length)}, minmax(0,1fr))`,
        gap: "8px",
        padding: "16px",
      }}
    >
      {heights.map((h, i) => (
        <div key={i} className="flex items-end justify-center">
          <div
            className="w-8 rounded-t-lg shadow-sm"
            style={{
              height: scaleY(h, minH, maxH, 360),
              background: "linear-gradient(180deg, rgba(99,102,241,0.9), rgba(99,102,241,0.45))",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
            title={`${i + 1}번: ${h}`}
          />
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   Visualization: Arrows (SVG)
========================================================= */
function Arrows({
  heights,
  receivers,
  containerRef,
  colorScale,
}: {
  heights: number[];
  receivers: number[];
  containerRef: React.RefObject<HTMLDivElement>;
  colorScale: readonly string[];
}) {
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [containerRef]);

  if (box.w === 0 || heights.length === 0) return null;

  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);

  const gridGap = 8;
  const pad = 16;
  const column = (box.w - pad * 2 - gridGap * (heights.length - 1)) / Math.max(1, heights.length);
  const barWidth = 32; // must match Bars
  const colCenterDx = Math.max(column, barWidth) / 2;

  const xCenter = (i: number) => pad + i * (column + gridGap) + colCenterDx;
  const barTopY = (h: number) => box.h - pad - scaleY(h, minH, maxH, 360);

  const defs = (
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.18" />
      </filter>
      <marker id="arrowHead" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="url(#grad1)" />
      </marker>
    </defs>
  );

  const paths = heights.map((h, i) => {
    const r = receivers[i] ?? 0;
    if (!r) return null;
    const j = r - 1;
    const x1 = xCenter(i);
    const y1 = barTopY(h);
    const x2 = xCenter(j);
    const y2 = barTopY(heights[j]);

    const dx = Math.abs(x1 - x2);
    const dY = Math.max(6, Math.min(24, dx * 0.15));
    const c1x = x1 - dx * 0.35;
    const c1y = y1 - dY;
    const c2x = x2 + dx * 0.15;
    const c2y = y2 - dY;

    const color = colorScale[i % colorScale.length];

    return (
      <path
        key={i}
        d={`M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`}
        stroke={color}
        strokeWidth={2.5}
        fill="none"
        markerEnd="url(#arrowHead)"
        filter="url(#softShadow)"
        opacity={0.9}
      />
    );
  });

  return (
    <svg className="absolute inset-0">
      {defs}
      {paths}
    </svg>
  );
}

/* =========================================================
   Sidebar Link
========================================================= */
function SideLink({ to, label, active = false }: { to: string; label: string; active?: boolean }) {
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
