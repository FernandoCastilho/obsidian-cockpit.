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

// Linhas sobrepostas em variação % desde o início do período (escalas diferentes ficam comparáveis).
function MultiPlot({ series, width, intraday }) {
  const H = 240
  const M = { t: 12, r: 16, b: 28, l: 52 }
  const [hover, setHover] = useState(null)
  const norm = series.map((s) => ({ ...s, pts: s.points.map((p) => ({ t: p.t, v: (p.bid / s.points[0].bid - 1) * 100 })) }))
  const all = norm.flatMap((s) => s.pts)
  const t0 = Math.min(...all.map((p) => p.t))
  const t1 = Math.max(...all.map((p) => p.t))
  let lo = Math.min(0, ...all.map((p) => p.v))
  let hi = Math.max(0, ...all.map((p) => p.v))
  const pad = Math.max(hi - lo, 0.2) * 0.12
  lo -= pad
  hi += pad
  const iw = width - M.l - M.r
  const ih = H - M.t - M.b
  const x = (t) => M.l + (t1 === t0 ? iw / 2 : ((t - t0) / (t1 - t0)) * iw)
  const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * ih
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4)
  const nx = width < 420 ? 3 : 5
  const xTicks = Array.from({ length: nx }, (_, i) => t0 + ((t1 - t0) * i) / (nx - 1))
  const fmtX = (t) => (intraday ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * width
    setHover(t0 + ((px - M.l) / iw) * (t1 - t0))
  }
  const at = (s, t) => s.pts.reduce((b, p) => (Math.abs(p.t - t) < Math.abs(b.t - t) ? p : b), s.pts[0])
  return (
    <svg className="hist-svg" viewBox={`0 0 ${width} ${H}`} width="100%" role="img" aria-label="Variação percentual das moedas selecionadas no período" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={M.l} x2={width - M.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={M.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--mut)">{pct(v)}</text>
        </g>
      ))}
      <line x1={M.l} x2={width - M.r} y1={y(0)} y2={y(0)} stroke="var(--mut)" strokeDasharray="4 3" />
      {xTicks.map((t, i) => (
        <text key={i} x={x(t)} y={H - 8} textAnchor={i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--mut)">{fmtX(t)}</text>
      ))}
      {norm.map((s) => (
        <path key={s.code} d={s.pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
      ))}
      {hover != null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} stroke="var(--mut)" />
          {norm.map((s) => {
            const p = at(s, hover)
            return <circle key={s.code} cx={x(p.t)} cy={y(p.v)} r="3.5" fill={s.color} />
          })}
        </g>
      )}
    </svg>
  )
}

// Gráfico do Resumo: moedas escolhidas nos botões (várias ao mesmo tempo) e o período dos botões Dia/Semana/Mês/Ano.
function ResumoChart({ colors, spark }) {
  const [sel, setSel] = useState(['USD'])
  const w = useWindow(spark.days)
  const dia = !!spark.intraday
  // hooks em número fixo (uma consulta por moeda; ficam em cache)
  const hs = CURRENCIES.map((c) => useHistory(c.code, w.start, w.end, dia)) // eslint-disable-line react-hooks/rules-of-hooks
  const is = CURRENCIES.map((c) => useIntraday(c.code, new Date(), !dia)) // eslint-disable-line react-hooks/rules-of-hooks
  const [ref, width] = useWidth()
  const toggle = (code) => setSel((s) => (s.includes(code) ? (s.length > 1 ? s.filter((c) => c !== code) : s) : CURRENCIES.map((c) => c.code).filter((c) => c === code || s.includes(c))))
  const rows = CURRENCIES.map((c, k) => {
    const st = dia ? is[k] : hs[k]
    return { code: c.code, color: colors?.[c.code], st, points: st.status === 'ok' ? st.data.points : [], source: st.data?.source }
  }).filter((r) => sel.includes(r.code))
  const ready = rows.filter((r) => r.points.length > 1)
  const failed = rows.every((r) => r.st.status === 'error')
  const one = rows.length === 1
  const r0 = rows[0]
  const chg = (r) => periodChange(r.points)
  return (
    <div className="resumo-chart">
      <div className="sec-head">
        <h3>
          {one ? <>{`${r0.source ?? r0.code}/BRL`} <small className="muted">· {spark.label}</small>{chg(r0) != null && <span className={`pct ${toneOf(chg(r0))}`}> {pct(chg(r0))}</span>}</> : <>Variação no período <small className="muted">· {spark.label}</small></>}
        </h3>
        <div className="chips" role="group" aria-label="Moedas do gráfico (escolha uma ou mais)">
          {CURRENCIES.map((c) => (
            <button key={c.code} type="button" aria-pressed={sel.includes(c.code)} style={sel.includes(c.code) ? { borderColor: colors?.[c.code] } : undefined} onClick={() => toggle(c.code)}>
              {sel.includes(c.code) && <i className="chip-dot" style={{ background: colors?.[c.code] }} aria-hidden="true" />}
              {c.code}
            </button>
          ))}
        </div>
      </div>
      {!one && (
        <p className="chart-legend">
          {rows.map((r) => (
            <span key={r.code}><i className="chip-dot" style={{ background: r.color }} aria-hidden="true" />{r.code} {chg(r) != null && <b className={`pct ${toneOf(chg(r))}`}>{pct(chg(r))}</b>}</span>
          ))}
        </p>
      )}
      <div ref={ref}>
        {ready.length === rows.length ? (
          one ? (
            <Plot points={r0.points} width={width} color={r0.color} code={`rs-${r0.code}-${spark.id}`} intraday={dia} fmt={(v) => brl(v)} label={`${r0.source ?? r0.code}/BRL`} />
          ) : (
            <MultiPlot series={rows} width={width} intraday={dia} />
          )
        ) : (
          <div className="placeholder" style={{ height: 120 }}>
            {failed ? 'Histórico indisponível no momento.' : rows.some((r) => r.st.status === 'loading') ? 'Carregando…' : dia ? 'Sem pontos de hoje ainda (a coleta roda de segunda a sexta, a partir das 9h30).' : 'Histórico indisponível no momento.'}
          </div>
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
        <ResumoChart colors={colors} spark={spark} />
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

export default function Resumo({ quotes, ptax, onOpen, colors }) {
  return (
    <div className="resumo">
      <MoedasPanel quotes={quotes} ptax={ptax} onOpen={onOpen} colors={colors} />
    </div>
  )
}

// "O que move o mercado" e "Agenda econômica": ficam na aba Notícias.
export function MoveAgenda({ goto, colors }) {
  const news = useNews()
  const heads = topHeadlines(news.data)
  const events = upcoming(new Date(), 14).slice(0, 3)
  const fmtDay = (t) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).replace('.', '')
  const fmtTime = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="resumo">
      <section aria-labelledby="r-move">
        <div className="sec-head">
          <h2 id="r-move">O que move o mercado <Explain id="noticias" /></h2>
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
