// apps/server/src/routes/Problem4.ts
import { Router, type Request, type Response } from 'express'

const router = Router()

type MonthRow = { m: number; label: string; temp: number; hum: number }
const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

const DEFAULT_DATA: MonthRow[] = [
  { m:1,  label:'1월',  temp: -1, hum: 62 },
  { m:2,  label:'2월',  temp:  1, hum: 60 },
  { m:3,  label:'3월',  temp:  6, hum: 60 },
  { m:4,  label:'4월',  temp: 12, hum: 62 },
  { m:5,  label:'5월',  temp: 18, hum: 69 },
  { m:6,  label:'6월',  temp: 22, hum: 75 },
  { m:7,  label:'7월',  temp: 25, hum: 80 },
  { m:8,  label:'8월',  temp: 26, hum: 78 },
  { m:9,  label:'9월',  temp: 21, hum: 72 },
  { m:10, label:'10월', temp: 14, hum: 66 },
  { m:11, label:'11월', temp:  7, hum: 63 },
  { m:12, label:'12월', temp:  1, hum: 62 },
]

// 간단한 clamp & 노이즈
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
function randN() { return (Math.random()+Math.random()+Math.random() - 1.5) }

function generateRandomData(noise = 1): MonthRow[] {
  return MONTH_LABELS.map((label, i) => {
    const t = (i + 1) / 12
    const baseTemp = 16 * Math.sin(Math.PI * (t - 0.25)) + 12
    const baseHum  = -15 * Math.sin(Math.PI * (t - 0.25)) + 65
    const temp = clamp(Math.round(baseTemp + randN()*noise), -10, 35)
    const hum  = clamp(Math.round(baseHum  + randN()*noise*2), 35, 90)
    return { m: i+1, label, temp, hum }
  })
}

router.get('/problem4/default', (_req: Request, res: Response) => {
  res.json({ rows: DEFAULT_DATA })
})

router.get('/problem4/random', (req: Request, res: Response) => {
  const noise = Number(req.query.noise ?? 1)
  const rows = generateRandomData(Number.isFinite(noise) ? noise : 1)
  res.json({ rows })
})

router.post('/problem4/stats', (req: Request, res: Response) => {
  const rows: MonthRow[] = Array.isArray(req.body?.rows) ? req.body.rows : []
  if (rows.length !== 12) return res.status(400).json({ error: 'INVALID_ROWS' })

  const avgTemp = +(rows.reduce((s, r) => s + Number(r.temp || 0), 0) / rows.length).toFixed(1)
  const avgHum  = +(rows.reduce((s, r) => s + Number(r.hum  || 0), 0) / rows.length).toFixed(1)

  const minTemp = rows.reduce((a,b)=> a.temp<b.temp?a:b)
  const maxTemp = rows.reduce((a,b)=> a.temp>b.temp?a:b)
  const minHum  = rows.reduce((a,b)=> a.hum <b.hum ?a:b)
  const maxHum  = rows.reduce((a,b)=> a.hum >b.hum ?a:b)

  res.json({
    avgTemp, avgHum,
    minTemp, maxTemp,
    minHum,  maxHum,
  })
})

export default router
