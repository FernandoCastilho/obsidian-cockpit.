import { CURRENCIES, useQuotes } from './useQuotes.js'

const brl = (v, digits = 4) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits })

function Card({ currency, quote, dir, err }) {
  const pct = quote?.pct ?? 0
  const trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return (
    <article className={`card ${dir ? `flash-${dir}` : ''}`} key={quote?.bid}>
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
      <footer>Fonte: AwesomeAPI · valores em reais (BRL) · CNH = yuan offshore (CNY se indisponível)</footer>
    </main>
  )
}
