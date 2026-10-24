import { useState } from 'react'
import './Feriados.css'
import { groupHolidayRows } from './holidayView.js'
import { holidayMap } from './holidays.js'

// Aba Feriados: próximos 12 meses, em ordem de data, com o local e quantos dias faltam.
const LIST = [
  { id: 'BR', where: 'Nacional' },
  { id: 'SPE', where: 'Estado de SP' },
  { id: 'SPC', where: 'São Paulo (capital)' },
  { id: 'SOR', where: 'Sorocaba' },
  { id: 'BAR', where: 'Barueri (Alphaville)' },
  { id: 'MG', where: 'Belo Horizonte' },
  { id: 'CVL', where: 'Cascavel' },
  { id: 'LDA', where: 'Londrina' },
  { id: 'MGA', where: 'Maringá' },
  { id: 'NY', where: 'Nova York' },
]
const ms = (d) => new Date(`${d}T12:00:00`).getTime()
const fmt = (d) => {
  const dt = new Date(`${d}T12:00:00`)
  const wd = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return { date: dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }), wd }
}
const left = (n) => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `${n} dias`)

export default function Feriados({ hol }) {
  const [place, setPlace] = useState('all')
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const y = now.getFullYear()
  const map = new Map()
  for (const c of LIST) {
    for (const yr of [y, y + 1]) {
      for (const [d, name] of holidayMap(c.id, yr, hol?.ctx)) {
        if (d < today || ms(d) - ms(today) > 366 * 864e5) continue
        const k = `${d}|${name}`
        if (!map.has(k)) map.set(k, { d, name, where: [], places: [] })
        map.get(k).where.push(c.where)
        map.get(k).places.push(c.id)
      }
    }
  }
  const groups = groupHolidayRows([...map.values()], place)
  return (
    <section className="macro feriados" aria-labelledby="feriados-title">
      <div className="history-head">
        <div>
          <h1 id="feriados-title">Próximos feriados</h1>
          <p className="fer-caption">Próximos 12 meses · datas e praças de referência</p>
        </div>
        <label className="fer-filter">Praça
          <select value={place} onChange={(event) => setPlace(event.target.value)}>
            <option value="all">Todas as praças</option>
            {LIST.map((item) => <option key={item.id} value={item.id}>{item.where}</option>)}
          </select>
        </label>
      </div>
      <div aria-live="polite" aria-atomic="true" className="fer-count">
        {groups.reduce((count, group) => count + group.rows.length, 0)} feriados nesta seleção
      </div>
      {groups.length ? groups.map((group) => (
        <section className="fer-month" key={group.month} aria-labelledby={`month-${group.month}`}>
          <h2 id={`month-${group.month}`}>{new Date(`${group.month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
          <ul className="fer-list">
          {group.rows.map((r) => {
            const f = fmt(r.d)
            const n = Math.round((ms(r.d) - ms(today)) / 864e5)
            return (
              <li key={`${r.d}${r.name}`}>
                <div className="fer-date"><b>{f.date}</b><small>{f.wd}</small></div>
                <div className="fer-body"><span>{r.name}</span><small>{r.where.join(' · ')}</small></div>
                <div className={`fer-left${n <= 7 ? ' soon' : ''}`}>{left(n)}</div>
              </li>
            )
          })}
          </ul>
        </section>
      )) : <p className="status">Nenhum feriado nesta praça nos próximos 12 meses.</p>}
    </section>
  )
}
