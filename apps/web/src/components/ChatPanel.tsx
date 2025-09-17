// apps/web/src/components/ChatPanel.tsx
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { Send, ChevronRight, Info } from "lucide-react";
import { listActions, triggerAction } from "@/lib/chatControl";

const CHAT_W_DEFAULT = "clamp(320px,26vw,420px)";

type Item = { to: string; label: string };

export default function ChatPanel({
  items,
  onSearch,
  brand = "#003399",
  headerTopPx = 64,              // 헤더 + 상단바 높이
  dock = "top",                   // 'top' | 'left' | 'right'
  widthClamp = CHAT_W_DEFAULT,    // ✅ 추가: 외부에서 너비 조정
  floating = true,                // ✅ 추가: true면 고정(스크롤 따라다님), false면 문서 흐름
}: {
  items: Item[];
  onSearch?: (kw: string) => void;
  brand?: string;
  headerTopPx?: number;
  dock?: "top" | "left" | "right";
  widthClamp?: string;
  floating?: boolean;
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<string[]>([
    "채팅 제어 시작! `help` 입력으로 명령어 확인.",
  ]);
  const scroller = useRef<HTMLDivElement>(null);

  const indexByPath = useMemo(
    () => new Map(items.map((v, i) => [v.to, i])),
    [items]
  );

  const say = (t: string) => {
    setLogs((prev) => [...prev, t]);
    queueMicrotask(() => {
      scroller.current?.scrollTo({
        top: scroller.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const goIndex = (i: number) => {
    const it = items[i];
    if (!it) return say(`❌ 인덱스 범위 오류: ${i + 1}`);
    nav(it.to);
    say(`➡️ 이동: ${it.label}`);
  };

  const goLabel = (q: string) => {
    const k = q.toLowerCase();
    const it = items.find((v) => v.label.toLowerCase().includes(k));
    if (!it) return say(`❌ 라벨 매칭 실패: "${q}"`);
    nav(it.to);
    say(`➡️ 이동: ${it.label}`);
  };

  const listAll = () =>
    say("📚 목록\n" + items.map((v, i) => `${i + 1}. ${v.label}`).join("\n"));

  const nextPrev = (d: 1 | -1) => {
    const cur = indexByPath.get(loc.pathname) ?? -1;
    const nx = cur + d;
    if (nx < 0 || nx >= items.length) return say("❌ 범위를 벗어났어요.");
    goIndex(nx);
  };

  const help = () =>
    say(
      [
        "🤖 명령어:",
        "- help : 도움말",
        "- list : 문제 목록",
        "- search <키워드> : 홈의 카드/문제 필터",
        "- open <번호|라벨> / go <번호|라벨> / #<번호>",
        "- home / finish : 해당 페이지로 이동",
        "- next / prev : 다음/이전 문제",
        "- actions : 현재 페이지 등록 액션 나열",
        "- run / reset / connect / upload ... : 등록된 액션 실행",
      ].join("\n")
    );

  const handle = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    say(`> ${cmd}`);

    // #숫자 -> 인덱스 이동
    const hash = cmd.match(/^#(\d+)$/);
    if (hash) return goIndex(parseInt(hash[1], 10) - 1);

    const [head, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ").trim();

    switch (head.toLowerCase()) {
      case "help":
        return help();
      case "list":
        return listAll();
      case "home":
        nav("/");
        return say("🏠 홈으로 이동");
      case "finish":
        nav("/finish");
        return say("🗂️ 디자인 요약으로 이동");
      case "next":
        return nextPrev(1);
      case "prev":
      case "previous":
        return nextPrev(-1);
      case "search":
        if (!onSearch) return say("ℹ️ 이 페이지는 검색 연결이 없습니다.");
        if (!arg) return say("❌ search <키워드>");
        onSearch(arg);
        return say(`🔎 검색: "${arg}"`);
      case "open":
      case "go":
        if (!arg) return say("❌ open <번호|라벨>");
        if (/^\d+$/.test(arg)) return goIndex(parseInt(arg, 10) - 1);
        return goLabel(arg);
      case "actions":
        return say("⚙️ 사용 가능 액션\n" + listActions().join(", "));
      default: {
        const ok = triggerAction(head, arg || undefined);
        if (ok) return say(`✅ 액션 실행: ${head}${arg ? ` (${arg})` : ""}`);
        if (/^\d+$/.test(head)) return goIndex(parseInt(head, 10) - 1);
        return goLabel(cmd);
      }
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input;
    setInput("");
    handle(v);
  };

  // ✅ 도킹/플로팅에 따른 래퍼 스타일
  const isTop = dock === "top";

  // floating=false => 상단고정 해제(문서 흐름)
  const wrapperStyle: React.CSSProperties = !floating
    ? {
        position: "static",
        width: "100%",
      }
    : isTop
    ? {
        position: "sticky",
        top: headerTopPx,
        height: "clamp(240px, 38vh, 420px)",
        width: "100%",
      }
    : {
        position: "sticky",
        top: headerTopPx,
        height: `calc(100svh - ${headerTopPx}px)`,
        width: widthClamp,
      };

  // 로그 영역 높이: 플로팅일 땐 전체 높이에서 헤더/입력 높이를 계산, 비플로팅일 땐 최대 높이만 제한
  const logBoxClass = floating
    ? "h-[calc(100%-48px-56px)] overflow-auto p-3 text-[12.5px] leading-5 whitespace-pre-wrap"
    : "max-h-[40vh] overflow-auto p-3 text-[12.5px] leading-5 whitespace-pre-wrap";

  return (
    <aside className="rounded-xl overflow-hidden border bg-white" style={wrapperStyle}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full" style={{ background: brand }} />
          <strong className="text-sm">AI Chat Control</strong>
          <span className="text-xs text-slate-500 hidden sm:inline">
            {floating ? (isTop ? "상단 고정" : "우측 패널 고정") : "문서 흐름"}
          </span>
        </div>
        <Link
          to="/finish"
          className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
        >
          가이드 <ChevronRight className="size-3" />
        </Link>
      </div>

      {/* 로그 */}
      <div ref={scroller} className={logBoxClass}>
        <div className="mb-2 text-slate-600 text-xs flex items-center gap-1">
          <Info className="size-3.5" /> <code>actions</code>로 등록 액션 확인
        </div>
        {logs.map((l, i) => (
          <div key={i} className="text-slate-800">
            {l}
          </div>
        ))}
      </div>

      {/* 입력 */}
      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='예) "open 3", "search 차트", "run", "reset", "#1"'
          className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
        >
          <Send className="size-4" /> 실행
        </button>
      </form>
    </aside>
  );
}
