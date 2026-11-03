import RefreshButton from './RefreshButton.jsx'
import { useLayoutEffect, useRef, useState } from 'react'
import { fromInput, useIntraday } from './useHistory.js'
import { marketDate } from './marketReturns.js'
import { mergeTicks } from './parity.js'
import { upcoming } from './agenda.js'
import Sparkline from './Sparkline.jsx'
import { FINIMP_MODOS, SPARK_NOTE, finimpConverte, finimpParidade, ibovSpark, kpiItems, kpiSparks, sparkTone, tapeItems } from './terminal.js'
import Help from './Help.jsx'
import MoneyInput from './MoneyInput.jsx'
import { parseMoneyInput } from './moneyInput.js'
import Flag from './Flag.jsx'
import { OnlineInline } from './Acessos.jsx'

const MARK = { up: '▲', down: '▼', flat: '■' }

// Faixa corrida sob a barra superior (só no computador). Se os itens não cabem, ela rola devagar e pausa sob o mouse.
export function Tape({ quotes, rates, oil }) {
  const items = tapeItems(quotes, rates, oil)
  const box = useRef(null)
  const set = useRef(null)
  const [run, setRun] = useState(false)
  const [secs, setSecs] = useState(60)
  const sig = items.map((i) => `${i.key}${i.value}${i.text ?? ''}`).join('|')
  useLayoutEffect(() => {
    const check = () => {
      if (!box.current || !set.current) return
      const w = set.current.scrollWidth
      setRun(w > box.current.clientWidth + 2)
      setSecs(Math.max(30, Math.round(w / 40)))
    }
    check()
    const ro = new ResizeObserver(check)
    if (box.current) ro.observe(box.current)
    return () => ro.disconnect()
  }, [sig])
  if (!items.length) return <div className="tape" aria-hidden="true" />
  const list = (hidden) => (
    <div className="tape-set" ref={hidden ? undefined : set} aria-hidden={hidden || undefined}>
      {items.map((i) => (
        <span key={i.key} className="tape-item">
          <b>{i.label}</b>
          {i.value}
          {i.text && <em className={i.tone}>{i.text}</em>}
          {i.note && <em className="flat">{i.note}</em>}
        </span>
      ))}
    </div>
  )
  return (
    <div className="tape" ref={box} role="region" aria-label="Cotações e juros de referência" tabIndex={run ? 0 : undefined}>
      <div className={`tape-track${run ? ' run' : ''}`} style={{ '--tape-secs': `${secs}s` }}>
        {list(false)}
        {run && list(true)}
      </div>
    </div>
  )
}

// Minigráficos dos indicadores: o dia atual em cada moeda (arquivo intraday já usado pelo quadro de câmbio). Sem amostras de hoje
// (madrugada, fim de semana), usa o último pregão com amostras, que o arquivo indica em `previousDay`.
function useDaySeries() {
  const today = fromInput(marketDate(Date.now()))
  const usd = useIntraday('USD', today)
  const eur = useIntraday('EUR', today)
  const prev = usd.previousDay || eur.previousDay || null
  const prevDay = prev ? fromInput(prev) : today
  const usdPrev = useIntraday('USD', prevDay, !prev)
  const eurPrev = useIntraday('EUR', prevDay, !prev)
  const ok = (s) => (s.status === 'ok' ? s.data.points : [])
  const pick = (now, before) => (ok(now).length > 1 ? ok(now) : ok(before))
  const u = pick(usd, usdPrev)
  const e = pick(eur, eurPrev)
  // a paridade só junta as duas séries se vêm do mesmo pregão
  const sameSession = ok(usd).length > 1 === ok(eur).length > 1
  return { USD: u, EUR: e, PAR: u.length > 1 && e.length > 1 && sameSession ? mergeTicks(u, e, true) : [] }
}

