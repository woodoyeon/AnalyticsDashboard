// apps/server/src/index.ts
import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { pool } from './db.js'

// 라우트
import problem1Routes from './routes/Problem1.js'
import { attachProblem2WS } from './ws/problem2.js'
import { startProblem2TCP } from './tcp/problem2-tcp.js'
import problem3Routes from './routes/Problem3.js'
import problem4Routes from './routes/Problem4.js'
import problem5Routes from './routes/Problem5.js'
import problem6Routes from './routes/problem6.js'
import problem7Routes from './routes/problem7.js'
import problem8Routes from './routes/problem8.js'

const app = express()
app.set('trust proxy', 1)

/**
 * CORS (개발/배포 도메인 추가)
 * - 필요 시 origin 배열만 늘리면 됩니다.
 */
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev
    'http://127.0.0.1:5173'
  ],
  credentials: true,
}))



/**
 * 바디 파서
 * - 대용량 CSV 텍스트 고려하여 제한 상향
 */
app.use(express.json({ limit: '200mb' }))
app.use(express.text({ type: ['text/plain', 'text/csv'], limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

/**
 * 라우트 마운트
 * - 프론트는 /api/p1/compute-start /api/p1/compute-stream 사용
 */
app.use('/api', problem1Routes)
app.use('/api', problem3Routes)
app.use('/api', problem4Routes)
app.use('/api', problem5Routes)
app.use('/api', problem6Routes)
app.use('/api', problem7Routes)
app.use('/api', problem8Routes)

/** 헬스체크 */
app.get('/', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))
app.get('/api/health', (_req, res) => res.json({ ok: true }))

/** 404 */
app.use((_req: Request, res: Response) => res.status(404).json({ error: 'NOT_FOUND' }))

/** 에러 핸들러 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err)
  res.status(500).json({ error: 'INTERNAL_ERROR' })
})

/** 서버 시작 */
const port = Number(process.env.PORT ?? 3001)
const server = app.listen(port, () => console.log(`✅ server on :${port}`))

/** WS/TCP 문제 2 구동 */
attachProblem2WS(server)                               // ws://localhost:3001/ws/p2
startProblem2TCP(Number(process.env.P2_TCP_PORT ?? 4002)) // nc localhost 4002

/** 그레이스풀 셧다운 */
const shutdown = async (sig: string) => {
  console.log(`\n🔻 ${sig} received. Closing server...`)
  server.close(async () => {
    try { await pool.end(); console.log('✅ DB pool closed.') } catch {}
    console.log('✅ HTTP server closed.')
    process.exit(0)
  })
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
