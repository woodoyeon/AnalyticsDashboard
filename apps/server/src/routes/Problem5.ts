// apps/server/src/routes/Problem5.ts
import { Router, type Request, type Response } from "express";

const router = Router();

// 외부 랜덤 서버 (문제에서 준 주소)
const REMOTE_RANDOM = process.env.P5_REMOTE ?? "http://codingtest.brique.kr:8080/random";

// 간단 더미(내부에서도 테스트 가능)
const LOCAL_QUOTES = [
  { id: 1,  quote: "Working with Spring Boot is like pair-programming ..." },
  { id: 2,  quote: "With Boot you deploy everywhere you can find a JVM ..." },
  { id: 3,  quote: "Spring has come quite a ways in addressing ..." },
  { id: 4,  quote: "Previous to Spring Boot ... frustration." },
  { id: 5,  quote: "Spring Boot solves this problem ..." },
  { id: 6,  quote: "It embraces convention over configuration ..." },
  { id: 7,  quote: "The real benefit of Boot, however ..." },
  { id: 8,  quote: "I don't worry about my code scaling ..." },
  { id: 9,  quote: "So easy it is to switch container ..." },
  { id: 10, quote: "Really loving Spring Boot ..." },
  { id: 11, quote: "I have two hours today to build an app ..." },
  { id: 12, quote: "@springboot with @springframework is pure productivity!" },
];

// ---- 1) 외부 프록시 ----
// GET /api/p5/random  -> http://codingtest.brique.kr:8080/random
router.get("/p5/random", async (_req: Request, res: Response) => {
  try {
    const r = await fetch(REMOTE_RANDOM, { headers: { "Accept": "application/json" } });
    if (!r.ok) throw new Error(`REMOTE ${r.status}`);
    const json = await r.json();
    res.json(json);
  } catch (e) {
    res.status(502).json({ error: "REMOTE_ERROR", detail: String(e) });
  }
});

// ---- 2) 로컬 더미 ----
// GET /api/p5/random-local
router.get("/p5/random-local", (_req, res) => {
  const idx = Math.floor(Math.random() * LOCAL_QUOTES.length);
  res.json(LOCAL_QUOTES[idx]);
});

// ---- 3) SSE 실행기 ----
// GET /api/p5/stream-run?total=100&concurrency=10&delayMs=0&endpoint=/api/p5/random
router.get("/p5/stream-run", async (req: Request, res: Response) => {
  const total = Math.max(1, Math.min(10000, Number(req.query.total ?? 100)));
  const concurrency = Math.max(1, Math.min(50, Number(req.query.concurrency ?? 10)));
  const delayMs = Math.max(0, Math.min(5000, Number(req.query.delayMs ?? 0)));
  const endpointParam = String(req.query.endpoint ?? "/api/p5/random");

  // 클라이언트가 '/api/p5/random' 처럼 보냈더라도, 실제 타겟은 외부 서버로 고정
  const TARGET = /^https?:\/\//i.test(endpointParam) ? endpointParam : REMOTE_RANDOM;

  // SSE 헤더
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  // @ts-ignore
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let completed = 0;
  let failed = 0;
  const counts = new Map<number, { count: number; quote: string }>();

  send("hello", { ok: true, ts: Date.now() });

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  // 한 번 호출
  const callOnce = async () => {
    try {
      const r = await fetch(TARGET, {
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as { id: number; quote: string };

      // tick
      send("tick", json);

      // 집계
      const cur = counts.get(json.id) ?? { count: 0, quote: json.quote };
      cur.count += 1;
      if (!cur.quote) cur.quote = json.quote;
      counts.set(json.id, cur);
    } catch {
      failed += 1;
    } finally {
      completed += 1;
      send("progress", { completed, failed });
    }
  };

  // 워커 풀
  let next = 0;
  const worker = async () => {
    while (!controller.signal.aborted) {
      const idx = next++;
      if (idx >= total) break;
      await callOnce();
      if (delayMs) await sleep(delayMs);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.allSettled(workers);

  // 최종 정렬 결과
  const rows = Array.from(counts.entries())
    .map(([id, v]) => ({ id, count: v.count, quote: v.quote }))
    .sort((a, b) => b.count - a.count || a.id - b.id);

  const successSum = rows.reduce((s, r) => s + r.count, 0);

  send("done", {
    rows,
    totalCount: successSum, // 성공 합
    failed,                 // 실패 개수
  });

  res.end();
});

export default router;
