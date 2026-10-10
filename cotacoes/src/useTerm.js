import { useState } from 'react'
import { busDaysIn } from './holidays.js'

// Prazo de uma operação medido pela curva DI: vencimento, dias corridos e dias úteis (feriados nacionais).
export function useTerm(curves, hol, defaultDays = 180) {
  const br = curves.data?.br
  const today = br?.compare?.find((c) => c.id === 'hoje')
  const pts = today ? br.curves[today.date] : null
  const base = today?.date
  const ms = (s) => Date.parse(`${s}T12:00:00Z`)
  const iso = (days) => new Date(ms(base) + days * 864e5).toISOString().slice(0, 10)
  const maxD = pts ? Math.max(...pts.map((p) => p[0])) : 0
  const maxCal = Math.floor((maxD / 252) * 365)
  const maxIso = base ? iso(maxCal) : ''
  const [due, setDue] = useState('')
  const [daysTxt, setDaysTxt] = useState(String(defaultDays))
  const end = due && base ? (due < base ? base : due > maxIso ? maxIso : due) : base ? iso(Math.min(defaultDays, maxCal)) : ''
  const calDays = base && end ? Math.round((ms(end) - ms(base)) / 864e5) : 0
  const d = base ? busDaysIn(base, end, ['BR'], hol.ctx) : 0
  const pickDue = (s) => {
    setDue(s)
    setDaysTxt(String(Math.round((ms(s) - ms(base)) / 864e5)))
  }
  const typeDays = (v) => {
    setDaysTxt(v)
    const n = parseInt(v, 10)
    if (n > 0) setDue(iso(Math.min(n, maxCal)))
  }
  return { pts, base, today, maxCal, maxIso, iso, end, calDays, d, daysTxt, pickDue, typeDays }
}
