# 📊 AI Analytics Dashboard — 데이터 분석 자동화 & 시각화 플랫폼

파일·DB·API에서 수집한 데이터를 한 곳에서 정제·분석·시각화하고, **AI 요약·RAG 질의응답**까지 확장 가능한 개인 프로젝트입니다.
React+TypeScript 기반으로 **실시간 차트**, **대시보드 구성**, **데이터 파이프라인(수집→정제→가공)** 흐름을 보여줍니다.

---

## ✨ 핵심 가치 (Why)

* **한 곳에서 분석**: 파일·DB·API 등 소스가 달라도 하나의 대시보드에서 통합 분석
* **즉시 시각화**: 입력/갱신 데이터가 실시간 차트로 반영
* **AI 확장성**: 요약(LLM) + RAG 질의응답 구조를 고려한 설계
* **개발 효율**: 타입 안정성(TypeScript), 재사용 가능한 컴포넌트, 미니멀 UI

---

## 🧩 주요 기능 (What)

* **데이터 수집 파이프라인**

  * CSV 업로드 및 파싱(결측/이상치 기본 필터링)
  * DB/REST API로부터 비동기 수집(샘플 엔드포인트 포함)
* **데이터 전처리 & 통계**

  * 행 단위 유효성 검증(숫자 검출, 오류 행 분리)
  * 기본 통계: 최소/최대/합계/평균/표준편차/중앙값
* **실시간 시각화**

  * Recharts 기반 Line/Bar/Area 등 **반응형 차트**
  * 입력 테이블 ↔ 차트 **양방향 갱신**
* **AI 요약 & RAG(확장 포인트)**

  * 요약/인사이트 초안 생성 훅
  * 벡터 임베딩/검색기반 Q\&A를 위한 모듈 경로 예약
* **UX 보조**

  * 랜덤 데이터 채우기(데모용)
  * 다크 모드(선택) & 접근성 고려(키보드 내비, ARIA 일부)

---

## 🛠 기술 스택 (How)

* **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
* **Backend**: Node.js (Express)
* **Data/AI(옵션)**: CSV/REST, (선택) OpenAI·RAG 모듈 연결
* **Dev/Collab**: ESLint, Prettier, GitHub Actions(빌드·테스트)

---

## 🧱 아키텍처 개요

```
[Data Sources] ── CSV / REST API / DB
       │
       ▼
[Ingest Layer] ── parsers/validators (CSV, JSON) → error rows 분리
       │
       ▼
[Processing] ── stats() · normalize() · outlier check
       │
       ├─► [AI Layer (opt)] summarize() · embed() · RAG()
       │
       ▼
[UI State] ── Zustand(or React state) · Query Cache
       │
       ▼
[Visualization] ── Recharts(Responsive charts) + shadcn/ui
```

---

## 📁 프로젝트 구조

```
analytics-dashboard/
├─ apps/
│  ├─ web/                     # React + TS 프론트엔드
│  │  ├─ src/components/      # ChartCard, DataTable, StatBadge, ...
│  │  ├─ src/features/
│  │  │  ├─ csv/              # CSV 업로드/파싱/검증 훅·유틸
│  │  │  ├─ charts/           # Recharts 래퍼, 공통 옵션
│  │  │  └─ ai/               # (옵션) 요약·RAG 훅
│  │  ├─ src/lib/             # utils: stats, validators, formatters
│  │  └─ src/pages/           # /dashboard, /ingest, /playground
│  └─ server/                  # Express API
│     ├─ routes/              # /api/data, /api/mock, /api/ai (opt)
│     └─ services/            # db.ts, vector.ts(opt), summarize.ts(opt)
├─ packages/
│  └─ shared/                  # 공통 타입 정의, 유틸
└─ README.md
```

---

## 🚀 빠른 시작 (Local)

> Node.js 20 LTS 권장

```bash
# 1) 의존성 설치
npm i -g pnpm@9
pnpm install

# 2) 서버 실행 (백엔드)
cd apps/server
cp .env.example .env   # 필요 시 API KEY 등 입력
pnpm dev               # http://localhost:3001

# 3) 웹 실행 (프론트)
cd ../web
cp .env.example .env   # VITE_API_BASE 등 설정
pnpm dev               # http://localhost:5173
```

