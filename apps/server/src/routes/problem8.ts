import { Router, type Request, type Response } from "express";

const router = Router();

/** (N,M) 조세퍼스 – 전체 순열 반환 */
function josephus(n: number, m: number) {
  const order: number[] = [];
  const a = Array.from({ length: n }, (_, i) => i + 1);
  let idx = 0;
  while (a.length) {
    idx = (idx + m - 1) % a.length;
    const removed = a.splice(idx, 1)[0];
    order.push(removed);
  }
  return order;
}

/** 동기 계산 API: POST /api/p8/solve  { N: number, M: number } */
router.post("/p8/solve", (req: Request, res: Response) => {
  const N = Math.trunc(Number(req.body?.N));
  const M = Math.trunc(Number(req.body?.M));
  if (!Number.isFinite(N) || !Number.isFinite(M) || N <= 0 || M <= 0 || M > N || N > 2000) {
    return res.status(400).json({ ok: false, error: "INVALID_N_OR_M" });
  }
  const order = josephus(N, M);
  return res.json({ ok: true, order, N, M });
});

/** 진행상황 스트리밍 API(SSE): GET /api/p8/stream?N=7&M=3&delayMs=120  */
router.get("/p8/stream", (req: Request, res: Response) => {
  const N = Math.trunc(Number(req.query.N ?? 0));
  const M = Math.trunc(Number(req.query.M ?? 0));
  const delayMs = Math.max(0, Math.trunc(Number(req.query.delayMs ?? 100)));
  if (!Number.isFinite(N) || !Number.isFinite(M) || N <= 0 || M <= 0 || M > N || N > 2000) {
    res.writeHead(400, { "Content-Type": "text/event-stream" });
    res.write(`event: error\ndata: ${JSON.stringify({ error: "INVALID_N_OR_M" })}\n\n`);
    return res.end();
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const a = Array.from({ length: N }, (_, i) => i + 1);
  let idx = 0;
  let done = false;
  const order: number[] = [];

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send("hello", { ok: true, N, M });

  const tick = () => {
    if (done) return;
    if (!a.length) {
      done = true;
      send("done", { order, N, M });
      return res.end();
    }
    idx = (idx + M - 1) % a.length;
    const removed = a.splice(idx, 1)[0];
    order.push(removed);

    send("step", {
      removed,
      removedIndex: idx,
      remaining: a.slice(),
    });
    send("progress", { completed: order.length, total: N });

    setTimeout(tick, delayMs);
  };

  const timer = setTimeout(tick, delayMs);
  req.on("close", () => {
    clearTimeout(timer);
    done = true;
  });
});

export default router;
