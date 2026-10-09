import { useMemo, useState } from 'react'
import { Plot, fmtDate, useWidth } from './HistoryChart.jsx'
import { useMacro } from './useMacro.js'

const n2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rate = (v) => `${n2(v)}% a.a.`
const DAY = 864e5
const COLORS = { CDI: '#4aa3a2', SELIC: '#a98bd6' }

// Meta Selic só tem os dias de mudança: desenha em degraus.
const stepify = (pts) => pts.flatMap((p, i) => (i ? [{ t: p.t, bid: pts[i - 1].bid }, p] : [p]))

function RateChart({ id, title, subtitle, color, points, fmt, label, note, actions }) {
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

function CdiChart({ macro, range, day }) {
  // CDI é diário: no modo intraday mostra os últimos 30 dias.
  const [from, to] = day ? [Date.now() - 30 * DAY, Date.now()] : [range.start.getTime(), range.end.getTime() + DAY]
  const points = useMemo(() => macro.cdi.filter(([t]) => t >= from && t <= to).map(([t, v]) => ({ t, bid: v })), [macro, from, to])
  const last = macro.cdi[macro.cdi.length - 1]
  return (
    <RateChart
      id="CDI"
      title="CDI"
      subtitle="B3 · taxa anualizada"
      color={COLORS.CDI}
      points={points}
      fmt={rate}
      label="CDI"
      note={`${last ? `Último: ${rate(last[1])} em ${fmtDate(last[0], true)} · ` : ''}${day ? 'Série diária: exibindo os últimos 30 dias · ' : ''}Fonte: B3, via Banco Central (SGS 4389).`}
    />
  )
}

const SELIC_RANGES = [[5, '5 anos'], [10, '10 anos'], [0, 'Desde 1999']]

function SelicChart({ macro }) {
  const [years, setYears] = useState(10)
  const all = macro.selic
  const points = useMemo(() => {
    const from = years ? Date.now() - years * 365 * DAY : 0
    // mantém o degrau vigente no início do recorte
    let start = all.findLastIndex(([t]) => t <= from)
    start = Math.max(0, start)
    const cut = all.slice(start).map(([t, v], i) => ({ t: i === 0 ? Math.max(t, from) : t, bid: v }))
    return stepify(cut)
  }, [all, years])
  const last = all[all.length - 1]
  return (
    <RateChart
      id="SELIC"
      title="Selic"
      subtitle="Meta definida pelo Copom"
      color={COLORS.SELIC}
      points={points}
      fmt={rate}
      label="Meta Selic"
      note={`${last ? `Atual: ${rate(last[1])} · ` : ''}Fonte: Banco Central (SGS 432).`}
      actions={
        <div className="seg small" role="group" aria-label="Período da Selic">
          {SELIC_RANGES.map(([y, label]) => (
            <button key={y} type="button" aria-pressed={years === y} onClick={() => setYears(y)}>
              {label}
            </button>
          ))}
        </div>
      }
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
  const date = new Date(`${focus.date}T12:00:00`).toLocaleDateString('pt-BR')
  return (
    <article className="chart wide">
      <header>
        <h3>
          Boletim Focus
          <small>mediana das expectativas de mercado · {date}</small>
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
      <p className="status">Selic e IPCA em % a.a. no fim do ano; PIB em % de crescimento. Fonte: Banco Central do Brasil (Pesquisa Focus).</p>
    </article>
  )
}

export default function Macro({ range, day }) {
  const m = useMacro()
  return (
    <section className="macro">
      <div className="history-head">
        <h2>Juros e expectativas</h2>
      </div>
      {m.status === 'loading' && <p className="status">Carregando dados do Banco Central…</p>}
      {m.status === 'error' && <p className="status">Dados do Banco Central indisponíveis no momento ({m.error}).</p>}
      {m.status === 'ok' && (
        <div className="charts">
          {m.data.cdi?.length ? <CdiChart macro={m.data} range={range} day={day} /> : <p className="status">CDI indisponível no momento.</p>}
          {m.data.selic?.length ? <SelicChart macro={m.data} /> : <p className="status">Selic indisponível no momento.</p>}
          {m.data.focus ? <FocusTable focus={m.data.focus} /> : <p className="status">Boletim Focus indisponível no momento.</p>}
        </div>
      )}
    </section>
  )
}
