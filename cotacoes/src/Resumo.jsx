import { useState } from 'react'
import { CURRENCIES, seriesName } from './useQuotes.js'
import { fullWindow, useHistory, useIntraday } from './useHistory.js'
import { liveParity, mergeDaily, mergeTicks } from './parity.js'
import { periodChange } from './stats.js'
import { flagSvg } from './flags.js'
import { rateTiles, topHeadlines } from './snapshot.js'
import { upcoming } from './agenda.js'
import { useNews } from './useNews.js'
import Sparkline from './Sparkline.jsx'

const brl = (v, d = 4) => !Number.isFinite(v) ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}`
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}%`
const p2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const bps = (d) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(Math.round(d * 100))} bps`
const SPARK = [
  { id: 'day', label: 'Dia', days: 1, intraday: true },
  { id: 'week', label: 'Semana', days: 7 },
  { id: 'month', label: 'Mês', days: 30 },
  { id: 'year', label: 'Ano', days: 359 },
]
const toneOf = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : 'flat')
const NAMES = { USD: 'Dólar', EUR: 'Euro', JPY: 'Iene', CNH: 'Yuan' }
const ago = (t) => {
  const min = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  return h < 24 ? `há ${h} h` : new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// Janela do minigráfico: recorte do histórico de 360 dias que já está em cache (sem consulta nova).
function useWindow(days) {
  const win = fullWindow()
  return { start: new Date(win.end.getTime() - days * 864e5), end: win.end }
}

function Arrow({ v }) {
  return <span aria-hidden="true">{v > 0 ? '▲' : v < 0 ? '▼' : '■'}</span>
}

function Tile({ code, quote, ptax, spark, onOpen, wide }) {
  const w = useWindow(spark.days)
  const h = useHistory(code, w.start, w.end, !!spark.intraday)
  const i = useIntraday(code, new Date(), !spark.intraday)
  const s = spark.intraday ? i : h
  const pts = s.status === 'ok' ? s.data.points : []
  const change = periodChange(pts)
  const hasDay = !!quote && !quote.fallback // a fonte reserva (BCE) não traz a variação do dia
  const day = hasDay ? quote.pct ?? 0 : 0
  const trend = toneOf(hasDay ? day : change)
  const cur = CURRENCIES.find((c) => c.code === code)
  return (
    <button type="button" className={`tile${wide ? ' wide' : ''}`} onClick={() => onOpen(code)} aria-label={`${cur.name}: detalhes`}>
      <span className="tile-head">
        <span className="flag" aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg(code, 'width="26" height="18"') }} />
        <span className="tile-name">
          <b>{NAMES[code]}</b> <small>· {quote?.source ?? code}/BRL{code === 'CNH' && (quote?.source === 'CNH' ? ' offshore' : ' onshore')}</small>
        </span>
      </span>
      <span className="tile-body">
        <span className="tile-num">
          <span className="tile-price">{quote ? brl(quote.bid) : '—'}</span>
          {hasDay ? (
            <span className={`pct ${trend}`}>
              <Arrow v={day} /> {pct(day)}
            </span>
          ) : (
            quote && <small className="muted">var. do dia indisponível</small>
          )}
          {ptax && <small className="muted">PTAX: {brl(ptax.sell)}</small>}
        </span>
        <span className="tile-spark">
          <Sparkline points={pts} tone={trend} />
          <small className="muted">
            {spark.label}
            {change != null ? ` ${pct(change)}` : spark.intraday && ' · sem pontos hoje'}
          </small>
        </span>
      </span>
    </button>
  )
}

// Paridade EUR/USD: valor ao vivo (cotações) e minigráfico do histórico diário de USD e EUR.
function ParityTile({ quotes, spark, onOpen }) {
  const w = useWindow(spark.days)
  const dia = !!spark.intraday
  const u = useHistory('USD', w.start, w.end, dia)
  const e = useHistory('EUR', w.start, w.end, dia)
  const ui = useIntraday('USD', new Date(), !dia)
  const ei = useIntraday('EUR', new Date(), !dia)
  const [a, b] = dia ? [ui, ei] : [u, e]
  const pts = a.status === 'ok' && b.status === 'ok' ? (dia ? mergeTicks : mergeDaily)(a.data.points, b.data.points, true) : []
  const change = periodChange(pts)
  const p = liveParity(quotes?.USD, quotes?.EUR)
  const hasDay = !!p && !quotes.USD.fallback && !quotes.EUR.fallback
  const trend = toneOf(hasDay ? p.pct : change)
  return (
    <button type="button" className="tile wide" onClick={() => onOpen('PAR')} aria-label="Paridade EUR/USD: detalhes">
      <span className="tile-head">
        <span className="flag pair" aria-hidden="true">
          <span dangerouslySetInnerHTML={{ __html: flagSvg('EUR', 'width="26" height="18"') }} />
          <span dangerouslySetInnerHTML={{ __html: flagSvg('USD', 'width="26" height="18"') }} />
        </span>
        <span className="tile-name">
          <b>Euro/Dólar</b> <small>· EUR/USD</small>
        </span>
      </span>
      <span className="tile-body">
        <span className="tile-num">
          <span className="tile-price">{p ? `US$ ${p.main.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : '—'}</span>
          {hasDay ? (
            <span className={`pct ${trend}`}>
              <Arrow v={p.pct} /> {pct(p.pct)}
            </span>
          ) : (
            p && <small className="muted">var. do dia indisponível</small>
          )}
          <small className="muted">dólares por 1 euro</small>
        </span>
        <span className="tile-spark">
          <Sparkline points={pts} tone={trend} />
          <small className="muted">
            {spark.label}
            {change != null ? ` ${pct(change)}` : spark.intraday && ' · sem pontos hoje'}
          </small>
        </span>
      </span>
    </button>
  )
}

