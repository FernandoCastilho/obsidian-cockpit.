import { useMemo, useState } from 'react'
import { isWeekendBR } from './market.js'
import Explain from './Explain.jsx'
import { Plot, fmtDate, useWidth } from './HistoryChart.jsx'
import { useMacro } from './useMacro.js'
import SofrChart from './Sofr.jsx'

const n2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rate = (v) => `${n2(v)}% a.a.`
const DAY = 864e5
const COLORS = { CDI: '#4aa3a2', SELIC: '#a98bd6' }

// Meta Selic só tem os dias de mudança: desenha em degraus.
const stepify = (pts) => pts.flatMap((p, i) => (i ? [{ t: p.t, bid: pts[i - 1].bid }, p] : [p]))

function RateChart({ id, title, subtitle, color, points, fmt, label, note, actions, help }) {
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
          <Plot points={points} width={width} color={color} code={id} fmt={fmt} label={label} nice />
        ) : (
          <div className="placeholder" style={{ height: 240 }}>Sem dados no período.</div>
        )}
      </div>
      {note && <p className="status">{note}</p>}
    </article>
  )
}

const toInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromInput = (v) => {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Períodos só dos juros (independentes do câmbio). days: 0 = desde 1999.
const PRESETS = [
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: '180', label: '6 meses', days: 180 },
  { id: '365', label: '1 ano', days: 365 },
  { id: '1825', label: '5 anos', days: 1825 },
  { id: '3650', label: '10 anos', days: 3650 },
  { id: 'all', label: 'Desde 1999', days: 0 },
]
const rangeFor = (days) => {
  const end = startOfToday()
  const start = days ? new Date(end.getTime() - days * DAY) : new Date(1999, 0, 1)
  return { start, end }
}

function RatesPeriod({ range, preset, onPreset, onDates }) {
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

function CdiChart({ macro, range }) {
  const from = range.start.getTime()
  const to = range.end.getTime() + DAY
  const points = useMemo(() => macro.cdi.filter(([t]) => t >= from && t <= to).map(([t, v]) => ({ t, bid: v })), [macro, from, to])
  const first = macro.cdi[0]
  const last = macro.cdi[macro.cdi.length - 1]
  return (
    <RateChart
      id="CDI"
      title="CDI"
      help="cdi"
      subtitle="B3 · taxa anualizada"
      color={COLORS.CDI}
      points={points}
      fmt={rate}
      label="CDI"
      note={`${last ? `Último: ${rate(last[1])} em ${fmtDate(last[0], true)} · ` : ''}${first ? `Série disponível desde ${fmtDate(first[0], true)} · ` : ''}Fonte: B3, via Banco Central (SGS 4389).`}
    />
  )
}

// Meta Selic só registra os dias de mudança: recorta no período e desenha em degraus.
function SelicChart({ macro, range }) {
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
  const last = all[all.length - 1]
  return (
    <RateChart
      id="SELIC"
      title="Selic"
      help="selic"
      subtitle="Meta definida pelo Copom"
      color={COLORS.SELIC}
      points={points}
      fmt={rate}
      label="Meta Selic"
      note={`${last ? `Atual: ${rate(last[1])} · ` : ''}Fonte: Banco Central (SGS 432).`}
    />
  )
}

const FOCUS_FMT = {
  Selic: (v) => `${n2(v)}%`,
  IPCA: (v) => `${n2(v)}%`,
  PIB: (v) => `${n2(v)}%`,
  Câmbio: (v) => `R$ ${n2(v)}`,
}

function FocusTable({ focus }) {
  const years = [...new Set(focus.rows.flatMap((r) => Object.keys(r.values)))].sort().slice(0, 4)
  const fmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR')
  const release = focus.release ?? focus.date
  return (
    <article className="chart wide">
      <header>
        <h3>
          Boletim Focus
          <Explain id="focus" />
          <small>divulgado na segunda-feira, {fmt(release)} · mediana das expectativas</small>
        </h3>
      </header>
      <div className="scroll">
        <table className="focus-table">
          <thead>
            <tr>
              <th />
              {years.map((y) => <th key={y}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {focus.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                {years.map((y) => {
                  const v = r.values[y]
                  return (
                    <td key={y} title={v ? `Mín. ${n2(v.min)} · Máx. ${n2(v.max)} · ${v.n} respondentes` : undefined}>
                      {v ? (FOCUS_FMT[r.label] ?? n2)(v.median) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="status">
        O Focus sai às segundas-feiras com as expectativas coletadas até a sexta anterior{focus.release ? ` (aqui, até ${fmt(focus.date)})` : ''}. Selic e IPCA em % a.a. no fim do ano; PIB em % de crescimento. Fonte: Banco Central do Brasil.
      </p>
    </article>
  )
}

const STALE_LABELS = { cdi: 'CDI', selic: 'Selic', sofr: 'SOFR', sofrAvg: 'médias da SOFR', focus: 'Boletim Focus', ptax: 'PTAX' }
const stamp = (t) => (t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'data desconhecida')

export default function Macro() {
  const m = useMacro()
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
        <h2>Juros e expectativas</h2>
        <RatesPeriod range={range} preset={preset} onPreset={onPreset} onDates={onDates} />
      </div>
      {m.status === 'loading' && <p className="status">Carregando dados do Banco Central…</p>}
      {m.status === 'error' && <p className="status">Dados do Banco Central indisponíveis no momento ({m.error}).</p>}
      {m.status === 'ok' && m.data.generatedAt && (Date.now() - m.data.generatedAt > 3 * 3600e3) && !isWeekendBR() && (
        <p className="status stale">Atenção: os dados do Banco Central foram coletados há mais de 3 horas; a atualização automática pode ter parado.</p>
      )}
      {m.status === 'ok' && Object.keys(m.data.stale ?? {}).length > 0 && (
        <p className="status stale">
          Fonte indisponível na última atualização; mantido o último dado publicado: {Object.entries(m.data.stale).map(([k, t]) => `${STALE_LABELS[k] ?? k} (coletado em ${stamp(t)})`).join(', ')}.
        </p>
      )}
      {m.status === 'ok' && (
        <div className="charts">
          {m.data.cdi?.length ? <CdiChart macro={m.data} range={range} /> : <p className="status">CDI indisponível no momento.</p>}
          {m.data.selic?.length ? <SelicChart macro={m.data} range={range} /> : <p className="status">Selic indisponível no momento.</p>}
          {m.data.sofr?.length ? <SofrChart macro={m.data} range={range} /> : <p className="status">SOFR indisponível no momento.</p>}
          {m.data.focus ? <FocusTable focus={m.data.focus} /> : <p className="status">Boletim Focus indisponível no momento.</p>}
        </div>
      )}
    </section>
  )
}
