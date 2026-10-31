import { useMemo } from 'react'
import ChartFilters from './ChartFilters.jsx'
import DateRangePicker from './DateRangePicker.jsx'
import { Plot, useWidth } from './HistoryChart.jsx'
import { dmy } from './format.js'

export const PRESETS = [[3, '3 meses'], [6, '6 meses'], [12, '12 meses'], [24, '2 anos'], [60, '5 anos'], ['all', 'Tudo']]
const tOf = (iso) => Date.parse(`${iso}T12:00:00Z`)
const startFor = (last, months) => { const d = new Date(tOf(last)); d.setUTCMonth(d.getUTCMonth() - months); return d.toISOString().slice(0, 10) }

// Gráfico de uma série [{period: AAAA-MM-DD, value}] com período (atalhos e intervalo, controlados por quem usa, para valer para todas as séries),
// resumo do trecho e tabela de observações recolhida.
// unit: '% a.a.' (taxa, variação em p.p.), '% no mês', 'R$' ou 'índice' (nível, variação em %).
export default function SeriesChart({ list, name, code, label, kind, loading, period, decimals = 2, unit = '% a.a.' }) {
  const nf = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  const level = unit === 'R$' || unit === 'índice'
  const show = (v) => (unit === 'R$' ? `R$ ${nf(v)}` : level ? nf(v) : `${nf(v)}${unit === '% no mês' ? '% no mês' : '% a.a.'}`)
  const delta = (a, b) => (level ? `${b >= a ? '+' : '−'}${Math.abs((b / a - 1) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : `${b >= a ? '+' : '−'}${nf(Math.abs(b - a))} p.p.`)
  const { preset, setPreset, custom, setCustom } = period
  const [ref, width] = useWidth()
  // intervalo escolhido nas datas fica dentro da cobertura da série (as séries começam em anos diferentes)
  const range = list.length ? (custom ? { start: custom.start < list[0].period ? list[0].period : custom.start, end: custom.end > list.at(-1).period ? list.at(-1).period : custom.end } : { start: preset === 'all' ? list[0].period : startFor(list.at(-1).period, preset), end: list.at(-1).period }) : null
  const bad = range && range.start > range.end
  const shown = useMemo(() => (range && !bad ? list.filter((p) => p.period >= range.start && p.period <= range.end) : []), [list, range?.start, range?.end, bad])
  const plot = useMemo(() => shown.map((p) => ({ t: tOf(p.period), bid: p.value })), [shown])
  const history = useMemo(() => list.map((p) => ({ t: tOf(p.period), bid: p.value })), [list])
  const first = shown[0], last = shown.at(-1)
  if (!list.length) return <p role="status">{loading ? 'Carregando a série…' : 'Série indisponível agora. Ausência de dado não significa valor zero.'}</p>
  return (
    <>
      <ChartFilters label={`Período da ${label}`}>
        <div className="summary-period-controls">
          <div className="seg" role="group" aria-label={`Período da ${label}`}>{PRESETS.map(([v, l]) => <button key={v} type="button" aria-pressed={!custom && preset === v} onClick={() => { setCustom(null); setPreset(v) }}>{l}</button>)}</div>
          <DateRangePicker label={`Período da ${label}`} mode="day" start={range.start} end={range.end} min={list[0].period} max={list.at(-1).period} onChange={(start, end) => setCustom({ start, end })} />
        </div>
        {bad && <p role="alert">O início não pode ser posterior ao fim.</p>}
      </ChartFilters>
      <p className="muted">Cobertura: {dmy(list[0].period)} a {dmy(list.at(-1).period)} · {list.length} observações {kind === 'month' ? 'mensais (uma por mês de vigência)' : kind === 'sparse' ? 'nas datas de publicação' : 'diárias (dias úteis)'}. Períodos sem dado não são preenchidos.</p>
      {plot.length > 1
        ? <>
          <p className="bn-range">No período: {dmy(first.period)} {show(first.value)} → {dmy(last.period)} {show(last.value)} ({delta(first.value, last.value)}).</p>
          <div ref={ref}><Plot points={plot} history={history} width={width} color="#ca9c49" code={code} intraday={false} fmt={show} vfmt={(v) => nf(v)} label={name} labels /></div>
        </>
        : <p role="status">{bad ? 'Ajuste o período.' : 'Poucas observações no período; escolha um intervalo maior.'}</p>}
      <details className="bn-obs-d">
        <summary>Observações do período ({shown.length})</summary>
        <div className="bn-scroll bn-obs" role="region" aria-label={`Observações da ${label} no período`} tabIndex={0}>
          <table className="bn-table"><caption>{name} · observações do período (mais recentes primeiro, até 250)</caption>
            <thead><tr><th scope="col">{kind === 'month' ? 'Vigência desde' : 'Data'}</th><th scope="col">{unit}</th></tr></thead>
            <tbody>{[...shown].reverse().slice(0, 250).map((p) => <tr key={p.period}><th scope="row">{dmy(p.period)}</th><td className="num">{nf(p.value)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </>
  )
}

