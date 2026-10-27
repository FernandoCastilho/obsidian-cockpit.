import { dataTimestamp } from './dataTimestamp.js'
import './AppDisclaimer.css'
import InfoNotice from './InfoNotice.jsx'
import { marketDate } from './marketReturns.js'
import { quoteAgeState } from './quoteFreshness.js'
const MarketContext = lazy(() => import('./MarketContext.jsx'))
import Expandable from './Expandable.jsx'
import { lazy, Suspense, useEffect, useState } from 'react'
import Explain from './Explain.jsx'
import { CURRENCIES, REFRESH_DAILY_MAX, useQuotes } from './useQuotes.js'
import HistoryChart from './HistoryChart.jsx'
import Help from './Help.jsx'
const Macro = lazy(() => import('./Macro.jsx'))
const RatesSnapshot = lazy(() => import('./RatesSnapshot.jsx'))
const Curves = lazy(() => import('./Curves.jsx'))
const CdiFuturo = lazy(() => import('./CdiFuturo.jsx'))
const Calculadora = lazy(() => import('./Calculadora.jsx'))
import HolidayNotice from './HolidayNotice.jsx'
import Pracas from './Pracas.jsx'
const Feriados = lazy(() => import('./Feriados.jsx'))
import { useHolidays } from './useHolidays.js'
const Novidades = lazy(() => import('./Novidades.jsx'))
import InstallApp from './InstallApp.jsx'
import Nav, { TABS } from './Nav.jsx'
import Resumo, { MoveAgenda, RatesTop } from './Resumo.jsx'
import Clock from './Clock.jsx'
const News = lazy(() => import('./News.jsx'))
import { useMacro } from './useMacro.js'
import { useCurves } from './useCurves.js'
import ParityChart from './ParityChart.jsx'
const Projecoes = lazy(() => import('./Projecoes.jsx'))
import { DISCLAIMER } from './whatsapp.js'
import { MAX_DAYS, fromInput, historyRangeError, toInput, useHistory } from './useHistory.js'

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
      <div className="period-dates">
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
  return <Expandable modal label="detalhes da moeda" onClose={onClose}>{children}</Expandable>
}

export default function App() {
  const { quotes, direction, error, errors, updatedAt, via, reload, refresh, refreshing, limits } = useQuotes(POLL_MS)
  const quoteAgeWarning = quotes && CURRENCIES.some(c => !!quoteAgeState(quotes[c.code]))
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
  const [preset, setPreset] = useState('day')
  const [range, setRange] = useState(() => rangeFor(30))
  const [notice, setNotice] = useState('')
  const [day, setDay] = useState(() => fromInput(marketDate(Date.now())))

  const onPreset = (p) => {
    setPreset(p.id)
    if (p.id !== 'day') setRange(rangeFor(p.days))
    setNotice('')
  }
  const onDay = (v) => setDay(fromInput(v))
  const onDates = (a, b) => {
    let start = fromInput(a)
    let end = fromInput(b)
    const error = historyRangeError(start, end)
    if (error) { setNotice(error); return }
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
    window.addEventListener('popstate', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onHash)
    }
  }, [])
  const [open, setOpen] = useState(null) // código da moeda (ou 'PAR') com o detalhe aberto
  const goto = (id, to = '') => {
    setTab(id)
    setSub(to)
    try {
      const hash = `#${id}${to ? `/${to}` : ''}`
      if (window.location.hash !== hash) window.history.pushState(null, '', hash)
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

      <Suspense fallback={<p className="status" role="status">Carregando seção…</p>}>
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
      {tab === 'resumo' && (
      <p className="status src">
        <span className={`dot ${error ? 'err' : quoteAgeWarning ? 'delayed' : quotes ? 'ok' : ''}`} aria-label={quoteAgeWarning ? 'Há referência antiga, reserva ou indisponível; confira os horários no rodapé' : undefined} />
        {error
          ? `Falha ao atualizar as cotações de câmbio (${error}). Tentando novamente…`
          : updatedAt
            ? `Câmbio — consulta de ${dataTimestamp(updatedAt)} · ${via === 'central' ? 'coleta central' : via === 'direto' ? 'consulta direta' : 'fonte reserva'}`
            : 'Carregando…'}
        {updatedAt && !error && <span className="src-more"> · fonte: AwesomeAPI e BCB</span>}
          <button
            type="button"
            className="refresh-mini"
            style={{ background: "none", border: "none", padding: 10, minWidth: 44, minHeight: 44, marginLeft: 6, verticalAlign: "middle", cursor: "pointer", color: "inherit" }}
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
          <Resumo quotes={quotes} macro={macro} curves={curves} ptax={macro.data?.ptax} onOpen={(code, selection) => { if (selection) { setPreset(selection.intraday ? 'day' : ({ week: '7', month: '30', year: 'custom' })[selection.id] || selection.id); if (selection.range) setRange(selection.range); else if (!selection.intraday) setRange(rangeFor(selection.days)); else setDay(selection.day ? fromInput(selection.day) : fromInput(marketDate(Date.now()))); setNotice('') } setOpen(code) }} goto={goto} colors={COLORS} />

          <InstallApp />
        </>
      )}

      {tab === 'juros' && (
        <>
          <RatesSnapshot macro={macro} />
          <Macro macro={macro} />
          <CdiFuturo curves={curves} macro={macro.data} hol={hol} />
          <Curves curves={curves} />
        </>
      )}

      {tab === 'cenarios' && (
        <>
          <Projecoes macro={macro} />
          <MarketContext />
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
              <HistoryChart onDay={onDay} key={openCurrency.code} currency={openCurrency} color={COLORS[openCurrency.code]} start={range.start} end={range.end} day={preset === 'day' ? day : null} />
            )
          )}
          <Period range={range} preset={preset} onPreset={onPreset} onDates={onDates} day={day} onDay={onDay} />
          {notice && <p role="status">{notice}</p>}
        </Sheet>
      )}
      </Suspense>
      <footer className="general-notice-footer" aria-label="Avisos gerais do aplicativo">
      <InfoNotice>
        <p><strong>Aviso:</strong> Conteúdo meramente informativo e ilustrativo, baseado em fontes públicas. As simulações são hipotéticas e não constituem recomendação, oferta ou garantia de resultado. Os dados podem apresentar defasagens ou imprecisões e devem ser conferidos nas fontes oficiais antes de qualquer decisão. O uso é de responsabilidade do usuário, observadas as responsabilidades previstas na legislação aplicável.</p>
        <p>Fonte: AwesomeAPI (câmbio), Banco Central, B3, NY Fed e Tesouro dos EUA · yuan: CNH (offshore), por cruzamento USD/BRL ÷ USD/CNH</p>
        <p><i>{DISCLAIMER}</i></p>
      </InfoNotice>
      </footer>
    </main>
    </>
  )
}
