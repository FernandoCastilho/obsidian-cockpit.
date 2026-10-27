import { useLayoutEffect, useRef, useState } from 'react'
import { fromInput, useIntraday } from './useHistory.js'
import { marketDate } from './marketReturns.js'
import { mergeTicks } from './parity.js'
import { upcoming } from './agenda.js'
import Sparkline from './Sparkline.jsx'
import { heatItems, heatStrength, kpiItems, tapeItems } from './terminal.js'

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

// Minigráficos dos indicadores: o dia atual em cada moeda (arquivo intraday já usado pelo quadro de câmbio).
function useDaySeries() {
  const day = fromInput(marketDate(Date.now()))
  const usd = useIntraday('USD', day)
  const eur = useIntraday('EUR', day)
  const ok = (s) => (s.status === 'ok' ? s.data.points : [])
  return { USD: ok(usd), EUR: ok(eur), PAR: usd.status === 'ok' && eur.status === 'ok' ? mergeTicks(usd.data.points, eur.data.points, true) : [] }
}

// Indicadores do topo do Mercado. Clique abre o gráfico da moeda ou a aba de juros.
export function KpiRow({ quotes, rates, colors, onOpen, goto }) {
  const series = useDaySeries()
  const items = kpiItems(quotes, rates)
  if (!items.length) return null
  return (
    <div className="kpis" role="group" aria-label="Indicadores principais">
      {items.map((i) => {
        const points = series[i.code]
        return (
          <button key={i.key} type="button" className="kpi" style={{ '--series': i.rate ? 'var(--amber)' : colors?.[i.code] || 'var(--amber)' }} onClick={() => (i.rate ? goto('juros') : onOpen(i.code))} aria-label={`${i.label} ${i.value}${i.text ? `, ${i.text}` : ''}: ${i.rate ? 'abrir juros' : 'abrir gráfico'}`}>
            <span className="kpi-label">{i.label}{i.rate && <small>{i.key === 'di1' ? 'B3' : i.key === 'selic' ? 'meta a.a.' : 'a.a.'}</small>}</span>
            <span className="kpi-value">{i.value}</span>
            <span className={`kpi-change ${i.tone}`}>
              {i.text ? <><span aria-hidden="true">{MARK[i.tone]}</span> {i.text}</> : <span className="muted">variação indisponível</span>}
            </span>
            {points?.length > 1 && <span className="kpi-spark"><Sparkline points={points} tone={i.tone} height={30} /></span>}
          </button>
        )
      })}
    </div>
  )
}

// Mapa de variação: cor pela direção e intensidade pelo tamanho do movimento; sem dado, sem bloco.
export function HeatMap({ quotes, rates, onOpen, goto }) {
  const items = heatItems(quotes, rates)
  if (!items.length) return null
  return (
    <div className="heat" role="group" aria-label="Mapa de variação do dia">
      <h3>Mapa de variação · dia <small>cor = direção · intensidade = tamanho do movimento</small></h3>
      <div className="heat-grid">
        {items.map((i) => (
          <button key={i.key} type="button" className={`heat-tile ${i.tone}`} style={{ '--k': heatStrength(i) }} onClick={() => (i.rate ? goto('juros') : onOpen(i.code))}>
            <span>{i.label}</span>
            <b>{i.text}</b>
          </button>
        ))}
      </div>
    </div>
  )
}

export function Panel({ title, note, className = '', children }) {
  return (
    <section className={`desk-panel ${className}`}>
      <header>
        <h2>{title}</h2>
        {note && <small>{note}</small>}
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
