import { useMemo, useState } from 'react'
import { CURRENCIES, useQuotes } from './useQuotes.js'
import HistoryChart from './HistoryChart.jsx'
import Help from './Help.jsx'
import Macro from './Macro.jsx'
import Curves from './Curves.jsx'
import Agenda from './Agenda.jsx'
import Novidades from './Novidades.jsx'
import InstallApp from './InstallApp.jsx'
import { rangeStats } from './stats.js'
import Clock from './Clock.jsx'
import News from './News.jsx'
import { useMacro } from './useMacro.js'
import { useCurves } from './useCurves.js'
import ParityChart from './ParityChart.jsx'
import { liveParity } from './parity.js'
import Projecoes from './Projecoes.jsx'
import { DISCLAIMER, buildHtml, buildMessage, buildPlain, buildSummary, whatsappUrl } from './whatsapp.js'
import { flagPngs, flagSvg } from './flags.js'
import { MAX_DAYS, fromInput, toInput, useHistory } from './useHistory.js'

// cor fixa por moeda (slots 1-4 da paleta categórica, validada no tema escuro)
const POLL_MS = 30000 // consulta a cada 30 s, em uma única requisição (a API gratuita tem cota mensal)
const COLORS = { USD: '#3987e5', EUR: '#d95926', JPY: '#199e70', CNH: '#c98500', PAR: '#d55181' }
const PRESETS = [
  { id: 'day', label: 'Dia (intraday)', days: 0 },
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

function Period({ range, preset, onPreset, onDates, day, onDay }) {
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
      {preset === 'day' ? (
        <label>
          Dia
          <input type="date" id="dia" max={today} value={toInput(day)} onChange={(e) => e.target.value && onDay(e.target.value)} />
        </label>
      ) : (
        <>
      <label>
        De
        <input type="date" id="de" max={toInput(range.end)} value={toInput(range.start)} onChange={(e) => e.target.value && onDates(e.target.value, toInput(range.end))} />
      </label>
      <label>
        Até
        <input type="date" id="ate" max={today} min={toInput(range.start)} value={toInput(range.end)} onChange={(e) => e.target.value && onDates(toInput(range.start), e.target.value)} />
      </label>
        </>
      )}
    </div>
  )
}

const brl = (v, digits = 4) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: digits, maximumFractionDigits: digits })

// Horário da própria cotação (vem da fonte), não o da consulta.
function QuoteTime({ t }) {
  if (!t) return null
  const d = new Date(t)
  const sameDay = d.toDateString() === new Date().toDateString()
  const text = sameDay ? d.toLocaleTimeString('pt-BR') : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  const old = Date.now() - t > 15 * 60000
  return (
    <p className={`quote-time${old ? ' old' : ''}`} title={old ? 'Cotação com mais de 15 minutos: mercado fechado ou fonte atrasada.' : 'Horário da cotação informado pela fonte.'}>
      cotação de {text}
      {old && ' · defasada'}
    </p>
  )
}

