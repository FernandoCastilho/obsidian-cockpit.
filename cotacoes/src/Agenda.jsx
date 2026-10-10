import { useMemo } from 'react'
import { CHECKED, upcoming } from './agenda.js'

const fmtDay = (t) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).replace('.', '')
const fmtTime = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const dayKey = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

export default function Agenda() {
  const events = useMemo(() => upcoming(new Date(), 21), [])
  const today = dayKey(Date.now())
  return (
    <section className="agenda" aria-labelledby="agenda-h">
      <h2 id="agenda-h">Agenda de mercado <small>próximos 21 dias · horário de Brasília</small></h2>
      {events.length ? (
        <ul>
          {events.map((e) => (
            <li key={e.kind + e.t} className={dayKey(e.t) === today ? 'today' : ''} title={`Fonte: ${e.source}`}>
              <span className="when">
                <b>{dayKey(e.t) === today ? 'Hoje' : fmtDay(e.t)}</b> {fmtTime(e.t)}
              </span>
              <span className={`tag tag-${e.kind.replace(/[^A-Za-z]/g, '')}`}>{e.kind}</span>
              <span className="what">{e.label}</span>
              {e.tentative && <em className="tent">previsto</em>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="status">Sem eventos cadastrados nos próximos dias.</p>
      )}
      <p className="status">
        Copom, FOMC e payroll seguem os calendários oficiais; IPCA e IPCA-15 são datas previstas, a conferir no IBGE. Lista conferida em {CHECKED.split('-').reverse().join('/')}.
      </p>
    </section>
  )
}