// Indicadores do topo do Mercado, com o título "Mapa de variação – dia" e, abaixo dos quadros, a linha da última consulta (`status`).
// Clique abre o gráfico da moeda ou a aba de juros.
export function KpiRow({ quotes, rates, ipca, ibov, macro, colors, onOpen, onRate, goto, status }) {
  const onAcessos = goto ? () => goto('config') : null
  const series = useDaySeries()
  const items = kpiItems(quotes, rates, ipca, ibov)
  const sparks = { ...kpiSparks({ macro, ipca }), IBOV: ibovSpark(ibov) }
  if (!items.length) return status ?? null
  return (
    <section className="kpi-block" aria-labelledby="kpi-title">
      <div className="kpi-head"><h2 id="kpi-title" className="kpi-title">Mapa de variação – dia</h2>{onAcessos && <OnlineInline onOpen={onAcessos} />}</div>
    <div className="kpis" role="group" aria-label="Indicadores principais">
      {items.map((i) => {
        const points = i.key === 'EURUSD' && i.change == null ? [] : series[i.code] ?? sparks[i.key]
        const note = !series[i.code] && sparks[i.key]?.length ? `${i.label.replace(/ 12m$/, '')}: ${SPARK_NOTE[i.key]}` : null
        const card = (
          <button key={i.key} type="button" className={`kpi${i.rate ? ' kpi-taxa' : ''}`} style={{ '--series': i.rate || i.key === 'IPCA' || i.key === 'IBOV' ? 'var(--amber)' : colors?.[i.code] || 'var(--amber)' }} onClick={() => (i.rate ? onRate(i.key) : i.key === 'IPCA' ? goto('cenarios', 'inflacao') : i.key === 'IBOV' ? goto('noticias') : onOpen(i.code))} aria-label={`${i.label} ${i.value}${i.text ? `, ${i.text}` : ''}: ${i.key === 'IBOV' ? 'abrir notícias' : 'abrir gráfico'}`}>
            <span className="kpi-label"><span className="kpi-name"><Flag code={i.rate || i.key === 'IPCA' || i.key === 'IBOV' ? 'BRL' : i.code} width={16} height={11} />{i.label}</span>{i.rate && <small>{i.key === 'di1' ? 'B3' : i.key === 'selic' ? 'meta a.a.' : 'a.a.'}</small>}{i.key === 'IPCA' && <small>IBGE{i.note ? ` · ${i.note}` : ''}</small>}{i.key === 'IBOV' && <small>pontos · fech.{i.note ? ` ${i.note}` : ''}{i.stale ? ' · sem atualização' : ''}</small>}</span>
            <span className="kpi-value">{i.value}</span>
            <span className={`kpi-change ${i.tone}`}>
              {i.text ? <><span aria-hidden="true">{MARK[i.tone]}</span> {i.text}</> : <span className="muted" title={i.reason || undefined}>var. indisponível</span>}
            </span>
            {points?.length > 1 && <span className="kpi-spark" {...(note ? { role: 'img', 'aria-label': note, title: note } : {})}><Sparkline points={points} tone={note ? sparkTone(points) : i.tone} height={30} /></span>}
          </button>
        )
        const fin = i.key === 'EURUSD' ? finimpParidade(i.raw) : null
        if (!fin) return card
        // "?" fica fora do botão do quadro (botão dentro de botão não é válido), no canto superior direito
        return (
          <div key={i.key} className="kpi-cell">
            {card}
            <span className="kpi-help"><FinimpHelp fin={fin} at={i.at} comparable={i.comparable} direct={i.direct} /></span>
          </div>
        )
      })}
    </div>
      {status}
    </section>
  )
}

