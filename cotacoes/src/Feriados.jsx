import { useState } from 'react'
import { holidayMap } from './holidays.js'

// Aba Feriados: lista do ano por praça.
const LIST = [
  { id: 'BR', title: 'Nacionais' },
  { id: 'SP', title: 'São Paulo' },
  { id: 'MG', title: 'Minas Gerais' },
  { id: 'NY', title: 'Nova York' },
]
const fmt = (d) => {
  const dt = new Date(`${d}T12:00:00`)
  const wd = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })} · ${wd}`
}

export default function Feriados({ hol }) {
  const y0 = new Date().getFullYear()
  const [year, setYear] = useState(y0)
  const today = new Date().toISOString().slice(0, 10)
  return (
    <section className="macro feriados" aria-labelledby="fer-h">
      <div className="sec-head">
        <h2 id="fer-h">Feriados</h2>
        <div className="seg" role="group" aria-label="Ano">
          {[y0, y0 + 1].map((y) => (
            <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
      </div>
      {LIST.map((c) => {
        const days = [...holidayMap(c.id, year, hol?.ctx).entries()].sort((a, b) => a[0].localeCompare(b[0]))
        return (
          <div key={c.id} className="fer-block">
            <h3>{c.title}</h3>
            {days.length ? (
              <table className="fer-table">
                <tbody>
                  {days.map(([d, name]) => (
                    <tr key={d} className={d < today ? 'past' : ''}>
                      <td>{fmt(d)}</td>
                      <td>{name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="status">Sem dados para {year}.</p>}
          </div>
        )
      })}
    </section>
  )
}
