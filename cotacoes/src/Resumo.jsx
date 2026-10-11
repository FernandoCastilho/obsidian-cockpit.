import { useState } from 'react'
import Explain from './Explain.jsx'
import { CURRENCIES, seriesName } from './useQuotes.js'
import { fullWindow, useHistory, useIntraday } from './useHistory.js'
import { liveParity, mergeDaily, mergeTicks } from './parity.js'
import { periodChange } from './stats.js'
import { flagSvg } from './flags.js'
import { rateTiles, topHeadlines } from './snapshot.js'
import { upcoming } from './agenda.js'
import { useNews } from './useNews.js'
import Sparkline from './Sparkline.jsx'
import { Plot, useWidth } from './HistoryChart.jsx'
import { CALC_OPTIONS } from './calcOptions.js'

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

function Tile({ code, quote, ptax, spark, onOpen, wide, color }) {
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
    <button type="button" style={{ '--series': color }} className={`tile${wide ? ' wide' : ''}`} onClick={() => onOpen(code)} aria-label={`${cur.name}: detalhes`}>
      <span className="tile-head">
        <span className="flag" aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg(code, 'width="26" height="18"') }} />
        <span className="tile-name">
          <b>{NAMES[code]}</b> <small>· {quote?.source ?? code}/BRL{code === 'CNH' && quote?.source === 'CNH' && ' offshore'}</small>
        </span>
      </span>
      <span className="tile-body">
        <span className="tile-num">
          <span className="tile-price">{quote ? brl(quote.bid) : '—'}</span>
          {hasDay ? (
            <span className={`pct ${trend}`}>
              <Arrow v={day} /> {pct(day)}<small className="muted"> hoje</small>
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
function ParityTile({ quotes, spark, onOpen, color }) {
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
    <button type="button" style={{ '--series': color }} className="tile wide" onClick={() => onOpen('PAR')} aria-label="Paridade EUR/USD: detalhes">
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
              <Arrow v={p.pct} /> {pct(p.pct)}<small className="muted"> hoje</small>
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

// Gráfico de cotação do Resumo: últimos 60 pregões da moeda escolhida, em linha reta (sem suavização), a partir do histórico em cache.
function ResumoChart({ colors }) {
  const [code, setCode] = useState('USD')
  const w = useWindow(100)
  const h = useHistory(code, w.start, w.end)
  const [ref, width] = useWidth()
  const pts = h.status === 'ok' ? h.data.points.slice(-60) : null
  const chg = pts && pts.length > 1 ? (pts[pts.length - 1].bid / pts[0].bid - 1) * 100 : null
  const label = `${h.data?.source ?? code}/BRL`
  return (
    <div className="resumo-chart">
      <div className="sec-head">
        <h3>{label} <small className="muted">· 60 pregões</small>{chg != null && <span className={`pct ${toneOf(chg)}`}> {pct(chg)}</span>}</h3>
        <div className="chips" role="group" aria-label="Moeda do gráfico">
          {CURRENCIES.map((c) => (
            <button key={c.code} type="button" aria-pressed={code === c.code} onClick={() => setCode(c.code)}>{c.code}</button>
          ))}
        </div>
      </div>
      <div ref={ref}>
        {pts ? (
          <Plot points={pts} width={width} color={colors?.[code]} code={`rs-${code}`} fmt={(v) => brl(v)} label={label} />
        ) : (
          <div className="placeholder" style={{ height: 120 }}>{h.status === 'error' ? 'Histórico indisponível no momento.' : 'Carregando…'}</div>
        )}
      </div>
    </div>
  )
}

// Quadros das moedas com minigráfico e seletor de período (o seletor vale só para o câmbio).
function MoedasPanel({ quotes, ptax, onOpen, colors }) {
  const [sparkId, setSparkId] = useState('month')
  const spark = SPARK.find((s) => s.id === sparkId)
  return (
      <section aria-labelledby="r-moedas">
        <div className="sec-head">
          <h2 id="r-moedas">Moedas <Explain id="minigrafico" /></h2>
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
            <Tile key={c.code} code={c.code} quote={quotes?.[c.code]} ptax={ptax?.[c.code]} spark={spark} onOpen={onOpen} color={colors?.[c.code]} />
          ))}
          <ParityTile quotes={quotes} spark={spark} onOpen={onOpen} color={colors?.PAR} />
        </div>
        <ResumoChart colors={colors} />
      </section>
  )
}

// Faixa de juros fixa no topo do app (todas as abas): rótulo com "?" e os indicadores rolando.
export function RatesTop({ macro, curves, onOpen }) {
  const rates = rateTiles(macro.data, curves.data)
  const [paused, setPaused] = useState(false)
  return (
    <div className="rates-top">
      <span className="rates-label">Juros <Explain id="faixaJuros" /></span>
      <RatesBar rates={rates} onOpen={onOpen} paused={paused} />
      <button type="button" className="rates-pause" aria-pressed={paused} aria-label={paused ? 'Retomar a rolagem dos juros' : 'Pausar a rolagem dos juros'} onClick={() => setPaused((p) => !p)}>{paused ? '▶' : '❚❚'}</button>
    </div>
  )
}

// Faixa rolante dos juros: valor e variação (bps) de cada indicador; toque abre a aba Juros.
function RatesBar({ rates, onOpen, paused }) {
  if (!rates.length) return <p className="status">Juros indisponíveis no momento.</p>
  const set = rates.length < 8 ? [...rates, ...rates] : rates
  const seconds = Math.max(30, set.length * 6)
  return (
    <div className={`wire quote-bar${paused ? ' paused' : ''}`} role="region" aria-label={`Juros: ${rates.map((r) => `${r.label} ${p2(r.value)}%`).join('; ')}. A faixa rola e pausa ao passar o mouse ou no botão.`}>
      <div className="wire-track" style={{ animationDuration: `${seconds}s` }}>
        {[0, 1].map((k) => (
          <span key={k} className="wire-set" aria-hidden={k === 1 ? 'true' : undefined}>
            {set.map((r, n) => (
              <button type="button" key={`${r.key}-${n}`} className="qb" onClick={onOpen} tabIndex={k === 1 ? -1 : undefined} title={r.sub}>
                <b className="tk">{r.label}</b> {p2(r.value)}%
                {r.delta != null && (
                  <span className={`pct ${toneOf(r.delta)}`}>
                    {' '}<Arrow v={r.delta} /> {bps(r.delta)}
                  </span>
                )}
                <small className="muted"> {r.sub}</small>
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
  const heads = topHeadlines(news.data)
  const events = upcoming(new Date(), 14).slice(0, 3)
  const fmtDay = (t) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).replace('.', '')
  const fmtTime = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="resumo">
      <MoedasPanel quotes={quotes} ptax={ptax} onOpen={onOpen} colors={colors} />

      <section aria-labelledby="r-calc">
        <div className="sec-head">
          <h2 id="r-calc">Calculadoras</h2>
          <button type="button" className="more" onClick={() => goto('calculadora')}>Ver todas ›</button>
        </div>
        <div className="calc-shortcuts">
          {CALC_OPTIONS.map((o) => (
            <button key={o.id} type="button" onClick={() => goto('calculadora', o.id)}>
              <span aria-hidden="true">{o.chip}</span> {o.title}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="r-move">
        <div className="sec-head">
          <h2 id="r-move">O que move o mercado <Explain id="noticias" /></h2>
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
          <h2 id="r-agenda">Agenda econômica <Explain id="agenda" /></h2>
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
