import { useEffect, useState } from 'react'
import ExecutiveRatesTable from './ExecutiveRatesTable.jsx'
import { DATA_POLL_MS, startVisiblePolling } from './visiblePolling.js'
import { snapshotPeriods, snapshotRows, displayDate } from './ratesSnapshot.js'

export default function RatesSnapshot({ macro }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => startVisiblePolling(() => setNow(Date.now()), DATA_POLL_MS), [])
  const periods = snapshotPeriods(now)
  const rows = snapshotRows({ macro: macro.data, periods, errors: {
    macro: macro.status === 'loading' ? 'Carregando juros…'
      : macro.status === 'error' ? 'Juros indisponíveis'
      : macro.stale ? 'Atualização pendente; último dado disponível' : undefined,
  } })
  return <ExecutiveRatesTable title="Juros de referência · Brasil e EUA" rows={rows}
    periods={periods.map(p => ({ ...p, label: `${p.label} · ${displayDate(p.date)}` }))}
    description="Taxas na data indicada ou na última observação anterior. Comparação histórica de níveis, não de rendimentos acumulados."
    footnote="Selic meta é a taxa de política monetária brasileira; sua data indica o início da vigência. CDI e SOFR são referências de mercado overnight, expressas em % a.a.; SOFR não é a taxa básica do Fed. Lacunas permanecem sem valor. Curvas por prazo aparecem separadamente abaixo. Outras taxas internacionais ainda não têm fonte integrada." />
}
