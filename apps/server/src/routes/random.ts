// apps/server/src/routes/random.ts - 문제5
import { Router } from 'express';
import type { Request, Response } from 'express';
const router = Router();

router.get('/random', (req: Request, res: Response) => {
  const min = Number(req.query.min ?? 0);
  const max = Number(req.query.max ?? 100);
  const val = Math.random() * (max - min) + min;
  res.json({ value: Number(val.toFixed(4)) });
});

export default router;