### 환경 변수 예시

`apps/server/.env`

```
PORT=3001
# 선택: AI 요약/RAG 사용 시
OPENAI_API_KEY=...
VECTOR_DB_URL=...
```

`apps/web/.env`

```
VITE_API_BASE=http://localhost:3001
```

---

## 🧪 샘플 사용 흐름

1. **CSV 업로드** → 자동 파싱 및 유효성 검사
2. **테이블 편집** → 값 변경 시 차트 **즉시 반영**
3. **통계 확인** → 최소·최대·합·평균·표준편차·중앙값
4. (옵션) **AI 요약** 버튼 → 현재 데이터에 대한 포인트 요약
5. (옵션) **RAG 질의응답** → “이번 달 이상치 구간은?” 같은 질문 입력

> 데모용 **랜덤 채우기(Randomize)** 버튼으로 입력값을 즉시 생성/리셋할 수 있습니다.

---

## 📊 대표 화면 (예시)

* 대시보드: 지표 카드(요약 통계) + 라인/막대 차트
* 인제스트: CSV 업로드 & 오류행 분리 뷰
* 플레이그라운드: 실시간 테이블↔차트 동기화, 랜덤 데이터 주입

> `/apps/web/src/features/charts`의 래퍼 컴포넌트를 통해 **반응형 레이아웃**과 **툴팁/범례** 옵션을 일관되게 제공합니다.

---

## 🔌 대표 API (샘플)

```
GET  /api/data/mock               # 데모용 랜덤 데이터
POST /api/data/upload             # CSV 업로드(멀티파트)
GET  /api/data/series             # 시계열 데이터 조회 (query: from, to)

# (옵션: AI)
POST /api/ai/summarize            # 요약 생성
POST /api/ai/rag-query            # 벡터 검색+Q&A
```

---

## 🧠 설계 포인트

* **안전한 파싱 & 엄격한 타입**: CSV → 스키마 검증 → 오류/유효 행 분리
* **성능 고려**

  * 큰 파일: 스트리밍 파싱(선택), 메모리 사용량 제한 옵션
  * 차트: 가상화·샘플링 전략(데이터 양에 따라)
  * 코드 스플리팅, Lazy import
* **UI·DX**

  * shadcn/ui + Tailwind 조합으로 **일관된 디자인 시스템**
  * Chart wrapper로 옵션 재사용, 보일러플레이트 감소
* **확장성**

  * AI 훅/서비스를 **옵션 레이어**로 분리 → API 키가 없어도 동작
  * DataSource 어댑터 패턴(파일/DB/REST 쉽게 교체)

---

## ✅ 테스트 & 품질

* **단위 테스트**: 통계 유틸(`stats.ts`), 파서/밸리데이터 중심 (Jest)
* **정적 분석**: ESLint + TypeScript strict
* **PR 가이드**: 작은 단위 커밋, 스쿼시 머지 권장, 린트/빌드 CI

```bash
pnpm test         # 유닛 테스트
pnpm lint         # 린트
pnpm typecheck    # 타입 검사
```

---

## 🗺️ 로드맵

* [ ] 대규모 스트리밍/윈도 차트(수만\~수십만 포인트) 최적화
* [ ] 데이터 파이프라인 시각화(노드-엣지 플로우)
* [ ] 대시보드 위젯 저장/공유(프리셋)
* [ ] 멀티 소스 조인(파일+API 혼합 집계)
* [ ] RAG 파이프라인 샘플(벡터 DB 선택 가이드 포함)
* [ ] 접근성 & 국제화(i18n) 강화

---

## 📜 라이선스

* 본 프로젝트는 **학습·포트폴리오 목적**으로 공개됩니다.
* 외부 API/모델 사용 시 각 서비스의 약관/정책을 준수하세요.

---

## 🙋 문의

* Author: **우도연 (Full-stack · AI-PM)**
* GitHub: [woodoyeon](https://github.com/woodoyeon)
* Project: `AI Analytics Dashboard` (2025.09 \~ 진행중)

> 아이디어·피드백·기여 제안 모두 환영합니다!
