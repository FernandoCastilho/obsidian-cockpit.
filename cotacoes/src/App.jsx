import { useState } from 'react'
import { CURRENCIES, useQuotes } from './useQuotes.js'
import HistoryChart from './HistoryChart.jsx'
import { MAX_DAYS, fromInput, toInput } from './useHistory.js'

// cor fixa por moeda (slots 1-4 da paleta categórica, validada no tema escuro)
const COLORS = { USD: '#3987e5', EUR: '#d95926', JPY: '#199e70', CNH: '#c98500' }
const PRESETS = [
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: '180', label: '6 meses', days: 180 },
  { id: '360', label: '1 ano', days: 360 },
]
const rangeFor = (days) => {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return { start, end }
}

function Period({ range, preset, onPreset, onDates }) {
  const today = toInput(new Date())
  return (
    <div className="period">
      <div className="seg" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => onPreset(p)}>
            {p.label}
          </button>
        ))}
      </div>
      <label>
        De
        <input type="date" id="de" max={toInput(range.end)} value={toInput(range.start)} onChange={(e) => e.target.value && onDates(e.target.value, toInput(range.end))} />
      </label>
      <label>
        Até
        <input type="date" id="ate" max={today} min={toInput(range.start)} value={toInput(range.end)} onChange={(e) => e.target.value && onDates(toInput(range.start), e.target.value)} />
      </label>
    </div>
  )
}

const brl = (v, digits = 4) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits })

function Card({ currency, quote, dir, err }) {
  const pct = quote?.pct ?? 0
  const trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return (
    <article className={`card ${dir ? `flash-${dir}` : ''}`} key={quote?.bid} style={{ '--series': COLORS[currency.code] }}>
      <header>
        <span className="flag">{currency.flag}</span>
        <div>
          <h2>{quote?.source ?? currency.code}/BRL</h2>
          <p>{currency.name}</p>
        </div>
      </header>
      {quote ? (
        <>
          <div className="price">{brl(quote.bid)}</div>
          <div className={`pct ${trend}`}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'} {pct.toFixed(2).replace('.', ',')}%
          </div>
          <dl>
            <div><dt>Compra</dt><dd>{brl(quote.bid)}</dd></div>
            <div><dt>Venda</dt><dd>{brl(quote.ask)}</dd></div>
            <div><dt>Máx.</dt><dd>{brl(quote.high)}</dd></div>
            <div><dt>Mín.</dt><dd>{brl(quote.low)}</dd></div>
          </dl>
        </>
      ) : (
        <>
          <div className="price skeleton">—</div>
          {err && <p className="card-error">{err}</p>}
        </>
      )}
      {quote && err && <p className="card-error">Desatualizado: {err}</p>}
    </article>
  )
}

export default function App() {
  const { quotes, direction, error, errors, updatedAt } = useQuotes(5000)
  const [preset, setPreset] = useState('30')
  const [range, setRange] = useState(() => rangeFor(30))
  const [notice, setNotice] = useState('')

  const onPreset = (p) => {
    setPreset(p.id)
    setRange(rangeFor(p.days))
    setNotice('')
  }
  const onDates = (a, b) => {
    let start = fromInput(a)
    let end = fromInput(b)
    if (start > end) [start, end] = [end, start]
    const min = new Date(end)
    min.setDate(min.getDate() - MAX_DAYS)
    if (start < min) {
      start = min
      setNotice(`Período limitado a ${MAX_DAYS} dias.`)
    } else setNotice('')
    setPreset('custom')
    setRange({ start, end })
  }
  return (
    <main>
      <h1>Cotações em tempo real</h1>
      <p className="status">
        <span className={`dot ${error ? 'err' : quotes ? 'ok' : ''}`} />
        {error
          ? `Falha ao atualizar (${error}). Tentando novamente…`
          : updatedAt
            ? `Atualizado às ${updatedAt.toLocaleTimeString('pt-BR')} · a cada 5 s`
            : 'Carregando…'}
      </p>
      <section className="grid">
        {CURRENCIES.map((c) => (
          <Card key={c.code} currency={c} quote={quotes?.[c.code]} dir={direction[c.code]} err={errors[c.code]} />
        ))}
      </section>
      <section className="history">
        <div className="history-head">
          <h2>Histórico</h2>
          <Period range={range} preset={preset} onPreset={onPreset} onDates={onDates} />
        </div>
        {notice && <p className="status">{notice}</p>}
        <div className="charts">
          {CURRENCIES.map((c) => (
            <HistoryChart key={c.code} currency={c} color={COLORS[c.code]} start={range.start} end={range.end} />
          ))}
        </div>
      </section>
      <footer>Fonte: AwesomeAPI · valores em reais (BRL) · CNH = yuan offshore (CNY se indisponível)</footer>
    </main>
  )
}
