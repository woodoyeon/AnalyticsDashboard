// apps/server/src/routes/Problem3.ts
import { Router } from 'express'
import type { Request, Response } from 'express'
import type { RowDataPacket } from 'mysql2'
import { getConn } from '../db.js'

const router = Router()

type EmpRow = RowDataPacket & {
  emp_no: number
  first_name: string
  last_name: string
  gender: 'M' | 'F'
  hire_date: string
  dept_name: string | null
  title: string | null
  max_salary: number
}
type CountRow = RowDataPacket & { total: number }
type StatRow = RowDataPacket & {
  total: number; min_salary: number | null; max_salary: number | null; avg_salary: number | null
}
type LabelCount = RowDataPacket & { label: string | null; cnt: number }
type YearCount = RowDataPacket & { y: number; cnt: number }
type BucketCount = RowDataPacket & { bucket: number; cnt: number }

function parseMulti(v: unknown): string[] | undefined {
  if (!v) return
  if (Array.isArray(v)) return v.map(String).filter(Boolean)
  const s = String(v || '')
  if (!s.trim()) return
  return s.split(',').map(x => x.trim()).filter(Boolean)
}

function buildWhere(q: any) {
  const where: string[] = [`e.hire_date >= '2000-01-01'`]
  const vals: any[] = []

  const genders = parseMulti(q.gender)
  if (genders?.length) { where.push(`e.gender IN (?)`); vals.push(genders) }

  const depts = parseMulti(q.dept)
  if (depts?.length) { where.push(`d.dept_name IN (?)`); vals.push(depts) }

  const titles = parseMulti(q.title)
  if (titles?.length) { where.push(`tt.title IN (?)`); vals.push(titles) }

  const minS = q.salaryMin !== undefined && q.salaryMin !== '' ? Number(q.salaryMin) : undefined
  if (typeof minS === 'number' && !Number.isNaN(minS)) { where.push(`s.max_salary >= ?`); vals.push(minS) }

  const maxS = q.salaryMax !== undefined && q.salaryMax !== '' ? Number(q.salaryMax) : undefined
  if (typeof maxS === 'number' && !Number.isNaN(maxS)) { where.push(`s.max_salary <= ?`); vals.push(maxS) }

  return { where: where.join(' AND '), vals }
}

const BASE_JOINS = `
  FROM employees e
  JOIN (SELECT emp_no, MAX(salary) AS max_salary FROM salaries GROUP BY emp_no) s ON s.emp_no = e.emp_no
  LEFT JOIN (
    SELECT de1.emp_no, de1.dept_no
    FROM dept_emp de1
    JOIN (SELECT emp_no, MAX(to_date) AS max_to FROM dept_emp GROUP BY emp_no) last_de
      ON last_de.emp_no = de1.emp_no AND last_de.max_to = de1.to_date
  ) de ON de.emp_no = e.emp_no
  LEFT JOIN departments d ON d.dept_no = de.dept_no
  LEFT JOIN (
    SELECT t1.emp_no, t1.title
    FROM titles t1
    JOIN (SELECT emp_no, MAX(to_date) AS max_to FROM titles GROUP BY emp_no) last_t
      ON last_t.emp_no = t1.emp_no AND last_t.max_to = t1.to_date
  ) tt ON tt.emp_no = e.emp_no
`

// 목록
router.get('/problem3/employees/hired-after-2000', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1))
  const size = Math.min(100, Math.max(1, Number(req.query.size ?? 15)))
  const offset = (page - 1) * size

  const { where, vals } = buildWhere(req.query)

  const COUNT_SQL = `SELECT COUNT(*) AS total ${BASE_JOINS} WHERE ${where}`
  const DATA_SQL = `
    SELECT e.emp_no, e.first_name, e.last_name, e.gender, e.hire_date,
           d.dept_name, tt.title, s.max_salary
    ${BASE_JOINS}
    WHERE ${where}
    ORDER BY e.emp_no
    LIMIT ? OFFSET ?
  `

  const conn = await getConn()
  try {
    const [cRows] = await conn.query<CountRow[]>(COUNT_SQL, vals)
    const total = cRows[0]?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / size))
    const [rows] = await conn.query<EmpRow[]>(DATA_SQL, [...vals, size, offset])
    res.json({ page, size, total, totalPages, rows })
  } catch (e) {
    console.error('[P3 LIST_ERROR]', e)
    res.status(500).json({ error: 'DB_QUERY_ERROR' })
  } finally {
    conn.release()
  }
})

