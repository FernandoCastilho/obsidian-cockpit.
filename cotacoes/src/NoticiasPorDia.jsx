import { useMemo, useState } from 'react'
import { dayOf, groupByDay, searchItems } from './reforma.js'

const TZ = 'America/Sao_Paulo'
const dayLabel = (key, today) => {
  const d = new Date(`${key}T12:00:00Z`)
  const w = d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })
  const dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
  return key === today ? `Hoje · ${dm}` : `${w.charAt(0).toUpperCase()}${w.slice(1)} · ${dm}`
}
const short = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).replace('.', '')
const hm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

// Matérias da semana por dia, com filtro de dia e busca. data = { items, windowDays, stale }. Usada por Reforma tributária, Setores e Insumos.
export default function NoticiasPorDia({ data, label = 'matérias', ariaLabel = 'Matérias da semana' }) {
  const [day, setDay] = useState('all')
  const [q, setQ] = useState('')
  const today = dayOf(Date.now())
  const found = useMemo(() => searchItems(data?.items ?? [], q), [data, q])
  const days = useMemo(() => groupByDay(found), [found])
  const allDays = useMemo(() => groupByDay(data?.items ?? []), [data])
  const shown = day === 'all' ? days : days.filter((d) => d.key === day)
  const total = shown.reduce((n, d) => n + d.count, 0)
  return (
    <div className="reforma" aria-label={ariaLabel}>
      {data?.stale && <p className="status stale" role="status">Atualização indisponível na última coleta; mantidas as matérias anteriores.</p>}
      <div className="reforma-controls">
        <div className="seg reforma-days" role="group" aria-label="Dia da semana">
          <button type="button" aria-pressed={day === 'all'} onClick={() => setDay('all')}>Semana · {found.length}</button>
          {allDays.map((d) => <button key={d.key} type="button" aria-pressed={day === d.key} onClick={() => setDay(d.key)}>{d.key === today ? 'Hoje' : short(d.key)} · {days.find((x) => x.key === d.key)?.count ?? 0}</button>)}
        </div>
        <label className="reforma-busca">Buscar nas matérias
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: preço, China, tarifa" />
        </label>
      </div>
      {shown.length === 0 ? <p className="status" role="status">{data.items.length ? 'Nenhuma matéria para esse filtro.' : 'Nenhuma matéria sobre o tema nos últimos 7 dias.'}</p> : (
        <div className="reforma-list">
          <p className="muted reforma-count" role="status">{total} {total === 1 ? 'matéria' : 'matérias'} · últimos {data.windowDays} dias · horário de Brasília. Títulos da imprensa agrupados por dia; não são resumo nem análise do conteúdo.</p>
          {shown.map((d) => (
            <section key={d.key} aria-label={dayLabel(d.key, today)}>
              <h3 className="reforma-day">{dayLabel(d.key, today)} <small>{d.count} {d.count === 1 ? 'matéria' : 'matérias'} · {d.sources.slice(0, 3).map(([s, n]) => `${s} (${n})`).join(', ')}</small></h3>
              <ul>
                {d.items.map((n) => (
                  <li key={n.link}>
                    <time dateTime={new Date(n.t).toISOString()}>{hm(n.t)}</time>
                    <span><a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a><small>{n.source}</small></span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
