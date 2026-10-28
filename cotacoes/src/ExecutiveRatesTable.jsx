import { useId } from 'react'
import { Aviso } from './Avisos.jsx'
import './ExecutiveRatesTable.css'

export const EXECUTIVE_RATE_PERIODS = [
  { id: 'day', label: 'Última disponível' },
  { id: 'month', label: 'Há 1 mês' },
  { id: 'halfYear', label: 'Há 180 dias' },
  { id: 'year', label: 'Há 1 ano' },
]

/**
 * Apresentação apenas: não consulta fontes, escolhe datas nem calcula taxas.
 * periods: [{ id, label }]
 * rows: [{ id, label, unit, cells: { [periodId]: { value, date, status, source, sourceUrl? } } }]
 * Os quatro textos de cada célula já devem chegar formatados pelo consumidor.
 * Uma célula ausente não é zero, nem repete o último valor de outro período.
 */
function RateCell({ cell, metaId }) {
  const hasValue = cell?.value != null && cell.value !== ''
  const status = cell?.status || (!hasValue ? 'Não disponível' : '')
  const material = /pendente|erro|falha|carregando|sem |indispon|aguardando|defas|desatual/i.test(status)

  return (
    <td aria-describedby={metaId} className={`executive-rates__cell${hasValue ? '' : ' executive-rates__cell--missing'}`}>
      <span className="executive-rates__value">{hasValue ? cell.value : '—'}</span>
      {material && <span className="executive-rates__status">{status}</span>}
    </td>
  )
}

export default function ExecutiveRatesTable({
  rows = [],
  periods = EXECUTIVE_RATE_PERIODS,
  title = 'Cotações e indicadores',
  description,
  footnote,
  emptyMessage = 'Nenhum indicador disponível.',
}) {
  const id = useId()
  const titleId = `${id}-title`
  const hintId = `${id}-hint`

  return (
    <section className="executive-rates" aria-labelledby={titleId}>
      <header className="executive-rates__heading">
        <h2 id={titleId}>{title}</h2>
      </header>
      <p className="executive-rates__hint" id={hintId}>Deslize a tabela para ver todos os períodos →</p>
      <div
        className="executive-rates__scroll"
        role="region"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        tabIndex={0}
      >
        <table className="executive-rates__table">
          <caption className="executive-rates__sr-only">{title}: valores e respectivas datas por período.</caption>
          <colgroup>
            <col className="executive-rates__indicator-column" />
            {periods.map((period) => <col key={period.id} />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="executive-rates__indicator">Indicador <span>Unidade</span></th>
              {periods.map((period) => <th key={period.id} scope="col">{period.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="executive-rates__indicator">
                  <span className="executive-rates__name">{row.label}</span>
                  {row.unit && <span className="executive-rates__unit">{row.unit}</span>}
                </th>
                {periods.map((period) => <RateCell key={period.id} cell={row.cells?.[period.id]} metaId={`${id}-${row.id}-${period.id}`} />)}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="executive-rates__empty" colSpan={periods.length + 1}>{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="executive-rates__sr-only">
        <ul>{rows.map(row => <li key={row.id}><b>{row.label} · {row.unit}</b><ul>{periods.map(period => { const cell = row.cells?.[period.id]; return <li key={period.id} id={`${id}-${row.id}-${period.id}`}><b>{period.label}:</b> {cell?.date || 'Data indisponível'} · {cell?.status || 'Observação na data indicada'} · {cell?.source || 'Fonte indisponível'}</li> })}</ul></li>)}</ul>
      </div>
      <Aviso title={title}>
        {description && <p>{description}</p>}
        {footnote && <p>{footnote}</p>}
        <ul>{rows.map(row => <li key={row.id}><b>{row.label} · {row.unit}</b><ul>{periods.map(period => { const cell = row.cells?.[period.id], url = /^https?:\/\//i.test(cell?.sourceUrl || '') ? cell.sourceUrl : null; return <li key={period.id}><b>{period.label}:</b> {cell?.date || 'Data indisponível'} · {cell?.status || 'Observação na data indicada'} · {url ? <a href={url} target="_blank" rel="noopener noreferrer">{cell?.source}</a> : cell?.source || 'Fonte indisponível'}</li> })}</ul></li>)}</ul>
      </Aviso>
    </section>
  )
}