const n4 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const n2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const hm = (t) => (Number.isFinite(t) && t > 0 ? new Date(t).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—')
const SIMBOLO = { EUR: '€', USD: 'US$' }
// Paridade para a Finimp: as duas paridades, o horário da cotação e uma calculadora (valor do pagamento → valor a financiar).
function FinimpHelp({ fin, at, comparable, direct }) {
  const [modo, setModo] = useState('eur-usd')
  const [texto, setTexto] = useState('')
  const lido = parseMoneyInput(texto)
  const conta = lido.ok ? finimpConverte(lido.value, modo, fin) : null
  const quando = direct ? at?.PAR : Math.min(at?.EUR ?? Infinity, at?.USD ?? Infinity)
  const m = FINIMP_MODOS[modo]
  return (
    <Help label="Paridade para a Finimp" align="right" wide fixed>
      <b className="ex-t">Paridade para a Finimp</b>
      <span className="ex">Paridade EUR/USD: <b className="fin-num">{n4(fin.base)}</b> <span className="fin-hora">· cotação de {hm(quando)}</span></span>
      <span className="ex fin-linha"><i>Pagamento em EUR e financiamento em USD:</i> <b className="fin-num">{n4(fin.eurUsd)}</b></span>
      <span className="ex fin-linha"><i>Pagamento em USD e financiamento em EUR:</i> <b className="fin-num">{n4(fin.usdEur)}</b></span>
      {!comparable && <span className="ex fin-alerta" role="note">⚠ Cotações de horários diferentes; confirme na mesa.</span>}
      <span className="fin-calc" role="group" aria-label="Calcular o valor a financiar">
        <span className="fin-modos" role="radiogroup" aria-label="Combinação de pagamento e financiamento">
          {Object.entries(FINIMP_MODOS).map(([id, o]) => (
            <button key={id} type="button" role="radio" aria-checked={modo === id} className={modo === id ? 'on' : ''} onClick={() => setModo(id)}>{o.label}</button>
          ))}
        </span>
        <label className="fin-campo">Valor do pagamento ({m.paga})
          <MoneyInput prefix={SIMBOLO[m.paga]} value={texto} onChange={setTexto} placeholder="100.000,00" aria-invalid={!!texto && !lido.ok} />
        </label>
        <span className="fin-result" aria-live="polite">{conta ? <>Valor a financiar: <b className="fin-num">{SIMBOLO[conta.moeda]} {n2(conta.valor)}</b></> : texto && !lido.ok ? 'Use o formato 100.000,00 ou 100000.' : 'Digite o valor para ver o valor a financiar.'}</span>
      </span>
    </Help>
  )
}

// `tabs` ([{ id, label, note, refresh }], com `tab` e `onTab`): vários assuntos no mesmo quadro, lado a lado no cabeçalho.
export function Panel({ title, note, className = '', refresh, tabs, tab, onTab, children }) {
  const active = tabs?.find((t) => t.id === tab) ?? tabs?.[0]
  return (
    <section className={`desk-panel ${className}`}>
      <header>
        {tabs ? (
          <>
            <h2 className="sr-only">{active.label}</h2>
            <div className="desk-tabs" role="tablist" aria-label={title}>
              {tabs.map((t, i) => [
                t.grupo && t.grupo !== tabs[i - 1]?.grupo ? <span key={`g-${t.grupo}`} className="desk-tabs-grupo" aria-hidden="true">{t.icone && <span className="desk-tabs-icone">{t.icone}</span>}{t.grupo}</span> : null,
                <button key={t.id} type="button" role="tab" aria-selected={t.id === active.id} title={t.grupo ? `${t.grupo}: ${t.label}` : undefined} onClick={() => onTab(t.id)}>{t.label}</button>,
              ])}
            </div>
            {(active.note ?? note) && <small>{active.note ?? note}</small>}
            {(active.refresh ?? refresh) && <RefreshButton files={active.refresh ?? refresh} label={active.label} />}
          </>
        ) : (
          <>
            <h2>{title}</h2>
            {note && <small>{note}</small>}
            {refresh && <RefreshButton files={refresh} label={title} />}
          </>
        )}
      </header>
      <div className="desk-panel-body">{children}</div>
    </section>
  )
}

const day = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
const hour = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

export function AgendaList({ goto, limit = 5 }) {
  const events = upcoming(new Date(), 21).slice(0, limit)
  if (!events.length) return <p className="status">Sem eventos nos próximos dias.</p>
  return (
    <ul className="desk-agenda">
      {events.map((e) => (
        <li key={e.kind + e.t}>
          <button type="button" onClick={() => goto('cenarios', 'calendario')}>
            <time dateTime={new Date(e.t).toISOString()}>{day(e.t)} <b>{hour(e.t)}</b></time>
            <span className="tag">{e.kind}</span>
            <span>{e.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