// 통계(+차트용 데이터)
router.get('/problem3/employees/stats', async (req: Request, res: Response) => {
  const { where, vals } = buildWhere(req.query)
  const conn = await getConn()
  try {
    const STAT_SQL = `
      SELECT COUNT(*) AS total, MIN(s.max_salary) AS min_salary,
             MAX(s.max_salary) AS max_salary, AVG(s.max_salary) AS avg_salary
      ${BASE_JOINS} WHERE ${where}
    `
    const [stat] = await conn.query<StatRow[]>(STAT_SQL, vals)

    const DEPT_SQL = `
      SELECT d.dept_name AS label, COUNT(*) AS cnt
      ${BASE_JOINS} WHERE ${where}
      GROUP BY d.dept_name ORDER BY cnt DESC LIMIT 20
    `
    const TITLE_SQL = `
      SELECT tt.title AS label, COUNT(*) AS cnt
      ${BASE_JOINS} WHERE ${where}
      GROUP BY tt.title ORDER BY cnt DESC LIMIT 20
    `
    const GENDER_SQL = `
      SELECT e.gender AS label, COUNT(*) AS cnt
      ${BASE_JOINS} WHERE ${where}
      GROUP BY e.gender
    `
    const YEAR_SQL = `
      SELECT YEAR(e.hire_date) AS y, COUNT(*) AS cnt
      ${BASE_JOINS} WHERE ${where}
      GROUP BY y ORDER BY y
    `
    const HIST_SQL = `
      SELECT FLOOR(s.max_salary / 10000) * 10000 AS bucket, COUNT(*) AS cnt
      ${BASE_JOINS} WHERE ${where}
      GROUP BY bucket ORDER BY bucket
    `

    const [deptDist]   = await conn.query<LabelCount[]>(DEPT_SQL, vals)
    const [titleDist]  = await conn.query<LabelCount[]>(TITLE_SQL, vals)
    const [genderDist] = await conn.query<LabelCount[]>(GENDER_SQL, vals)
    const [byYear]     = await conn.query<YearCount[]>(YEAR_SQL, vals)
    const [buckets]    = await conn.query<BucketCount[]>(HIST_SQL, vals)

    res.json({
      total: stat[0]?.total ?? 0,
      min_salary: stat[0]?.min_salary ?? null,
      max_salary: stat[0]?.max_salary ?? null,
      avg_salary: stat[0]?.avg_salary ?? null,
      departments: deptDist,
      titles: titleDist,
      genders: genderDist,
      hiresByYear: byYear,
      salaryBuckets: buckets,
    })
  } catch (e) {
    console.error('[P3 STATS_ERROR]', e)
    res.status(500).json({ error: 'DB_QUERY_ERROR' })
  } finally {
    conn.release()
  }
})

// 필터 옵션
router.get('/problem3/employees/options', async (_req: Request, res: Response) => {
  const conn = await getConn()
  try {
    const [deptRows]  = await conn.query<RowDataPacket[]>(`SELECT dept_name FROM departments ORDER BY dept_name`)
    const [titleRows] = await conn.query<RowDataPacket[]>(`SELECT DISTINCT title FROM titles ORDER BY title`)
    res.json({
      departments: deptRows.map(r => r.dept_name as string),
      titles: titleRows.map(r => r.title as string),
    })
  } catch (e) {
    console.error('[P3 OPTIONS_ERROR]', e)
    res.status(500).json({ error: 'DB_QUERY_ERROR' })
  } finally {
    conn.release()
  }
})

export default router
