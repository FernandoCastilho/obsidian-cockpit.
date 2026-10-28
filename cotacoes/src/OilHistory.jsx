import Expandable from './Expandable.jsx'
import ChartFilters from './ChartFilters.jsx'
import { Plot, useWidth } from './HistoryChart.jsx'
import { fullWindow, toInput } from './useHistory.js'
import { oilHistory } from './oilHistory.js'
const date = (d) => d ? d.split('-').reverse().join('/') : '—'
const money = (v) => `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export default function OilHistory({ data, points, spark, dates, presets, onDates, onPreset, dateError, stale, loading, onClose }) {
  const [ref, width] = useWidth()
  const selected = oilHistory(points, spark)
  const limits = fullWindow()
  const history = points.map((p) => ({ t: new Date(`${p.date}T12:00:00`).getTime(), bid: p.value }))
  const plot = selected.points.map((p) => ({ t: new Date(`${p.date}T12:00:00`).getTime(), bid: p.value }))
  return <Expandable label="histórico do petróleo Brent" modal onClose={onClose}>
    <h2>Petróleo Brent · histórico spot</h2>
    <ChartFilters>
    <div className="summary-period-controls">
      <div className="seg" role="group" aria-label="Período do petróleo">{presets.map((p) => <button key={p.id} aria-pressed={spark.id === p.id} onClick={() => onPreset(p)}>{p.label}</button>)}</div>
      <div className="summary-dates">
        <label>De <input aria-label="Data inicial do petróleo" type="date" min={toInput(limits.start)} max={toInput(limits.end)} value={dates.start} onChange={(e) => onDates({ ...dates, start: e.target.value })} /></label>
        <label>Até <input aria-label="Data final do petróleo" type="date" min={toInput(limits.start)} max={toInput(limits.end)} value={dates.end} onChange={(e) => onDates({ ...dates, end: e.target.value })} /></label>
      </div>
    </div>
    {dateError && <p role="alert">{dateError} O período anterior permanece aplicado.</p>}
    </ChartFilters>
    {stale && points.length > 0 && <p role="status">Última série disponível; atualização pendente.</p>}
    {loading ? <p role="status">Carregando histórico EIA…</p> : !points.length ? <p role="status">Não foi possível carregar o histórico EIA. Tente novamente mais tarde; não é possível concluir se há cotações no intervalo.</p> : selected.points.length ? <>
      <p>Primeira: {date(selected.first.date)} · {money(selected.first.value)}. Última: {date(selected.last.date)} · {money(selected.last.value)}.</p>
      <p>Variação no intervalo: {selected.change == null ? 'indisponível com uma única observação' : `${selected.change > 0 ? '+' : ''}${selected.change.toFixed(2).replace('.', ',')}%`}.</p>
      <div ref={ref}><Plot points={plot} history={history} width={width} color="#ca9c49" code="brent-history" intraday={false} fmt={money} vfmt={(v) => v.toFixed(2).replace('.', ',')} label="Brent spot · US$/barril" labels /></div>
      <div className="oil-history-table"><table><caption>Observações do intervalo · Brent spot · US$/barril</caption><thead><tr><th scope="col">Data</th><th scope="col">US$/barril</th></tr></thead><tbody>{[...selected.points].reverse().map((p) => <tr key={p.date}><th scope="row">{date(p.date)}</th><td>{money(p.value)}</td></tr>)}</tbody></table></div>
    </> : <p role="status">Nenhuma cotação EIA publicada no intervalo selecionado. Escolha outro período; ausência não significa preço zero.</p>}
    <details className="oil-notes" open><summary>Fonte, publicação e cobertura</summary>
    <p>Histórico EIA independente do CFD indicativo TVC:UKOIL no card. O widget não alimenta esta série e não garante tempo real; seu link abre a referência no provedor.</p>
    {points.length > 0 && <p>Última referência EIA: {money(points.at(-1).value)} por barril em {date(points.at(-1).date)}.</p>}
    <p>US$/barril · {spark.label}. Série diária EIA, sem cotação intraday.</p>
    <p className="muted">Observações diárias, divulgadas em lote semanal. Divulgação: {date(data?.releaseDate)}. Próxima prevista: {date(data?.nextReleaseDate)}. Última coleta bem-sucedida: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('pt-BR', { timeZone: 'UTC' }) + ' UTC' : 'indisponível'}. O horário de coleta não é o horário da cotação.</p>
    <p className="muted">Cobertura EIA carregada: {date(points[0]?.date)} a {date(points.at(-1)?.date)}. A seleção segue o limite comum do painel desde {date(toInput(limits.start))}. Dias sem publicação não são preenchidos.</p>
    </details>
    <p><a href="https://www.eia.gov/dnav/pet/hist/RBRTED.htm" target="_blank" rel="noreferrer">Fonte: EIA · Europe Brent Spot Price FOB</a></p>
  </Expandable>
}
