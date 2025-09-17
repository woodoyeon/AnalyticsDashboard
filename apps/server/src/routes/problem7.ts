import { Router, type Request, type Response } from "express";

const router = Router();

/** 무작위 괄호 문자열 생성 */
function randomParens(len = 12, pOpen = 0.5) {
  const s = Array.from({ length: Math.max(1, Math.min(400, len)) }, () =>
    Math.random() < pOpen ? "(" : ")"
  ).join("");
  return s;
}

/** 가장 긴 유효 괄호 길이 + 시각화용 데이터 */
function solve(s: string) {
  const n = s.length;
  const pairs: Array<{ open: number; close: number }> = [];
  const stForPairs: number[] = [];

  // 1) 모든 매칭 쌍 수집(시각화용)
  for (let i = 0; i < n; i++) {
    const c = s[i];
    if (c === "(") {
      stForPairs.push(i);
    } else {
      if (stForPairs.length) {
        const open = stForPairs.pop()!;
        pairs.push({ open, close: i });
      }
    }
  }

  // 2) 스택 + 센티널로 최장 길이/구간 계산
  const st: number[] = [];
  let lastInvalid = -1;
  let maxLen = 0;
  let best: [number, number] | null = null;

  for (let i = 0; i < n; i++) {
    if (s[i] === "(") {
      st.push(i);
    } else {
      if (!st.length) {
        lastInvalid = i;
      } else {
        st.pop();
        const curLen = st.length ? i - st[st.length - 1] : i - lastInvalid;
        if (curLen > maxLen) {
          maxLen = curLen;
          const start = st.length ? st[st.length - 1] + 1 : lastInvalid + 1;
          best = [start, i]; // inclusive
        }
      }
    }
  }

  // 3) 유효 인덱스 마스크(표/하이라이트용)
  const valid = Array<boolean>(n).fill(false);
  for (const { open, close } of pairs) {
    valid[open] = true;
    valid[close] = true;
  }

  return { maxLen, best, pairs, valid };
}

/** GET /api/p7/random?len=12&pOpen=0.5 */
router.get("/p7/random", (req: Request, res: Response) => {
  const len = Math.trunc(Number(req.query.len ?? 12));
  const pOpen = Math.max(0, Math.min(1, Number(req.query.pOpen ?? 0.5)));
  return res.json({ ok: true, s: randomParens(len, pOpen) });
});

/** POST /api/p7/solve { s: string } */
router.post("/p7/solve", (req: Request, res: Response) => {
  try {
    const s = String(req.body?.s ?? "");
    if (!/^[()]*$/.test(s)) {
      return res.status(400).json({ ok: false, error: "INVALID_STRING" });
    }
    const { maxLen, best, pairs, valid } = solve(s);
    return res.json({ ok: true, maxLen, best, pairs, valid });
  } catch (e) {
    console.error("[P7_SOLVE_ERROR]", e);
    return res.status(500).json({ ok: false, error: "P7_INTERNAL" });
  }
});

export default router;
