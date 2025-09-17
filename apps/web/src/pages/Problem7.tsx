// apps/web/src/pages/Problem7.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom"; // ✅ 사이드바 네비용
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Sparkles, Play, Download, Wand2, ArrowRight } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? ""; // '' => 같은 오리진 /api
const PRIMARY = "#003399"; // ✅ 사이드바/포인트 색 (Problem5와 통일)

type Pair = { open: number; close: number };
type SolveResp = {
  ok: boolean;
  maxLen: number;
  best: [number, number] | null; // inclusive
  pairs: Pair[];
  valid: boolean[];
};

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON (HTTP ${res.status}) :: ${text.slice(0, 200)}...`);
  }
}

export default function Problem7() {
  // 입력
  const [raw, setRaw] = useState<string>(")()()("); // 예시 기본값

  // 옵션
  const [showOnlyBest, setShowOnlyBest] = useState(false);
  const [animate, setAnimate] = useState(true);
  const [speed, setSpeed] = useState(50);

  // 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 결과
  const [maxLen, setMaxLen] = useState(0);
  const [best, setBest] = useState<[number, number] | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [valid, setValid] = useState<boolean[]>([]);

  // 애니메이션 커서
  const [cursor, setCursor] = useState(0);

  // 실행 버튼 깜빡임 제어: 처음엔 ON, 실행 누르면 OFF
  const [shouldBlinkRun, setShouldBlinkRun] = useState(true);

  const s = raw;
  const n = s.length;

  const containerRef = useRef<HTMLDivElement>(null);

  const bestSpan = useMemo(() => {
    if (!best) return null;
    const [a, b] = best;
    return { start: a, end: b };
  }, [best]);

  const visiblePairs = useMemo(() => {
    if (!bestSpan || !showOnlyBest) return pairs;
    return pairs.filter((p) => p.open >= bestSpan.start && p.close <= bestSpan.end);
  }, [pairs, bestSpan, showOnlyBest]);

  // 실행
  async function run() {
    setError(null);
    setLoading(true);
    setCursor(0);
    setShouldBlinkRun(false); // 실행 클릭 시 깜빡임 OFF
    try {
      const res = await fetch(`${API_BASE}/api/p7/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s }),
      });
      const json = (await safeJson(res)) as SolveResp | null;
      if (!res.ok) throw new Error(json?.["error"] ?? `HTTP ${res.status}`);
      if (!json?.ok) throw new Error("UNEXPECTED_RESPONSE");

      setMaxLen(json.maxLen);
      setBest(json.best);
      setPairs(json.pairs);
      setValid(json.valid);
      setCursor(animate ? 0 : json.pairs.length);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // 랜덤
  async function randomize() {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/p7/random?len=14&pOpen=0.5`);
      const json = await safeJson(res);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!json?.ok) throw new Error("RANDOM_ERROR");
      setRaw(String(json.s));
      // 필요 시 깜빡임을 다시 켜고 싶다면 아래 주석 해제
      // setShouldBlinkRun(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // CSV
  function downloadCSV() {
    const header = "index,char,valid\n";
    const body = Array.from({ length: n }, (_, i) => `${i},${s[i]},${valid[i] ? 1 : 0}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "problem7-result.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // 페어 애니메이션
  useEffect(() => {
    if (!animate || visiblePairs.length === 0) return;
    let raf = 0;
    let t0 = performance.now();
    const duration = Math.max(200, 1200 - speed * 10);

    const tick = (t: number) => {
      const dt = t - t0;
      if (dt > duration) {
        setCursor((c) => {
          const n = Math.min(c + 1, visiblePairs.length);
          if (n < visiblePairs.length) {
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
  }, [animate, visiblePairs, speed]);

  // 화면에 그릴 페어 (애니메이션 시 커서까지만)
  const drawnPairs = useMemo(() => {
    return animate ? visiblePairs.slice(0, cursor) : visiblePairs;
  }, [animate, visiblePairs, cursor]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-indigo-600" />
            <h1 className="text-xl md:text-2xl font-bold">Data Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={randomize} className="gap-1">
              <Wand2 className="size-4" /> 랜덤
            </Button>

            {!loading ? (
              <div className="relative">
                <Button
                  onClick={run}
                  disabled={!/^[()]*$/.test(s)}
                  className={cn("gap-1", shouldBlinkRun && "animate-pulse")}
                >
                  <Play className="size-4" /> 실행
                </Button>
                {shouldBlinkRun && (
                  <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
                )}
              </div>
            ) : (
              <Button disabled className="gap-1">
                <Play className="size-4" /> 실행중…
              </Button>
            )}

            <Button variant="outline" onClick={downloadCSV} disabled={n === 0} className="gap-1">
              <Download className="size-4" /> CSV
            </Button>
          </div>
        </div>
      </header>

      {/* ✅ 사이드바 + 본문 */}
      <div className="mx-auto max-w-screen-xl px-4 lg:px-5 py-5 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
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
            <SidebarLink to="/7" label="문제 7: 가장 긴 유효 괄호" active />
            <SidebarLink to="/8" label="문제 8: 조세퍼스 순열" />
            <SidebarLink to="/finish" label="마무리: 디자인 요약" />
          </nav>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-5">
          {/* 제목 + 문제 8 이동 버튼 */}
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-extrabold" style={{ color: PRIMARY }}>
              문제 7: 가장 긴 올바른 괄호
            </h2>

            <Link to="/8" title="문제 8로 이동">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 gap-1 rounded-full border-slate-300 text-slate-600
                           hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors"
                style={{ ["--primary" as any]: PRIMARY }}
              >
                <span className="hidden sm:inline">문제 8</span>
                <ArrowRight className="size-5" />
              </Button>
            </Link>
          </div>

          <section className="mx-auto max-w-7xl px-0 py-0 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_360px] gap-6">
            {/* left: 입력/옵션 */}
            <Card>
              <CardHeader>
                <CardTitle>입력 & 옵션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <section className="space-y-2">
                  <Label>괄호 문자열</Label>
                  <Input
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder="예) )()()("
                  />
                  <p className="text-xs text-slate-500">‘(’와 ‘)’만 입력하세요. 예: <code>)()()(</code> → 결과 4</p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>최장 구간만 표시</Label>
                    <Switch checked={showOnlyBest} onCheckedChange={(v) => setShowOnlyBest(!!v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>애니메이션</Label>
                    <Switch checked={animate} onCheckedChange={(v) => setAnimate(!!v)} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">속도</Label>
                    <Slider value={[speed]} min={0} max={100} step={1} onValueChange={(v) => setSpeed(v[0] ?? 50)} />
                  </div>
                </section>

                {error && (
                  <div className="rounded-md border border-rose-300 bg-rose-50/80 p-2 text-rose-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="text-xs text-slate-500">
                  길이 {n} · 유효문자 {/^[()]*$/.test(s) ? "OK" : "X"}
                </div>
              </CardContent>
            </Card>

            {/* center: 시각화 */}
            <Card>
              <CardHeader>
                <CardTitle>문자열 프리뷰 & 아치(페어) 시각화</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={containerRef}
                  className="relative w-full h-[320px] border rounded-lg bg-white/60 overflow-hidden"
                >
                  <StringRow s={s} best={best} valid={valid} />
                  <PairArcs s={s} pairs={drawnPairs} best={best} />
                </div>

                {/* 인덱스/결과 요약 */}
                <table className="mt-4 w-full text-sm border rounded overflow-hidden">
                  <tbody>
                    <tr className="bg-slate-100 border-b">
                      {Array.from({ length: n }, (_, i) => (
                        <td key={i} className="px-1 py-1 text-center font-medium text-slate-700">{i}</td>
                      ))}
                    </tr>
                    <tr>
                      {Array.from({ length: n }, (_, i) => (
                        <td key={i} className="px-1 py-1 text-center">{s[i]}</td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50">
                      {Array.from({ length: n }, (_, i) => (
                        <td
                          key={i}
                          className={cn(
                            "px-1 py-1 text-center",
                            valid[i] ? "text-emerald-700 font-semibold" : "text-slate-400"
                          )}
                        >
                          {valid[i] ? "✓" : "-"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* right: 결과/설명 */}
            <Card>
              <CardHeader>
                <CardTitle>결과 & 설명</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="rounded-md border p-3 bg-slate-50">
                  <div className="text-lg font-bold">최장 길이: {maxLen}</div>
                  {best ? (
                    <div className="mt-1">
                      구간: [{best[0]} ~ {best[1]}] · 부분 문자열:{" "}
                      <code className="px-1 rounded bg-white border">{s.slice(best[0], best[1] + 1)}</code>
                    </div>
                  ) : (
                    <div className="mt-1">유효한 괄호가 없습니다.</div>
                  )}
                </div>
                <p className="text-slate-700">
                  스택과 센티널을 이용해 O(N) 시간에 해결합니다.
                  ‘)’에서 스택을 비우면 현재 인덱스를 센티널로 저장하고,
                  pop 이후 스택이 비었으면 <code>i - lastInvalid</code>,
                  아니면 <code>i - stackTop</code>이 현재 유효 길이가 됩니다.
                </p>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ------------ 문자열 한 줄 + 최장구간 하이라이트 ------------ */
function StringRow({ s, best, valid }: { s: string; best: [number, number] | null; valid: boolean[] }) {
  const n = s.length;
  return (
    <div className="absolute inset-x-0 bottom-4">
      <div className="flex items-end justify-center gap-2 select-none">
        {Array.from({ length: n }, (_, i) => {
          const inBest = best && i >= best[0] && i <= best[1];
          const ok = valid[i];
          return (
            <div key={i} className="relative">
              {inBest && <div className="absolute -inset-1 rounded bg-amber-200/70 -z-10" />}
              <div
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center border text-sm",
                  ok
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
                )}
                title={`index ${i}`}
              >
                {s[i] ?? ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------ 페어 아치(Bezier) ------------ */
function PairArcs({ s, pairs, best }: { s: string; pairs: Pair[]; best: [number, number] | null }) {
  const n = s.length;
  if (n === 0 || pairs.length === 0) return null;

  const W = Math.max(320, n * 28 + 32);
  const H = 220;
  const padX = 24;
  const step = (W - padX * 2) / Math.max(1, n - 1);
  const yBase = 170;

  const color = (k: number) =>
    ["#6366F1", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#0EA5E9"][k % 7];

  return (
    <svg className="absolute inset-x-0 top-1" width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <filter id="p7shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.18" />
        </filter>
      </defs>
      {pairs.map((p, i) => {
        const x1 = padX + p.open * step;
        const x2 = padX + p.close * step;
        const span = p.close - p.open;
        const height = Math.min(120, 20 + span * 10);
        const y1 = yBase;
        the: // (no-op label to avoid accidental TSX parsing issues)
        0;
        const y2 = yBase;
        const c1x = x1;
        const c1y = yBase - height;
        const c2x = x2;
        const c2y = yBase - height;

        const inBest = best && p.open >= best[0] && p.close <= best[1];
        const stroke = inBest ? color(i) : "#CBD5E1"; // slate-300
        const width = inBest ? 2.8 : 1.6;
        const opacity = inBest ? 0.95 : 0.55;

        return (
          <path
            key={`${p.open}-${p.close}-${i}`}
            d={`M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            opacity={opacity}
            filter="url(#p7shadow)"
          />
        );
      })}
    </svg>
  );
}

/* ---- 사이드바 링크 컴포넌트 ---- */
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
