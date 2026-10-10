import { useState } from 'react'
import { CURRENCIES } from './useQuotes.js'
import { fullWindow, useHistory } from './useHistory.js'
import { mergeDaily } from './parity.js'
import { liveParity } from './parity.js'
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
  { id: 'week', label: 'Semana', days: 7 },
  { id: 'month', label: 'Mês', days: 30 },
  { id: 'year', label: 'Ano', days: 359 },
]
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
  const h = useHistory(code, w.start, w.end)
  const pts = h.status === 'ok' ? h.data.points : []
  const change = periodChange(pts)
  const day = quote?.pct ?? 0
  const trend = day > 0 ? 'up' : day < 0 ? 'down' : 'flat'
  const cur = CURRENCIES.find((c) => c.code === code)
  return (
    <button type="button" className={`tile${wide ? ' wide' : ''}`} onClick={() => onOpen(code)} aria-label={`${cur.name}: detalhes`}>
      <span className="tile-head">
        <span className="flag" aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg(code, 'width="26" height="18"') }} />
        <span className="tile-name">
          <b>{NAMES[code]}</b> <small>· {quote?.source ?? code}/BRL</small>
        </span>
      </span>
      <span className="tile-body">
        <span className="tile-num">
          <span className="tile-price">{quote ? brl(quote.bid) : '—'}</span>
          {quote && (
            <span className={`pct ${trend}`}>
              <Arrow v={day} /> {pct(day)}
            </span>
          )}
          {ptax && <small className="muted">PTAX: {brl(ptax.sell)}</small>}
        </span>
        <span className="tile-spark">
          <Sparkline points={pts} />
          <small className={change == null ? 'muted' : change >= 0 ? 'up' : 'down'}>
            {spark.label}
            {change != null && ` ${pct(change)}`}
          </small>
        </span>
      </span>
    </button>
  )
}

// Paridade EUR/USD: valor ao vivo (cotações) e minigráfico do histórico diário de USD e EUR.
function ParityTile({ quotes, spark, onOpen }) {
  const w = useWindow(spark.days)
  const u = useHistory('USD', w.start, w.end)
  const e = useHistory('EUR', w.start, w.end)
  const pts = u.status === 'ok' && e.status === 'ok' ? mergeDaily(u.data.points, e.data.points, true) : []
  const change = periodChange(pts)
  const p = liveParity(quotes?.USD, quotes?.EUR)
  const trend = (p?.pct ?? 0) > 0 ? 'up' : (p?.pct ?? 0) < 0 ? 'down' : 'flat'
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
          {p && (
            <span className={`pct ${trend}`}>
              <Arrow v={p.pct} /> {pct(p.pct)}
            </span>
          )}
          <small className="muted">dólares por 1 euro</small>
        </span>
        <span className="tile-spark">
          <Sparkline points={pts} />
          <small className={change == null ? 'muted' : change >= 0 ? 'up' : 'down'}>
            {spark.label}
            {change != null && ` ${pct(change)}`}
          </small>
        </span>
      </span>
    </button>
  )
}

export default function Resumo({ quotes, macro, curves, ptax, onOpen, goto, colors }) {
  const [sparkId, setSparkId] = useState('month')
  const spark = SPARK.find((s) => s.id === sparkId)
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
