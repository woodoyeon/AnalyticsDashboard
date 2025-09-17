// apps/web/src/pages/Finish.tsx
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sparkles, CheckCircle2, LayoutGrid, ChartBar, Palette,
  Code2, ArrowLeft, ArrowRight, ListChecks, Rocket
} from "lucide-react";

const PRIMARY = "#003399";

export default function Finish() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5" style={{ color: PRIMARY }} />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Data Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 깜빡임 효과 추가 (항상) */}
            <div className="relative">
              <Link to="/">
                <Button variant="outline" className="gap-1 animate-pulse" title="홈으로 이동">
                  <ArrowLeft className="size-4" /> 홈으로
                </Button>
              </Link>
              <span className="pointer-events-none absolute -inset-1 rounded-xl ring-2 ring-indigo-400/40 animate-ping" />
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
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
            <SidebarLink to="/7" label="문제 7: 가장 긴 유효 괄호" />
            <SidebarLink to="/8" label="문제 8: 조세퍼스 순열" />
            <SidebarLink to="/finish" label="마무리: 디자인 요약" active />
          </nav>
        </aside>

        {/* Main */}
        <main className="flex flex-col gap-6">
          {/* 디자인 요약 */}
          <section className="rounded-2xl border bg-white p-6 md:p-8">
            <h2 className="text-3xl font-extrabold flex items-center gap-2" style={{ color: PRIMARY }}>
              <Palette className="size-6" /> 디자인 요약
            </h2>
            <p className="mt-3 text-slate-700 leading-relaxed">
              <b>shadcn/ui</b>를 참조하여 <b>색상</b> 및 <b>디자인</b> 시스템을 개발하였습니다.
            </p>
          </section>

          {/* 공통 레이아웃 & 시스템 */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutGrid className="size-4 text-indigo-600" />
                  공통 레이아웃
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                  <li>사이드바 + 헤더 + 3컬럼 메인</li>
                  <li>페이지 공통 뼈대 공유, 섹션만 교체하는 모듈형 구조</li>
                  <li>모바일→데스크톱 반응형 그리드</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="size-4 text-indigo-600" />
                  디자인 시스템
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                  <li>Tailwind + shadcn/ui 기반의 일관된 톤</li>
                  <li>PRIMARY 컬러({PRIMARY}) 중심의 브랜드 포인트</li>
                  <li>접근성 고려(대비, 폰트 크기, 인터랙션 명료성)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ChartBar className="size-4 text-indigo-600" />
                  시각화 & 인터랙션
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                  <li>Recharts(막대/선/영역) + 표 헤더 sticky</li>
                  <li>SSE 스트리밍 진행 단계 표시, 속도 슬라이더·토글</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* 문제별 테스트 포인트 */}
          <section className="rounded-2xl border bg-white p-6 md:p-8">
            <h3 className="text-2xl font-bold flex items-center gap-2" style={{ color: PRIMARY }}>
              <ListChecks className="size-6" /> 문제별 테스트 포인트
            </h3>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <EvalCard
                title="1번 문제"
                bullets={[
                  "서버 속도 개선 (메모리 관리, 파싱 등)",
                  "출력 결과에 맞는 그래프 활용",
                  "파일 입출력 처리 능력",
                  "데이터 전처리 능력",
                ]}
              />
              <EvalCard
                title="2번 문제"
                bullets={[
                  "네트워크 통신 이해",
                  "동기·비동기 처리 이해",
                  "TCP, UDP 개념 이해",
                ]}
              />
              <EvalCard
                title="3번 문제"
                bullets={[
                  "방대한 데이터에서 핵심 로우·컬럼 추출 능력",
                  "원격 서버 접속 및 처리",
                ]}
              />
              <EvalCard
                title="4번 문제"
                bullets={[
                  "디자인 라이브러리 활용(그래프 & UI 디자인)",
                  "입력 값 처리 및 실시간 반영",
                ]}
              />
              <EvalCard
                title="5번 문제"
                bullets={[
                  "외부 API 요청 활용 능력",
                  "수집 데이터 정제·검증",
                ]}
              />
              <EvalCard
                title="6번 문제"
                bullets={[
                  "단조 스택 자료구조 이해",
                ]}
              />
              <EvalCard
                title="7번 문제"
                bullets={[
                  "스택 및 센티넬 패턴 이해",
                ]}
              />
              <EvalCard
                title="8번 문제"
                bullets={[
                  "조세퍼스 순열 이해",
                ]}
              />
            </div>
          </section>

          {/* 다음 단계: 개선 방향 */}
          <section className="rounded-2xl border bg-white p-6 md:p-8">
            <h3 className="text-2xl font-bold flex items-center gap-2" style={{ color: PRIMARY }}>
              <Rocket className="size-6" /> 다음 단계: 개선 방향
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <Card className="transition hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Code2 className="size-4 text-indigo-600" />
                    기능·UX 고도화
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                    <li>데이터 수집 및 학습 데이터를 활용한 채팅 입력 기반 UX/UI 컨트롤 최적화(AI 챗)</li>
                    <li>AI 감각이 느껴지는 디자인, 스타일·폰트 리팩토링</li>
                    <li>재사용 컴포넌트 개선, 중복 코드 제거, 오류 처리 강화</li>
                    <li>서버 통신 성능·메모리 관리 및 속도 최적화</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="transition hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ChartBar className="size-4 text-indigo-600" />
                    문제 5 확장: 대규모 데이터 + AI 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
                    <li>대규모 Response 데이터 수집·정제·전처리 파이프라인</li>
                    <li>TF-IDF 기반 키워드 가중치, 유사도(코사인) 계산</li>
                    <li>감정 분석(Sentiment) 및 이상치 감지</li>
                    <li>추천 알고리즘(콘텐츠 기반/하이브리드) 시범 적용</li>
                    <li>TensorFlow/Keras 모델로 간단한 분류·회귀 실험</li>
                    <li>자동 리포트 생성(요약, 차트, 인사이트 문장)까지 일괄 출력</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 마무리 / CTA */}
          <section className="rounded-xl border bg-white p-6 md:p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">다음 단계로 이동</h3>
            <p className="text-slate-600 mb-4"></p>
            <div className="flex justify-center gap-2">
              <Link to="/"><Button className="gap-1"><ArrowLeft className="size-4" /> 홈으로</Button></Link>
              <Link to="/1"><Button variant="outline" className="gap-1">문제 다시 풀기 <ArrowRight className="size-4" /></Button></Link>
            </div>
          </section>
        </main>
      </div>
    </div>
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

/* ---- 평가 카드 ---- */
function EvalCard({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <Card className="transition hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="size-4 text-indigo-600" />
          {title} 테스트 포인트
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm text-slate-600 list-disc pl-4 space-y-1">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}