const sgn = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}%`

// Variação em 1 semana, 1 mês e no ano, e volatilidade realizada de 30 dias, a partir do histórico diário.
function Stats({ code }) {
  const range = useMemo(() => {
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    return { end, start: new Date(end.getTime() - 359 * 864e5) }
  }, [])
  const h = useHistory(code, range.start, range.end)
  const st = h.status === 'ok' ? rangeStats(h.data.points) : null
  if (!st) return h.status === 'loading' ? <p className="stats muted">carregando variações…</p> : null
  const item = (label, v, title) => (
    <span className={v == null ? 'muted' : v > 0 ? 'up' : v < 0 ? 'down' : ''} title={title}>
      {label} <b>{v == null ? '—' : sgn(v)}</b>
    </span>
  )
  return (
    <p className="stats" aria-label="Variações no período">
      {item('Sem.', st.week, 'Variação em 7 dias, pelo fechamento diário')}
      {item('Mês', st.month, 'Variação em 30 dias, pelo fechamento diário')}
      {item('Ano', st.year, 'Variação desde o último fechamento do ano anterior')}
      <span title="Volatilidade realizada: desvio-padrão dos retornos diários dos últimos 21 pregões, anualizado">
        Vol. 30d <b>{st.vol == null ? '—' : `${st.vol.toFixed(1).replace('.', ',')}%`}</b>
      </span>
    </p>
  )
}

function Card({ currency, quote, dir, err, ptax, onRetry }) {
  const pct = quote?.pct ?? 0
  const trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return (
    <article className="card" style={{ '--series': COLORS[currency.code] }}>
      {dir && <span key={quote?.bid} className={`flash flash-${dir}`} aria-hidden="true" />}
      <header>
        <span className="flag" aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg(currency.code, 'width="24" height="16"') }} />
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
            <div>
              <dt>
                Compra
                <Help label="O que é compra">
                  Preço a que o banco <b>compra</b> a moeda. É a taxa do <b>exportador</b>: ele <b>recebe de fora</b>, vende a moeda ao banco e recebe reais.
                </Help>
              </dt>
              <dd>{brl(quote.bid)}</dd>
            </div>
            <div>
              <dt>
                Venda
                <Help label="O que é venda" align="right">
                  Preço a que o banco <b>vende</b> a moeda. É a taxa do <b>importador</b>: ele <b>paga fora</b>, compra a moeda do banco e paga em reais. A venda é sempre maior que a compra; a diferença é o <b>spread</b>, o custo de girar a moeda.
                </Help>
              </dt>
              <dd>{brl(quote.ask)}</dd>
            </div>
            <div>
              <dt>
                Máx.
                <Help label="O que é máxima">Maior cotação de compra atingida hoje, até agora. Muda durante o dia.</Help>
              </dt>
              <dd>{Number.isFinite(quote.high) ? brl(quote.high) : '—'}</dd>
            </div>
            <div>
              <dt>
                Mín.
                <Help label="O que é mínima" align="right">Menor cotação de compra atingida hoje, até agora. Muda durante o dia.</Help>
              </dt>
              <dd>{Number.isFinite(quote.low) ? brl(quote.low) : '—'}</dd>
            </div>
            {ptax && (
              <div className="span2">
                <dt>
                  PTAX
                  <Help label="O que é PTAX" align="right">
                    Taxa de referência do Banco Central, calculada a partir das cotações do mercado de câmbio. Divulgada em dias úteis; último boletim em <b>{new Date(`${ptax.date}T12:00:00`).toLocaleDateString('pt-BR')}</b>. Compra {brl(ptax.buy)} · Venda {brl(ptax.sell)}.
                  </Help>
                </dt>
                <dd>{brl(ptax.sell)} <span className="muted">venda · {new Date(`${ptax.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span></dd>
              </div>
            )}
          </dl>
        </>
      ) : (
        <>
          <div className="price skeleton">—</div>
          {err && <p className="card-error">{err}</p>}
          {err && onRetry && <button type="button" className="btn small" onClick={onRetry}>Tentar de novo</button>}
        </>
      )}
      {quote?.fallback && <p className="card-error">Fonte principal indisponível: referência diária do BCE, sem compra/venda separadas.</p>}
      {quote && <QuoteTime t={quote.timestamp} />}
      {quote && !quote.fallback && <Stats code={currency.code} />}
      {quote && err && <p className="card-error">Desatualizado: {err}</p>}
    </article>
  )
}

