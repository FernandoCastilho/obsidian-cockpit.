import RefreshButton from './RefreshButton.jsx'
import { useLayoutEffect, useRef, useState } from 'react'
import { fromInput, useIntraday } from './useHistory.js'
import { marketDate } from './marketReturns.js'
import { mergeTicks } from './parity.js'
import { upcoming } from './agenda.js'
import Sparkline from './Sparkline.jsx'
import { kpiItems, tapeItems } from './terminal.js'
import Flag from './Flag.jsx'

const MARK = { up: '▲', down: '▼', flat: '■' }

// Faixa corrida sob a barra superior (só no computador). Se os itens não cabem, ela rola devagar e pausa sob o mouse.
export function Tape({ quotes, rates, oil }) {
  const items = tapeItems(quotes, rates, oil)
  const box = useRef(null)
  const set = useRef(null)
  const [run, setRun] = useState(false)
  const [secs, setSecs] = useState(60)
  const sig = items.map((i) => `${i.key}${i.value}${i.text ?? ''}`).join('|')
  useLayoutEffect(() => {
    const check = () => {
      if (!box.current || !set.current) return
      const w = set.current.scrollWidth
      setRun(w > box.current.clientWidth + 2)
      setSecs(Math.max(30, Math.round(w / 40)))
    }
    check()
    const ro = new ResizeObserver(check)
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [sig])
  if (!items.length) return <div className="tape" aria-hidden="true" />
  const list = (hidden) => (
    <div className="tape-set" ref={hidden ? undefined : set} aria-hidden={hidden || undefined}>
      {items.map((i) => (
        <span key={i.key} className="tape-item">
          <b>{i.label}</b>
          {i.value}
          {i.text && <em className={i.tone}>{i.text}</em>}
          {i.note && <em className="flat">{i.note}</em>}
        </span>
      ))}
    </div>
  )
  return (
    <div className="tape" ref={box} role="region" aria-label="Cotações e juros de referência" tabIndex={run ? 0 : undefined}>
      <div className={`tape-track${run ? ' run' : ''}`} style={{ '--tape-secs': `${secs}s` }}>
        {list(false)}
        {run && list(true)}
      </div>
    </div>
  )
}

// Minigráficos dos indicadores: o dia atual em cada moeda (arquivo intraday já usado pelo quadro de câmbio). Sem amostras de hoje
// (madrugada, fim de semana), usa o último pregão com amostras, que o arquivo indica em `previousDay`.
function useDaySeries() {
  const today = fromInput(marketDate(Date.now()))
  const usd = useIntraday('USD', today)
  const eur = useIntraday('EUR', today)
  const prev = usd.previousDay || eur.previousDay || null
  const prevDay = prev ? fromInput(prev) : today
  const usdPrev = useIntraday('USD', prevDay, !prev)
  const eurPrev = useIntraday('EUR', prevDay, !prev)
  const ok = (s) => (s.status === 'ok' ? s.data.points : [])
  const pick = (now, before) => (ok(now).length > 1 ? ok(now) : ok(before))
  const u = pick(usd, usdPrev)
  const e = pick(eur, eurPrev)
  // a paridade só junta as duas séries se vêm do mesmo pregão
  const sameSession = ok(usd).length > 1 === ok(eur).length > 1
  return { USD: u, EUR: e, PAR: u.length > 1 && e.length > 1 && sameSession ? mergeTicks(u, e, true) : [] }
}

// Indicadores do topo do Mercado, com o título "Mapa de variação – dia" e, abaixo dos quadros, a linha da última consulta (`status`).
// Clique abre o gráfico da moeda ou a aba de juros.
export function KpiRow({ quotes, rates, oil, colors, onOpen, onRate, onOil, goto, status }) {
  const series = useDaySeries()
  const items = kpiItems(quotes, rates, oil)
  if (!items.length) return status ?? null
  return (
    <section className="kpi-block" aria-labelledby="kpi-title">
      <h2 id="kpi-title" className="kpi-title">Mapa de variação – dia</h2>
    <div className="kpis" role="group" aria-label="Indicadores principais">
      {items.map((i) => {
        const points = i.key === 'EURUSD' && i.change == null ? [] : series[i.code]
        return (
          <button key={i.key} type="button" className="kpi" style={{ '--series': i.rate || i.key === 'BRENT' ? 'var(--amber)' : colors?.[i.code] || 'var(--amber)' }} onClick={() => (i.rate ? onRate(i.key) : i.key === 'BRENT' ? onOil() : onOpen(i.code))} aria-label={`${i.label} ${i.value}${i.text ? `, ${i.text}` : ''}: abrir gráfico`}>
            <span className="kpi-label"><span className="kpi-name"><Flag code={i.rate ? 'BRL' : i.code} width={16} height={11} />{i.label}</span>{i.rate && <small>{i.key === 'di1' ? 'B3' : i.key === 'selic' ? 'meta a.a.' : 'a.a.'}</small>}{i.key === 'BRENT' && <small>US$/bbl{i.note ? ` · ${i.note}` : ''}</small>}</span>
            <span className="kpi-value">{i.value}</span>
            <span className={`kpi-change ${i.tone}`}>
              {i.text ? <><span aria-hidden="true">{MARK[i.tone]}</span> {i.text}</> : <span className="muted" title={i.reason || undefined}>var. indisponível</span>}
            </span>
            {points?.length > 1 && <span className="kpi-spark"><Sparkline points={points} tone={i.tone} height={30} /></span>}
          </button>
        )
      })}
    </div>
      {status}
    </section>
  )
}

export function Panel({ title, note, className = '', refresh, children }) {
  return (
    <section className={`desk-panel ${className}`}>
      <header>
        <h2>{title}</h2>
        {note && <small>{note}</small>}
        {refresh && <RefreshButton files={refresh} label={title} />}
      </header>
      <div className="desk-panel-body">{children}</div>
    </section>
  )
}

const day = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
const hour = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

export function AgendaList({ goto, limit = 5 }) {
  const events = upcoming(new Date(), 21).slice(0, limit)
  if (!events.length) return <p className="status">Sem eventos nos próximos dias.</p>
  return (
    <ul className="desk-agenda">
      {events.map((e) => (
        <li key={e.kind + e.t}>
          <button type="button" onClick={() => goto('cenarios')}>
            <time dateTime={new Date(e.t).toISOString()}>{day(e.t)} <b>{hour(e.t)}</b></time>
            <span className="tag">{e.kind}</span>
            <span>{e.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
