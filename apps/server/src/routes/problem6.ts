import { Router, type Request, type Response } from "express";

const router = Router();

/** 유효성 검사 */
function toInt(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.trunc(v) : NaN;
}

/** 단조 감소 스택으로 수신 탑 계산 + 스텝 로깅(옵션) */
function solve(heights: number[], withSteps = false) {
  const n = heights.length;
  const receivers = Array<number>(n).fill(0); // 0 = 없음, 아니면 1-based index
  const stack: number[] = []; // 왼쪽에서 내려오며 "내 앞에서 가장 높은 후보" 인덱스들(0-based)

  type Step = {
    i: number;                   // 현재 계산중인 탑
    action: "pop" | "push" | "recv" | "start";
    popIndex?: number;
    stack: number[];             // 현재 스택 스냅샷(복사)
    receiver?: number;           // 1-based
  };
  const steps: Step[] = [];

  const log = (s: Step) => { if (withSteps) steps.push(s); };

  for (let i = 0; i < n; i++) {
    log({ i, action: "start", stack: [...stack] });

    // 내 왼쪽에서 나보다 작거나 같은 탑은 레이저가 통과 -> 팝
    while (stack.length && heights[stack[stack.length - 1]] <= heights[i]) {
      const popped = stack.pop()!;
      log({ i, action: "pop", popIndex: popped, stack: [...stack] });
    }

    // 이제 스택 top이 나보다 큰 첫 탑 -> 수신자
    if (stack.length) {
      receivers[i] = stack[stack.length - 1] + 1; // 1-based
      log({ i, action: "recv", receiver: receivers[i], stack: [...stack] });
    }

    // 현재 탑을 후보로 push
    stack.push(i);
    log({ i, action: "push", stack: [...stack] });
  }

  return withSteps ? { receivers, steps } : { receivers };
}

/** 랜덤 높이 생성 */
router.get("/p6/random", (req: Request, res: Response) => {
  const count = Math.min(200, Math.max(1, toInt(req.query.count) || 10));
  const min = Math.max(1, toInt(req.query.min) || 1);
  const max = Math.max(min, toInt(req.query.max) || 100);

  const heights = Array.from({ length: count }, () =>
    Math.trunc(Math.random() * (max - min + 1)) + min
  );

  return res.json({ ok: true, heights });
});

/** 해결 API */
router.post("/p6/resolve", (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const heights = Array.isArray(body.heights) ? body.heights.map(toInt) : [];
    if (!heights.length || heights.some((h) => !Number.isFinite(h) || h <= 0)) {
      return res.status(400).json({ ok: false, error: "INVALID_INPUT" });
    }
    const withSteps = !!body.withSteps;

    const { receivers, steps } = solve(heights, withSteps) as any;
    return res.json({ ok: true, receivers, steps: withSteps ? steps : undefined });
  } catch (e) {
    console.error("[P6_RESOLVE_ERROR]", e);
    return res.status(500).json({ ok: false, error: "P6_INTERNAL" });
  }
});

export default router;
