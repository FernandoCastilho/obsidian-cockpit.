import { useMemo, useState } from 'react'
import Expandable from './Expandable.jsx'
import ChartFilters from './ChartFilters.jsx'
import { CdiChart, PRESETS, RateChart, RatesPeriod, SelicChart, fromInput, rangeFor } from './Macro.jsx'

const rate = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% a.a.`
const TITLES = { selic: 'Selic meta', cdi: 'CDI', di1: 'DI 1 ano' }

// Vértice de 1 ano (252 dias úteis) da curva DI da B3 em cada data de comparação disponível (hoje, 1 dia, 1 semana… 1 ano).
function di1Points(curves) {
  const br = curves?.br
  if (!br?.compare) return []
  return br.compare
    .map((c) => {
      const pts = br.curves?.[c.date]
      if (!pts?.length) return null
      const v = pts.reduce((b, p) => (!b || Math.abs(p[0] - 252) < Math.abs(b[0] - 252) ? p : b), null)
      return { t: Date.parse(`${c.date}T12:00:00Z`), bid: v[1] }
    })
    .filter(Boolean)
    .sort((a, b) => a.t - b.t)
    .filter((p, i, a) => i === 0 || p.t !== a[i - 1].t)
}

// Gráfico do card de juros do Mercado: período e datas ficam aqui dentro, como no gráfico das moedas.
export default function RateModal({ kind, macro, curves, onClose }) {
  const [preset, setPreset] = useState('365')
  const [range, setRange] = useState(() => rangeFor(365))
  const onPreset = (p) => { setPreset(p.id); setRange(rangeFor(p.days)) }
  const onDates = (a, b) => {
    let start = fromInput(a), end = fromInput(b)
    if (start > end) [start, end] = [end, start]
    setPreset('custom'); setRange({ start, end })
  }
  const data = macro?.data
  const di = useMemo(() => (kind === 'di1' ? di1Points(curves?.data) : []), [kind, curves?.data])
  return (
    <Expandable modal label={`detalhes: ${TITLES[kind] ?? kind}`} onClose={onClose}>
      <section className="macro rate-modal">
        <h2>{TITLES[kind] ?? kind}</h2>
        {kind !== 'di1' && <ChartFilters><RatesPeriod range={range} preset={preset} onPreset={onPreset} onDates={onDates} /></ChartFilters>}
        {kind === 'cdi' && (data?.cdi?.length ? <CdiChart macro={data} range={range} /> : <p className="status">CDI indisponível no momento.</p>)}
        {kind === 'selic' && (data?.selic?.length ? <SelicChart macro={data} range={range} /> : <p className="status">Selic indisponível no momento.</p>)}
        {kind === 'di1' && (
          <RateChart id="DI1" title="Brasil · DI 1 ano" subtitle="B3 · vértice de 252 dias úteis" color="#e5b453" points={di} fmt={rate} label="DI 1 ano" scales={false}
            refresh={['curves.json']} note="Cada ponto é o vértice de 1 ano da curva DI x pré da B3 em uma data de comparação (hoje, 1 dia, 1 semana, 1 mês, 3 e 6 meses, 1 ano); não é uma série diária. Fonte: B3." />
        )}
      </section>
    </Expandable>
  )
}
