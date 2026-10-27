import { useEffect, useState } from 'react'
import ExecutiveRatesTable from './ExecutiveRatesTable.jsx'
import { DATA_POLL_MS, startVisiblePolling } from './visiblePolling.js'
import { snapshotPeriods, snapshotRows, displayDate } from './ratesSnapshot.js'
import { useDataFile } from './useDataFile.js'
import { policyRows } from './policyRates.js'
import { dataTimestamp } from './dataTimestamp.js'

export default function RatesSnapshot({ macro }) {
  const [now, setNow] = useState(Date.now)
  const policy = useDataFile('policy-rates.json')
  useEffect(() => startVisiblePolling(() => setNow(Date.now()), DATA_POLL_MS), [])
  const periods = snapshotPeriods(now)
  const domestic = snapshotRows({ macro: macro.data, periods, errors: {
    macro: macro.status === 'loading' ? 'Carregando juros…'
      : macro.status === 'error' ? 'Juros indisponíveis'
      : macro.stale ? 'Atualização pendente; último dado disponível' : undefined,
  } })
  const rows = [...domestic, ...policyRows(policy.data, periods, { now, loading:policy.status === 'loading', error:policy.stale || policy.status === 'error' })]
  const japan=policy.data?.series?.BOJ
  return <><ExecutiveRatesTable title="Juros de referência · Brasil e exterior" rows={rows}
    periods={periods.map(p => ({ ...p, label: `${p.label} · ${displayDate(p.date)}` }))}
    description="Taxas na data indicada ou na última observação anterior. Comparação histórica de níveis, não de rendimentos acumulados."
    footnote="Fed mostra os limites da faixa-alvo; BCE, a taxa de depósito; Japão, a série do alvo aproximado overnight compilada pelo BIS. As datas de mudança da série japonesa indicam a primeira observação daquele nível. CDI e SOFR são taxas observadas de mercado — SOFR não é a taxa básica do Fed. Comparações usam a última vigência ou observação conhecida até cada data; lacunas ficam sem valor. Curvas por prazo permanecem separadas abaixo." />
    {japan?.provider==='BIS' && <p className="status rates-source-note">Japão: Bank of Japan, compilado pelo BIS. Observações até {displayDate(japan.lastObservationDate)}; publicação semanal. Conferência: {dataTimestamp(japan.checkedAt)}. Cobertura desde {displayDate(japan.coverageStart)}; a faixa anterior não foi convertida em uma taxa escalar. Tradução não oficial do BIS. <a href="https://www.bis.org/statistics/cbpol/cbpol_doc.pdf" target="_blank" rel="noopener noreferrer">Metodologia</a> · <a href="https://data.bis.org/help/legal" target="_blank" rel="noopener noreferrer">Condições de reprodução</a>.</p>}
    </>
}