function Share({ quotes, updatedAt, macro, curves }) {
  const [msg, setMsg] = useState('')
  const text = buildMessage(quotes, updatedAt ?? new Date())
  const summary = buildSummary({ quotes, macro: macro?.data, curves: curves?.data, when: updatedAt ?? new Date() })
  // No celular, o compartilhamento nativo leva o texto sem passar por endereço de internet,
  // que perdia os emojis (bandeiras e setas). Sem suporte, abre o link do WhatsApp.
  const send = (e, body = text) => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!mobile || !navigator.share) return
    e.preventDefault()
    navigator.share({ text: body }).catch((err) => {
      if (err?.name !== 'AbortError') window.open(whatsappUrl(body), '_blank', 'noopener')
    })
  }
  // Texto com a marcação do WhatsApp (*negrito*, _itálico_) e emoji, para colar direto na conversa.
  const copyText = async (body) => {
    try {
      await navigator.clipboard.writeText(body)
      setMsg('Copiado. Cole no WhatsApp ou no Teams.')
    } catch {
      setMsg('Não foi possível copiar. Use o botão do WhatsApp.')
    }
    setTimeout(() => setMsg(''), 3000)
  }
  const copyWa = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg('Copiado. Cole no WhatsApp.')
    } catch {
      setMsg('Não foi possível copiar. Use o botão do WhatsApp.')
    }
    setTimeout(() => setMsg(''), 3000)
  }
  const copy = async () => {
    const when = updatedAt ?? new Date()
    const plain = buildPlain(quotes, when)
    try {
      if (window.ClipboardItem) {
        // formatado (negrito) e bandeiras como imagem para e-mail/Teams, com texto simples de reserva
        const pngs = await flagPngs()
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([buildHtml(quotes, when, pngs)], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plain)
      }
      setMsg('Copiado. Cole no e-mail ou no Teams.')
    } catch {
      setMsg('Não foi possível copiar. Use o botão do WhatsApp.')
    }
    setTimeout(() => setMsg(''), 3000)
  }
  return (
    <div className="share">
      {text ? (
        <a className="btn wa" href={whatsappUrl(text)} target="_blank" rel="noopener noreferrer" onClick={send} title="No celular, abre a lista de compartilhamento: escolha o WhatsApp">
          Enviar no WhatsApp
        </a>
      ) : (
        <button type="button" className="btn wa" disabled>Enviar no WhatsApp</button>
      )}
      {summary && (
        <a className="btn wa" href={whatsappUrl(summary)} target="_blank" rel="noopener noreferrer" onClick={(e) => send(e, summary)} title="Câmbio, juros, curva DI, SOFR, Treasuries e Focus numa mensagem só. No celular, escolha o grupo na lista de compartilhamento.">
          Resumo do dia no WhatsApp
        </a>
      )}
      <button type="button" className="btn" disabled={!summary} onClick={() => copyText(summary)} title="Copia o resumo do dia já formatado para colar no WhatsApp ou no Teams">
        Copiar resumo
      </button>
      <button type="button" className="btn" disabled={!text} onClick={copyWa} title="Copia o texto já formatado para colar no WhatsApp">
        Copiar para WhatsApp
      </button>
      <button type="button" className="btn" disabled={!text} onClick={copy} title="Copia a cotação formatada, com as bandeiras, para colar no e-mail ou no Teams">
        Copiar para e-mail ou Teams
      </button>
      <span className="status" role="status">{msg}</span>
    </div>
  )
}

const usd4 = (v) => `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`

