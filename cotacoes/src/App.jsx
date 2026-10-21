import { useEffect, useState } from 'react'
import Explain from './Explain.jsx'
import { CURRENCIES, REFRESH_DAILY_MAX, useQuotes } from './useQuotes.js'
import HistoryChart from './HistoryChart.jsx'
import Help from './Help.jsx'
import Macro from './Macro.jsx'
import Curves from './Curves.jsx'
import CdiFuturo from './CdiFuturo.jsx'
import Calculadora from './Calculadora.jsx'
import HolidayNotice from './HolidayNotice.jsx'
import Pracas from './Pracas.jsx'
import Feriados from './Feriados.jsx'
import { useHolidays } from './useHolidays.js'
import Agenda from './Agenda.jsx'
import Novidades from './Novidades.jsx'
import InstallApp from './InstallApp.jsx'
import Nav, { TABS } from './Nav.jsx'
import Resumo, { MoveAgenda, RatesTop } from './Resumo.jsx'
import Clock from './Clock.jsx'
import News from './News.jsx'
import { useMacro } from './useMacro.js'
import { useCurves } from './useCurves.js'
import ParityChart from './ParityChart.jsx'
import Projecoes from './Projecoes.jsx'
import { DISCLAIMER, buildHtml, buildMessage, buildPlain, buildSummary, whatsappUrl } from './whatsapp.js'
import { flagPngs } from './flags.js'
import { MAX_DAYS, fromInput, toInput, useHistory } from './useHistory.js'

// cor fixa por moeda (slots 1-4 da paleta categórica, validada no tema escuro)
const POLL_MS = 60000 // relê a coleta central a cada 1 min (o arquivo é renovado a cada 5 min; não gasta a cota da API)
const COLORS = { USD: '#3987e5', EUR: '#d95926', JPY: '#199e70', CNH: '#a371f7', PAR: '#d55181' }
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
  const copyText = async (body, success = 'Copiado. Cole no WhatsApp ou no Teams.') => {
    try {
      await navigator.clipboard.writeText(body)
      setMsg(success)
    } catch {
      setMsg('Não foi possível copiar. Use o botão do WhatsApp.')
    }
    setTimeout(() => setMsg(''), 3000)
  }
  const copyWa = () => copyText(text, 'Copiado. Cole no WhatsApp.')
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

// Efeitos visuais opcionais (brilho discreto nas linhas): desligados por padrão; a escolha fica só neste navegador.
const FX_KEY = 'cotacoes-fx'
function useFx() {
  const [fx, setFx] = useState(() => {
    try {
      return localStorage.getItem(FX_KEY) === 'neon' ? 'neon' : 'off'
    } catch {
      return 'off'
    }
  })
  useEffect(() => {
    if (fx === 'neon') document.documentElement.dataset.fx = 'neon'
    else delete document.documentElement.dataset.fx
    try {
      localStorage.setItem(FX_KEY, fx)
    } catch {
      /* sem armazenamento: vale só nesta sessão */
    }
  }, [fx])
  return [fx, setFx]
}

