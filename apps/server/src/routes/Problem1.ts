// apps/server/src/routes/Problem1.ts
import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";

const router = Router();

/** 업로드된 작업(메모리 보관) */
type Job = {
  text: string;
  delimiter: string;
  round: number;
  ignoreEmpty: boolean;
};
const jobs = new Map<string, Job>();

/** 유틸 */
const isNumeric = (s: string) => {
  const t = s.trim();
  return t !== "" && Number.isFinite(Number(t));
};
const roundTo = (v: number, d: number) =>
  Number.isFinite(v) ? Number(v.toFixed(d)) : v;

function stat(nums: number[]) {
  const n = nums.length;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { min, max, sum, mean, std, median };
}

/** 샘플 CSV(테스트용) */
router.get("/p1/sample", (_req, res) => {
  const sample =
    [
      "1,2,3,4,5",
      "10,9,8,7",
      "100,200,50",
      "a,b,c", // 에러 라인
      "5,5,5,5,5",
    ].join("\n") + "\n";
  res.type("text/plain").send(sample);
});

/** 즉시 계산(일괄) – SSE가 싫다면 이걸 쓰면 됩니다. */
router.post("/p1/compute", (req: Request, res: Response) => {
  const text: string = String(req.body?.text ?? "");
  const delimiter: string = String(req.body?.delimiter ?? ",");
  const round: number = Number(req.body?.round ?? 2);
  const ignoreEmpty: boolean = Boolean(req.body?.ignoreEmpty ?? true);

  const lines = text.replace(/\r/g, "").split("\n");
  const rows: any[] = [];
  const errors: number[] = [];
  let total = 0;
  let calculated = 0;

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const raw = line.trim();
    if (ignoreEmpty && raw === "") return;
    total++;

    const cells = raw.split(delimiter).map((c) => c.trim());
    if (cells.length === 0 || !cells.every(isNumeric)) {
      errors.push(lineNo);
      return;
    }
    const nums = cells.map((c) => Number(c));
    const { min, max, sum, mean, std, median } = stat(nums);
    rows.push({
      line: lineNo,
      min: roundTo(min, round),
      max: roundTo(max, round),
      sum: roundTo(sum, round),
      mean: roundTo(mean, round),
      std: roundTo(std, round),
      median: roundTo(median, round),
    });
    calculated++;
  });

  res.json({ total, calculated, errors, rows });
});

/** 업로드 시작 → jobId 발급 (SSE 스트림은 별도) */
router.post("/p1/compute-start", (req: Request, res: Response) => {
  const text: string = String(req.body?.text ?? "");
  const delimiter: string = String(req.body?.delimiter ?? ",");
  const round: number = Number(req.body?.round ?? 2);
  const ignoreEmpty: boolean = Boolean(req.body?.ignoreEmpty ?? true);

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "EMPTY_TEXT" });
  }
  const jobId = randomUUID();
  jobs.set(jobId, { text, delimiter, round, ignoreEmpty });
  res.json({ jobId });
});

/** SSE 스트림 – 진행상황/미리보기/최종요약 */
router.get("/p1/compute-stream", async (req: Request, res: Response) => {
  const jobId = String(req.query.job ?? "");
  const job = jobs.get(jobId);
  if (!job) {
    res.writeHead(404).end();
    return;
  }

  const { text, delimiter, round, ignoreEmpty } = job;
  // job은 바로 삭제(한 번만 사용)
  jobs.delete(jobId);

  // SSE 헤더
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const lines = text.replace(/\r/g, "").split("\n");
    let total = 0;
    let calculated = 0;
    let failed = 0;
    const errors: number[] = [];
    const rows: any[] = [];

    // hello: 총 라인 수(빈줄 포함)
    send("hello", { lines: lines.length });

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      const raw = lines[i].trim();
      if (ignoreEmpty && raw === "") continue;

      total++;

      const cells = raw.split(delimiter).map((c) => c.trim());
      if (cells.length === 0 || !cells.every(isNumeric)) {
        errors.push(lineNo);
        failed++;
        send("tick", { line: lineNo, ok: false, raw });
      } else {
        const nums = cells.map((c) => Number(c));
        const { min, max, sum, mean, std, median } = stat(nums);
        const row = {
          line: lineNo,
          min: roundTo(min, round),
          max: roundTo(max, round),
          sum: roundTo(sum, round),
          mean: roundTo(mean, round),
          std: roundTo(std, round),
          median: roundTo(median, round),
        };
        rows.push(row);
        calculated++;
        send("tick", { line: lineNo, ok: true, row });
      }

      if (i % 20 === 0) {
        send("progress", { processed: i + 1, totalLines: lines.length, total, calculated, failed });
      }
    }

    // 최종 동기화
    send("done", { total, calculated, failed, errors, rows });
    res.end();
  } catch (e: any) {
    send("error", { message: String(e?.message ?? e) });
    res.end();
  }
});

export default router;