// Card da paridade EUR/USD (dólares por 1 euro), calculado a partir dos cards de USD/BRL e EUR/BRL.
function ParityCard({ quotes }) {
  const p = liveParity(quotes?.USD, quotes?.EUR)
  const pct = p?.pct ?? 0
  const trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return (
    <article className="card" style={{ '--series': COLORS.PAR }}>
      <header>
        <span className="flag pair" aria-hidden="true">
          <span dangerouslySetInnerHTML={{ __html: flagSvg('EUR', 'width="24" height="16"') }} />
          <span dangerouslySetInnerHTML={{ __html: flagSvg('USD', 'width="24" height="16"') }} />
        </span>
        <div>
          <h2>EUR/USD</h2>
          <p>Paridade euro/dólar</p>
        </div>
      </header>
      {p ? (
        <>
          <div className="price">{usd4(p.main)}</div>
          <div className={`pct ${trend}`}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'} {pct.toFixed(2).replace('.', ',')}%
          </div>
          <dl>
            <div>
              <dt>
                Compra
                <Help label="O que é compra na paridade" align="right">
                  Dólares que se obtêm por 1 euro ao vender euro e comprar dólar. Cálculo: euro compra ÷ dólar venda.
                </Help>
              </dt>
              <dd>{usd4(p.buy)}</dd>
            </div>
            <div>
              <dt>
                Venda
                <Help label="O que é venda na paridade" align="right">
                  Dólares por 1 euro no sentido contrário. Cálculo: euro venda ÷ dólar compra. É uma referência calculada, não uma cotação de mesa.
                </Help>
              </dt>
              <dd>{usd4(p.sell)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <div className="price skeleton">—</div>
      )}
    </article>
  )
}

// No celular as seções longas começam recolhidas; no computador ficam sempre abertas (o título só aparece no celular).
function Fold({ title, children }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 700px)').matches)
  return (
    <details className="fold" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{title}</summary>
      {children}
    </details>
  )
}

export default function App() {
  const { quotes, direction, error, errors, updatedAt, reload } = useQuotes(POLL_MS)
  const macro = useMacro()
  const curves = useCurves()
  const [preset, setPreset] = useState('30')
  const [range, setRange] = useState(() => rangeFor(30))
  const [notice, setNotice] = useState('')
  const [day, setDay] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const onPreset = (p) => {
    setPreset(p.id)
    if (p.id !== 'day') setRange(rangeFor(p.days))
    setNotice('')
  }
  const onDay = (v) => setDay(fromInput(v))
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
            ? `Consultado às ${updatedAt.toLocaleTimeString('pt-BR')} · a cada ${POLL_MS / 1000} s · veja o horário da cotação em cada card`
            : 'Carregando…'}
      </p>
      <Share quotes={quotes} updatedAt={updatedAt} macro={macro} curves={curves} />
      <InstallApp />
      <section className="grid">
        {CURRENCIES.map((c) => (
          <div className="slot" key={c.code}>
            <Clock codes={[c.code]} />
            <Card currency={c} quote={quotes?.[c.code]} dir={direction[c.code]} err={errors[c.code]} ptax={macro.data?.ptax?.[c.code]} onRetry={reload} />
          </div>
        ))}
        <div className="slot">
          <Clock codes={['EUR', 'USD']} />
          <ParityCard quotes={quotes} />
        </div>
      </section>
      <Agenda />
      <Fold title="Histórico">
      <section className="history">
        <div className="history-head">
          <h2>Histórico</h2>
          <Period range={range} preset={preset} onPreset={onPreset} onDates={onDates} day={day} onDay={onDay} />
        </div>
        {notice && <p className="status">{notice}</p>}
        <div className="charts">
          {CURRENCIES.map((c) => (
            <HistoryChart key={c.code} currency={c} color={COLORS[c.code]} start={range.start} end={range.end} day={preset === 'day' ? day : null} />
          ))}
          <ParityChart color={COLORS.PAR} start={range.start} end={range.end} day={preset === 'day' ? day : null} />
        </div>
      </section>
      </Fold>
      <Fold title="Juros e expectativas"><Macro /></Fold>
      <Fold title="Curvas de juros"><Curves curves={curves} /></Fold>
      <Fold title="Projeções de terceiros"><Projecoes /></Fold>
      <Fold title="Notícias"><News colors={COLORS} /></Fold>
      <Novidades />
      <footer>
        <p>Fonte: AwesomeAPI · CNH = yuan offshore (CNY se indisponível)</p>
        <p><i>{DISCLAIMER}</i></p>
      </footer>
    </main>
  )
}
