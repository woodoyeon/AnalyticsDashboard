// apps/web/src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Activity, Database, Gauge, LineChart, Network, Layers,
  Braces, CircleEllipsis, ArrowRight, MessageSquare
} from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import { registerAction } from "@/lib/chatControl";

const PRIMARY = "#003399";
const HEADER_H = 64;

type Item = {
  to: string;
  label: string;
  icon: LucideIcon;
  meta?: { duration?: string; level?: number; tags?: string[] };
};

const items: Item[] = [
  { to: "/1", label: "CSV 분석하기", icon: Activity,  meta: { duration: "10분", level: 2, tags: ["차트","통계"] } },
  { to: "/2", label: "Ping-Pong 통신 테스트", icon: Network, meta: { duration: "5분",  level: 1, tags: ["SSE","WS"] } },
  { to: "/3", label: "DB 연결·쿼리 실행", icon: Database, meta: { duration: "8분",  level: 2, tags: ["SQL","페이징"] } },
  { to: "/4", label: "기온·습도 라인차트", icon: LineChart, meta: { duration: "7분",  level: 1, tags: ["SVG","Line"] } },
  { to: "/5", label: "랜덤 응답 카운트", icon: Gauge,    meta: { duration: "6분",  level: 1, tags: ["SSE"] } },
  { to: "/6", label: "Top Laser 신호 시각화", icon: Layers, meta: { duration: "12분", level: 3, tags: ["스트림","SVG"] } },
  { to: "/7", label: "가장 긴 유효 괄호", icon: Braces,  meta: { duration: "10분", level: 2, tags: ["스택"] } },
  { to: "/8", label: "조세퍼스 순열", icon: CircleEllipsis, meta: { duration: "10분", level: 2, tags: ["큐","시뮬"] } },
];

export default function Home() {
  const [showChat, setShowChat] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    return registerAction("start", () => nav("/1"));
  }, [nav]);

  const filtered = useMemo(() => items, []); // 검색 삭제했으므로 그대로 반환

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b" style={{ height: HEADER_H }}>
        <div className="mx-auto max-w-screen-2xl h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-5" style={{ color: PRIMARY }} />
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Data Analytics</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/finish">
              <Button variant="outline" className="gap-1">디자인 요약 보기 <ArrowRight className="size-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 레이아웃 */}
      <div
        className="mx-auto max-w-screen-2xl px-4 sm:px-5 py-5 grid grid-cols-1 lg:grid-cols-[clamp(220px,22vw,260px)_minmax(0,1fr)] gap-5"
        style={{ minHeight: `calc(100svh - ${HEADER_H}px)` }}
      >
        {/* Sidebar */}
        <aside
          className="rounded-xl overflow-hidden border bg-white lg:sticky"
          style={{ top: HEADER_H, height: `calc(100svh - ${HEADER_H}px)` }}
        >
          <div className="p-5 text-white" style={{ backgroundColor: PRIMARY }}>
            <div className="text-xl font-bold tracking-wide">데이터 분석 홈</div>
          </div>
          <nav className="p-2 space-y-[2px] overflow-auto h-[calc(100%-76px)]">
            <SidebarLink to="/" label="홈: 웹사이트 전체 레이아웃" active />
            <SidebarLink to="/1" label="문제 1: CSV 파일 분석" />
            <SidebarLink to="/2" label="문제 2: Ping-Pong 프로그램" />
            <SidebarLink to="/3" label="문제 3: DB 연결 및 쿼리 실행" />
            <SidebarLink to="/4" label="문제 4: 기온·습도 차트" />
            <SidebarLink to="/5" label="문제 5: 랜덤 응답 카운트" />
            <SidebarLink to="/6" label="문제 6: Top Laser 신호" />
            <SidebarLink to="/7" label="문제 7: 가장 긴 유효 괄호" />
            <SidebarLink to="/8" label="문제 8: 조세퍼스 순열" />
            <SidebarLink to="/finish" label="마무리: 디자인 요약" />
          </nav>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-6">
          {/* Hero */}
          <section className="rounded-2xl border bg-white p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: PRIMARY }}>
                Dashboard 
              </h2>

              {/* 깜빡이는 '문제 시작하기' 버튼 */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Link to="/1" title="클릭하면 테스트를 시작합니다">
                    <Button className="gap-1 animate-pulse">
                      문제 시작하기 <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
                </div>

                {/* ✅ 챗 패널 토글 버튼 */}
                <Button
                  variant={showChat ? "default" : "secondary"}
                  onClick={() => setShowChat(v => !v)}
                  className="whitespace-nowrap"
                  title="프롬프트 챗 컨트롤 켜기/끄기"
                >
                  <MessageSquare className="size-4" />
                  {showChat ? "챗 패널 ON" : "챗 패널 OFF"}
                </Button>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              <strong>AI Chat Control</strong> 버튼으로 챗 패널을 켜거나 끌 수 있습니다.
              (예: <code className="px-1 rounded bg-slate-100">start</code> 로 바로 시작)
            </p>
          </section>

          {/* ✅ ChatPanel: Hero 섹션 바로 아래 */}
          {showChat && (
            <ChatPanel
              items={items.map(({ to, label }) => ({ to, label }))}
              brand={PRIMARY}
              headerTopPx={HEADER_H}
              dock="top"
            />
          )}

          {/* 문제 그리드 */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {filtered.map(({ to, label, icon: Icon, meta }) => (
              <Link key={to} to={to} className="group">
                <Card className="h-full transition hover:shadow-md hover:-translate-y-[1px]">
                  <CardHeader className="pb-1">
                    <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                      <Icon className="size-4 text-indigo-600" /> {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-[13px] text-slate-600">클릭해서 데모 페이지로 이동합니다.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {meta?.duration && <span className="rounded-full border px-2 py-[2px] text-[11px] text-slate-600">⏱ {meta.duration}</span>}
                      {typeof meta?.level === "number" && (
                        <span className="rounded-full border px-2 py-[2px] text-[11px] text-slate-600">
                          난이도 {"★".repeat(meta.level)}{"☆".repeat(Math.max(0, 4 - (meta.level ?? 0)))}
                        </span>
                      )}
                      {(meta?.tags ?? []).map(t => (
                        <span key={t} className="rounded-full border px-2 py-[2px] text-[11px] text-slate-600">{t}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ to, label, active = false }: { to: string; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "block w-full px-3 py-2 rounded-md text-sm transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        active ? "bg-[#003399]/10 text-[#003399] font-medium" : "text-slate-700 hover:bg-slate-100"
      )}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      {active && <span className="absolute left-0 top-0 h-full w-[3px] bg-[#003399] rounded-r" />}
      {label}
    </Link>
  );
}