// Painel das moedas (aba Moedas): quadros com minigráfico e seletor de período, só para câmbio.
export function MoedasPanel({ quotes, ptax, onOpen }) {
  const [sparkId, setSparkId] = useState('month')
  const spark = SPARK.find((s) => s.id === sparkId)
  return (
      <section aria-labelledby="r-moedas">
        <div className="sec-head">
          <h2 id="r-moedas">Panorama</h2>
          <div className="seg" role="group" aria-label="Período do minigráfico">
            {SPARK.map((s) => (
              <button key={s.id} type="button" aria-pressed={sparkId === s.id} onClick={() => setSparkId(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="tiles">
          {CURRENCIES.map((c) => (
            <Tile key={c.code} code={c.code} quote={quotes?.[c.code]} ptax={ptax?.[c.code]} spark={spark} onOpen={onOpen} />
          ))}
          <ParityTile quotes={quotes} spark={spark} onOpen={onOpen} />
        </div>
      </section>
  )
}

// Faixa rolante no topo do Resumo: preço e variação do dia de cada moeda (toque abre a aba Moedas).
function QuoteBar({ quotes, onOpen }) {
  const items = CURRENCIES.map((c) => {
    const q = quotes?.[c.code]
    return q ? { key: c.code, label: `${q.source ?? c.code}/BRL`, price: brl(q.bid, c.code === 'JPY' ? 4 : 4), pct: q.fallback ? null : q.pct } : null
  }).filter(Boolean)
  const p = liveParity(quotes?.USD, quotes?.EUR)
  if (p) items.push({ key: 'PAR', label: 'EUR/USD', price: `US$ ${p.main.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`, pct: quotes.USD.fallback || quotes.EUR.fallback ? null : p.pct })
  if (!items.length) return <p className="status">Cotações indisponíveis no momento.</p>
  const set = items.length < 8 ? [...items, ...items] : items
  const seconds = Math.max(30, set.length * 6)
  return (
    <div className="wire quote-bar" role="region" aria-label="Cotações em rolagem (pausa ao passar o mouse)">
      <div className="wire-track" style={{ animationDuration: `${seconds}s` }}>
        {[0, 1].map((k) => (
          <span key={k} className="wire-set" aria-hidden={k === 1 ? 'true' : undefined}>
            {set.map((it, n) => (
              <button type="button" key={`${it.key}-${n}`} className="qb" onClick={onOpen} tabIndex={k === 1 ? -1 : undefined}>
                <b className="tk" style={{ '--tk': it.key === 'PAR' ? '#d55181' : undefined }}>{it.label}</b> {it.price}
                {it.pct != null && (
                  <span className={`pct ${toneOf(it.pct)}`}>
                    {' '}<Arrow v={it.pct} /> {pct(it.pct)}
                  </span>
                )}
              </button>
            ))}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Resumo({ quotes, macro, curves, ptax, onOpen, goto, colors }) {
  const news = useNews()
  const rates = rateTiles(macro.data, curves.data)
  const heads = topHeadlines(news.data)
  const events = upcoming(new Date(), 14).slice(0, 3)
  const fmtDay = (t) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).replace('.', '')
  const fmtTime = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="resumo">
      <section aria-labelledby="r-moedas">
        <div className="sec-head">
          <h2 id="r-moedas">Moedas</h2>
          <button type="button" className="more" onClick={() => goto('moedas')}>Ver moedas ›</button>
        </div>
        <QuoteBar quotes={quotes} onOpen={() => goto('moedas')} />
      </section>

      <section aria-labelledby="r-juros">
        <div className="sec-head">
          <h2 id="r-juros">Juros</h2>
          <button type="button" className="more" onClick={() => goto('juros')}>Ver curvas ›</button>
        </div>
        <div className="rate-tiles">
          {rates.length ? (
            rates.map((r) => (
              <button type="button" key={r.key} className="rate" onClick={() => goto('juros')}>
                <small>{r.label}</small>
                <b>{p2(r.value)}<i>%</i></b>
                <small className="muted">{r.delta != null ? `${bps(r.delta)} · ${r.sub}` : r.sub}</small>
              </button>
            ))
          ) : (
            <p className="status">Juros indisponíveis no momento.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="r-move">
        <div className="sec-head">
          <h2 id="r-move">O que move o mercado</h2>
          <button type="button" className="more" onClick={() => goto('noticias')}>Ver todas ›</button>
        </div>
        <ul className="list">
          {heads.length ? (
            heads.map((n) => (
              <li key={n.code + n.link}>
                <a href={n.link} target="_blank" rel="noopener noreferrer">
                  <span className="dotbadge" style={{ background: colors[n.code] }}>{n.code}</span>
                  <span className="list-text">
                    <b>{n.title}</b>
                    <small className="muted">{n.source} · {ago(n.t)}{n.original ? ' · traduzida' : ''}</small>
                  </span>
                </a>
              </li>
            ))
          ) : (
            <li className="status">{news.error ? 'Notícias indisponíveis no momento.' : 'Carregando notícias…'}</li>
          )}
        </ul>
      </section>

      <section aria-labelledby="r-agenda">
        <div className="sec-head">
          <h2 id="r-agenda">Agenda econômica</h2>
          <button type="button" className="more" onClick={() => goto('cenarios')}>Ver agenda ›</button>
        </div>
        <ul className="list">
          {events.length ? (
            events.map((e) => (
              <li key={e.kind + e.t}>
                <button type="button" onClick={() => goto('cenarios')}>
                  <span className="dotbadge cal">{e.kind}</span>
                  <span className="list-text">
                    <b>{e.label}</b>
                    <small className="muted">{fmtDay(e.t)} · {fmtTime(e.t)} · Brasília</small>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="status">Sem eventos nos próximos dias.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
