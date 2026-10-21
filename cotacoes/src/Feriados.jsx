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
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const y = now.getFullYear()
  const map = new Map()
  for (const c of LIST) {
    for (const yr of [y, y + 1]) {
      for (const [d, name] of holidayMap(c.id, yr, hol?.ctx)) {
        if (d < today || ms(d) - ms(today) > 366 * 864e5) continue
        const k = `${d}|${name}`
        if (!map.has(k)) map.set(k, { d, name, where: [] })
        map.get(k).where.push(c.where)
      }
    }
  }
  const rows = [...map.values()].sort((a, b) => a.d.localeCompare(b.d) || a.name.localeCompare(b.name))
  return (
    <section className="macro feriados">
      {rows.length ? (
        <ul className="fer-list">
          {rows.map((r) => {
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
      ) : <p className="status">Nenhum feriado nos próximos 12 meses.</p>}
    </section>
  )
}
