//src/App.tsx 
import { Link } from "react-router-dom"

export default function App() {
  const items = [
    { to: "/1", label: "문제 1: CSV 파일 분석" },
    { to: "/2", label: "문제 2: Ping-Pong 클라이언트-서버 프로그램" },
    { to: "/3", label: "문제 3: DB 연결 및 쿼리 실행" },
    { to: "/4", label: "문제 4: 기온과 습도 차트 구현 예시" },
    { to: "/5", label: "문제 5: 랜덤 응답 서버 호출 및 카운트" },
    { to: "/6", label: "문제 6: 탑 레이저 신호 수신" },
    { to: "/7", label: "문제 7: 가장 긴 유효한 괄호 부분" },
    { to: "/8", label: "문제 8: 조세퍼스 순열" },
  ]
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">코딩테스트 문제 목록</h1>
      <div className="mb-6">
        <Link to="/finish" className="mr-4 underline text-[#003399]">
          마무리: 코딩테스트 웹사이트 디자인 요약
        </Link>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              className="block rounded border px-4 py-3 hover:bg-gray-50"
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
