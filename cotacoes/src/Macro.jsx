import RefreshButton from './RefreshButton.jsx'
import { Aviso } from './Avisos.jsx'
import { useMemo, useState } from 'react'
import { isWeekendBR } from './market.js'
import Explain from './Explain.jsx'
import { Plot, fmtDate, useWidth } from './HistoryChart.jsx'
import SofrChart from './Sofr.jsx'

const n2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rate = (v) => `${n2(v)}% a.a.`
const DAY = 864e5
const COLORS = { CDI: '#4aa3a2', SELIC: '#a98bd6' }

// Meta Selic só tem os dias de mudança: desenha em degraus.
const stepify = (pts) => pts.flatMap((p, i) => (i ? [{ t: p.t, bid: pts[i - 1].bid }, p] : [p]))

export function RateChart({ id, title, subtitle, color, points, history, step, scales, fmt, label, note, actions, help, refresh = ['macro.json'] }) {
  const [ref, width] = useWidth()
  const ok = points && points.length > 1
  const diff = ok ? points[points.length - 1].bid - points[0].bid : 0
  const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  return (
    <article className="chart" style={{ '--series': color }}>
      <header>
        <h3>
          <i className="swatch" /> {title}
          <small>{subtitle}</small>
          {help && <Explain id={help} />}
        </h3>
        <div className="parity-actions">
          <RefreshButton files={refresh} label={title} />
          {ok && (
            <div className={`pct ${trend}`}>
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'} {Math.abs(diff).toFixed(2).replace('.', ',')} p.p.
              <small>no período</small>
            </div>
          )}
        </div>
      </header>
      {actions && <div className="chart-actions">{actions}</div>}
      <div ref={ref}>
        {ok ? (
          <Plot points={points} history={history} step={step} scales={scales} width={width} color={color} code={id} fmt={fmt} label={label} nice />
        ) : (
          <div className="placeholder" style={{ height: 120 }}>Sem dados no período.</div>
        )}
      </div>
      {note && <Aviso title={title}><p>{note}</p></Aviso>}
    </article>
  )
}

export const toInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromInput = (v) => {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Períodos só dos juros (independentes do câmbio). days: 0 = desde 1999.
export const PRESETS = [
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: '180', label: '6 meses', days: 180 },
  { id: '365', label: '1 ano', days: 365 },
  { id: '1825', label: '5 anos', days: 1825 },
  { id: '3650', label: '10 anos', days: 3650 },
  { id: 'all', label: 'Desde 1999', days: 0 },
]
export const rangeFor = (days) => {
  const end = startOfToday()
  const start = days ? new Date(end.getTime() - days * DAY) : new Date(1999, 0, 1)
  return { start, end }
}

export function RatesPeriod({ range, preset, onPreset, onDates }) {
  const today = toInput(new Date())
  return (
    <div className="period">
      <div className="seg" role="group" aria-label="Período dos juros">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => onPreset(p)}>
            {p.label}
          </button>
        ))}
      </div>
      <label>
        De
        <input type="date" id="juros-de" max={toInput(range.end)} value={toInput(range.start)} onChange={(e) => e.target.value && onDates(e.target.value, toInput(range.end))} />
      </label>
      <label>
        Até
        <input type="date" id="juros-ate" max={today} min={toInput(range.start)} value={toInput(range.end)} onChange={(e) => e.target.value && onDates(toInput(range.start), e.target.value)} />
      </label>
    </div>
  )
}

export function CdiChart({ macro, range }) {
  const from = range.start.getTime()
  const to = range.end.getTime() + DAY
  const points = useMemo(() => macro.cdi.filter(([t]) => t >= from && t <= to).map(([t, v]) => ({ t, bid: v })), [macro, from, to])
  const history = useMemo(() => macro.cdi.map(([t, v]) => ({ t, bid: v })), [macro])
  const first = macro.cdi[0]
  const last = macro.cdi[macro.cdi.length - 1]
  return (
    <RateChart
      id="CDI"
      title="Brasil · CDI"
      help="cdi"
      subtitle="B3 · taxa anualizada"
      color={COLORS.CDI}
      points={points}
      history={history}
      fmt={rate}
      label="CDI"
      note={`${last ? `Último: ${rate(last[1])} em ${fmtDate(last[0], true)} · ` : ''}${first ? `Série disponível desde ${fmtDate(first[0], true)} · ` : ''}Fonte: B3, via Banco Central (SGS 4389).`}
    />
  )
}

