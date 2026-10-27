import { useEffect, useState } from 'react'
import { INDICATORS, INSTITUTIONS, scenarioValue } from './scenarios.js'

const date = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value.split('-').reverse().join('/') : 'data não informada'
const format = (value) => value === null ? '—' : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function Projecoes({ macro }) {
  const [year, setYear] = useState('2026')
  const [banks, setBanks] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`./cenarios.json?t=${Math.floor(Date.now() / 600000)}`, { signal: ctrl.signal })
      .then((response) => { if (!response.ok) throw new Error('Dados indisponíveis'); return response.json() })
      .then(setBanks)
      .catch((error) => { if (error.name !== 'AbortError') setFailed(true) })
    return () => ctrl.abort()
  }, [])
  const focus = macro?.data?.focus
  return (
    <section className="scenarios" aria-labelledby="scenarios-heading">
      <div className="history-head">
        <h2 id="scenarios-heading">Cenário econômico</h2>
        <label className="scenario-year">Ano <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="Ano das projeções">
          <option value="2026">2026</option><option value="2027">2027</option>
        </select></label>
      </div>
      <article className="chart">
        <div className="scroll scenario-scroll" tabIndex={0} role="region" aria-label={`Comparação das projeções para ${year}`}>
          <table className="focus-table scenario-table">
            <caption >Projeções para {year}, por instituição. Valores ausentes indicados por travessão.</caption>
            <thead><tr><th scope="col">Indicador</th>{INSTITUTIONS.map((name) => <th scope="col" key={name}>{name}</th>)}</tr></thead>
            <tbody>{INDICATORS.map((indicator) => <tr key={indicator.id}>
              <th scope="row">{indicator.label}<small>{indicator.unit}</small></th>
              {INSTITUTIONS.map((name) => <td key={name}>{format(scenarioValue(name, indicator, year, focus, banks))}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <p className="status">USD: <a href="https://www.bcb.gov.br/controleinflacao/relatoriofocus" target="_blank" rel="noopener noreferrer">Focus = média de dezembro</a>; Itaú BBA = dezembro; demais bancos = fim do período. Selic: Itaú = dezembro; demais fontes = fim do ano. As medidas não são idênticas. — = projeção não verificada ou indisponível, nunca zero.</p>
        <div className="scenario-sources">
          <p><a href="https://www.bcb.gov.br/publicacoes/focus" target="_blank" rel="noopener noreferrer">FOCUS · Banco Central</a>: {focus ? `coleta até ${date(focus.date)}` : 'indisponível'}{macro?.data?.stale?.focus ? ' · dado de reserva' : ''}.</p>
          {INSTITUTIONS.slice(1).map((name) => {
            const bank = banks?.institutions?.find((item) => item.name === name)
            return <p key={name}>{bank?.url ? <a href={bank.url} target="_blank" rel="noopener noreferrer">{name}</a> : name}: {bank?.date ? date(bank.date) : 'fonte pendente'}{bank?.note ? ` · ${bank.note}` : ''}.</p>
          })}
          <p>Focus: consulta programada às segundas, 09h30 (Brasília), sujeita a atraso do agendador; uma consulta não significa nova publicação. Projeções dos bancos são revisadas manualmente; datas e metodologias podem diferir.{banks?.reviewedAt ? ` Conferidas em ${date(banks.reviewedAt)}.` : ''} Sujeitas a revisão, não constituem recomendação.</p>
          {failed && <p role="status">Não foi possível carregar as projeções dos bancos.</p>}
        </div>
      </article>
    </section>
  )
}