// Detalhes de uma moeda (toque no quadro do resumo): o card completo, com compra/venda, máx./mín., PTAX e variações.
function Sheet({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Fechar">×</button>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const { quotes, direction, error, errors, updatedAt, via, reload, refresh, refreshing, limits } = useQuotes(POLL_MS)
  const macro = useMacro()
  const curves = useCurves()
  const hol = useHolidays()
  const [fx, setFx] = useFx()
  const [update, setUpdate] = useState(false)
  useEffect(() => {
    const on = () => setUpdate(true)
    window.addEventListener('app-update', on)
    return () => window.removeEventListener('app-update', on)
  }, [])
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
  // Endereço da tela: #aba ou #calculadora/finimp (calculadora aberta direto, que dá para favoritar e enviar).
  const readHash = () => {
    const [h, sub = ''] = window.location.hash.replace('#', '').split('/')
    return { tab: TABS.some((t) => t.id === h) ? h : 'resumo', sub }
  }
  const [tab, setTab] = useState(() => readHash().tab)
  const [sub, setSub] = useState(() => readHash().sub)
  useEffect(() => {
    const onHash = () => {
      const h = readHash()
      setTab(h.tab)
      setSub(h.sub)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const [open, setOpen] = useState(null) // código da moeda (ou 'PAR') com o detalhe aberto
  const goto = (id, to = '') => {
    setTab(id)
    setSub(to)
    try {
      window.history.replaceState(null, '', `#${id}${to ? `/${to}` : ''}`)
    } catch {
      /* sem histórico (ex.: arquivo local) */
    }
    window.scrollTo({ top: 0 })
  }
  const openCurrency = CURRENCIES.find((c) => c.code === open)
  const wait = limits.wait > 0 ? ` (${limits.wait}s)` : ''

  return (
    <>
    <div className="nav-top"><Nav tab={tab} onTab={(id) => goto(id)} /></div>
    {tab === 'resumo' && (
      <div className="clocks-top">
        <Clock codes={['BRL', 'USD', 'GBP', 'JPY', 'CNH']} />
      </div>
    )}
    <main className="app">
      {update && (
        <div className="update-notice" role="status">
          Nova versão disponível.{' '}
          <button type="button" onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      )}
      {tab !== 'resumo' && tab !== 'calculadora' && tab !== 'noticias' && tab !== 'feriados' && (
        <header className="top">
          <h1>{TABS.find((t) => t.id === tab).label}</h1>
        </header>
      )}
      {tab !== 'calculadora' && tab !== 'noticias' && tab !== 'feriados' && (
      <p className="status src">
        <span className={`dot ${error ? 'err' : quotes ? 'ok' : ''}`} />
        {error
          ? `Falha ao atualizar (${error}). Tentando novamente…`
          : updatedAt
            ? `Cotações de ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${via === 'central' ? 'atualizadas a cada 5 min' : via === 'direto' ? 'consulta direta' : 'fonte reserva'}`
            : 'Carregando…'}
        {updatedAt && !error && <span className="src-more"> · fonte: AwesomeAPI e BCB</span>}
          <button
            type="button"
            className="refresh-mini"
            style={{ background: "none", border: "none", padding: 2, marginLeft: 6, verticalAlign: "middle", cursor: "pointer", color: "inherit" }}
            onClick={refresh}
            disabled={refreshing || limits.wait > 0 || limits.left <= 0}
            aria-label={`Atualizar cotações agora${wait}`}
            title={limits.left <= 0 ? 'Limite diário de atualizações manuais atingido neste navegador' : `Atualizar agora. Limite: 1 por minuto e ${REFRESH_DAILY_MAX} por dia (restam ${limits.left}).`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'spin' : ''} aria-hidden="true">
              <path d="M20 11a8 8 0 00-14.5-4.6M4 4v4h4" />
              <path d="M4 13a8 8 0 0014.5 4.6M20 20v-4h-4" />
            </svg>
          </button>
      </p>
      )}

      {tab === 'resumo' && (
        <>
          <HolidayNotice hol={hol} />
          <Resumo quotes={quotes} macro={macro} curves={curves} ptax={macro.data?.ptax} onOpen={setOpen} goto={goto} colors={COLORS} />
          <Share quotes={quotes} updatedAt={updatedAt} macro={macro} curves={curves} />
          <InstallApp />
        </>
      )}

      {tab === 'juros' && (
        <>
          <Macro />
          <CdiFuturo curves={curves} macro={macro.data} hol={hol} />
          <Curves curves={curves} />
        </>
      )}

      {tab === 'cenarios' && (
        <>
          <Agenda />
          <Projecoes />
        </>
      )}

      {tab === 'feriados' && <Feriados hol={hol} />}

      {tab === 'calculadora' && <Calculadora curves={curves} hol={hol} view={sub} onView={(v) => goto('calculadora', v)} />}

      {tab === 'noticias' && (
        <>
          <News colors={COLORS} />
          <MoveAgenda goto={goto} colors={COLORS} />
        </>
      )}

      {tab === 'config' && (
 <>
      <Novidades />
      <footer>
        <details className="premissas">
          <summary>Fontes e avisos</summary>
          <p>Fonte: AwesomeAPI (câmbio), Banco Central, B3, NY Fed e Tesouro dos EUA · yuan: CNH (offshore), por cruzamento USD/BRL ÷ USD/CNH</p>
          <p><i>{DISCLAIMER}</i></p>
        </details>
        <p>
          <button type="button" className="fx-toggle" aria-pressed={fx === 'neon'} onClick={() => setFx(fx === 'neon' ? 'off' : 'neon')} title="Brilho discreto nas linhas dos gráficos (desligado por padrão)">
            Efeitos: {fx === 'neon' ? 'brilho ligado' : 'desligados'}
          </button>
        </p>
      </footer>
        </>
      )}

      {open && (
        <Sheet onClose={() => setOpen(null)}>
          {open === 'PAR' ? (
            <ParityChart color={COLORS.PAR} start={range.start} end={range.end} day={preset === 'day' ? day : null} />
          ) : (
            openCurrency && (
              <HistoryChart key={openCurrency.code} currency={openCurrency} color={COLORS[openCurrency.code]} start={range.start} end={range.end} day={preset === 'day' ? day : null} />
            )
          )}
          <Period range={range} preset={preset} onPreset={onPreset} onDates={onDates} day={day} onDay={onDay} />
        </Sheet>
      )}
    </main>
    </>
  )
}