// Meta Selic só registra os dias de mudança: recorta no período e desenha em degraus.
export function SelicChart({ macro, range }) {
  const all = macro.selic
  const from = range.start.getTime()
  const to = range.end.getTime() + DAY
  const points = useMemo(() => {
    const start = Math.max(0, all.findLastIndex(([t]) => t <= from))
    const cut = all.slice(start).filter(([t], i) => i === 0 || t <= to)
    if (!cut.length) return []
    const pts = cut.map(([t, v], i) => ({ t: i === 0 ? Math.max(t, from) : t, bid: v }))
    // estende o degrau vigente até o fim do período (ou até hoje)
    const end = Math.min(to - DAY, Date.now())
    if (pts[pts.length - 1].t < end) pts.push({ t: end, bid: pts[pts.length - 1].bid })
    return stepify(pts)
  }, [all, from, to])
  const history = useMemo(() => stepify(all.map(([t, v]) => ({ t, bid: v }))), [all])
  const last = all[all.length - 1]
  return (
    <RateChart
      id="SELIC"
      title="Brasil · Selic meta"
      help="selic"
      subtitle="Meta definida pelo Copom"
      color={COLORS.SELIC}
      points={points}
      history={history}
      step
      fmt={rate}
      label="Meta Selic"
      note={`${last ? `Atual: ${rate(last[1])} · ` : ''}Fonte: Banco Central (SGS 432).`}
    />
  )
}

const STALE_LABELS = { cdi: 'CDI', selic: 'Selic', sofr: 'SOFR', sofrAvg: 'médias da SOFR', focus: 'Boletim Focus', ptax: 'PTAX' }
const stamp = (t) => (t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'data desconhecida')

export default function Macro({ macro: m }) {
  const [preset, setPreset] = useState('365')
  const [range, setRange] = useState(() => rangeFor(365))
  const onPreset = (p) => {
    setPreset(p.id)
    setRange(rangeFor(p.days))
  }
  const onDates = (a, b) => {
    let start = fromInput(a)
    let end = fromInput(b)
    if (start > end) [start, end] = [end, start]
    setPreset('custom')
    setRange({ start, end })
  }
  return (
    <section className="macro">
      <div className="history-head">
        <h2>Histórico das taxas de juros</h2>
        <RatesPeriod range={range} preset={preset} onPreset={onPreset} onDates={onDates} />
      </div>
      {m.status === 'loading' && <p className="status">Carregando dados do Banco Central…</p>}
      {m.status === 'error' && <p className="status">Dados do Banco Central indisponíveis no momento ({m.error}).</p>}
      {m.stale && <p className="status stale">Atualização pendente; mantidas as últimas taxas disponíveis.</p>}
      {m.status === 'ok' && m.data.generatedAt && (Date.now() - m.data.generatedAt > 3 * 3600e3) && !isWeekendBR() && (
        <p className="status stale">Atenção: os dados do Banco Central foram coletados há mais de 3 horas; a atualização automática pode ter parado.</p>
      )}
      {m.status === 'ok' && Object.keys(m.data.stale ?? {}).some(k => ['cdi', 'selic', 'sofr', 'sofrAvg'].includes(k)) && (
        <p className="status stale">
          Fonte indisponível na última atualização; mantido o último dado publicado: {Object.entries(m.data.stale).filter(([k]) => ['cdi', 'selic', 'sofr', 'sofrAvg'].includes(k)).map(([k, t]) => `${STALE_LABELS[k] ?? k} (coletado em ${stamp(t)})`).join(', ')}.
        </p>
      )}
      {m.status === 'ok' && (
        <div className="charts">
          {m.data.cdi?.length ? <CdiChart macro={m.data} range={range} /> : <p className="status">CDI indisponível no momento.</p>}
          {m.data.selic?.length ? <SelicChart macro={m.data} range={range} /> : <p className="status">Selic indisponível no momento.</p>}
          {m.data.sofr?.length ? <SofrChart macro={m.data} range={range} /> : <p className="status">SOFR indisponível no momento.</p>}
        </div>
      )}
    </section>
  )
}
