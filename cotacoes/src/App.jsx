import { dataTimestamp } from './dataTimestamp.js'
import { AvisosButton, AvisosProvider } from './Avisos.jsx'
import { marketDate } from './marketReturns.js'
import { quoteAgeState } from './quoteFreshness.js'
const MarketContext = lazy(() => import('./MarketContext.jsx'))
const Outros = lazy(() => import('./Outros.jsx'))
const Calculadora = lazy(() => import('./Calculadora.jsx'))
const Calendario = lazy(() => import('./Calendario.jsx'))
import Expandable from './Expandable.jsx'
import ChartFilters from './ChartFilters.jsx'
import DateRangePicker from './DateRangePicker.jsx'
import { lazy, Suspense, useEffect, useState } from 'react'
import { CURRENCIES, REFRESH_DAILY_MAX, useQuotes } from './useQuotes.js'
import HistoryChart from './HistoryChart.jsx'
const Macro = lazy(() => import('./Macro.jsx'))
const RatesSnapshot = lazy(() => import('./RatesSnapshot.jsx'))
const Curves = lazy(() => import('./Curves.jsx'))
const CdiFuturo = lazy(() => import('./CdiFuturo.jsx'))
import HolidayNotice from './HolidayNotice.jsx'
import AvisoInicial from './AvisoInicial.jsx'
const Feriados = lazy(() => import('./Feriados.jsx'))
import { useHolidays } from './useHolidays.js'
const Config = lazy(() => import('./Config.jsx'))
const Aprender = lazy(() => import('./Aprender.jsx'))
const Indexadores = lazy(() => import('./Indexadores.jsx'))
const Bndes = lazy(() => import('./Bndes.jsx'))
import { useDataFile } from './useDataFile.js'
import Nav, { TABS } from './Nav.jsx'
import Resumo, { MoveAgenda } from './Resumo.jsx'
import TopBar from './TopBar.jsx'
import { Tape } from './TerminalDesk.jsx'
import { feedState } from './terminal.js'
import { rateTiles } from './snapshot.js'
import Clock from './Clock.jsx'
const News = lazy(() => import('./News.jsx'))
import { useMacro } from './useMacro.js'
import { useCurves } from './useCurves.js'
import ParityChart from './ParityChart.jsx'
const Projecoes = lazy(() => import('./Projecoes.jsx'))
import { DISCLAIMER } from './whatsapp.js'
import { MAX_DAYS, fromInput, fullWindow, historyRangeError, toInput } from './useHistory.js'

// cor fixa por moeda (slots 1-4 da paleta categórica, validada no tema escuro)
const POLL_MS = 60000 // relê a coleta central a cada 1 min (o arquivo é renovado a cada 5 min; não gasta a cota da API)
const COLORS = { USD: '#ffb000', EUR: '#4cc3ff', JPY: '#199e70', CNH: '#a371f7', PAR: '#d55181' }
// Assuntos da aba Cenários (cada um com seu endereço: #cenarios/commodities etc.).
const CEN_VIEWS = [
  { id: 'projecoes', label: 'Projeções' },
  { id: 'calendario', label: 'Calendário econômico' },
  { id: 'atividade', label: 'Atividade e emprego' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'frete', label: 'Frete marítimo' },
  { id: 'outros', label: 'Outros' },
]
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
      <DateRangePicker label="Período do gráfico" start={toInput(range.start)} end={toInput(range.end)} max={today} min={toInput(fullWindow().start)} onChange={onDates} />
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
  const { quotes, error, updatedAt, via, refresh, refreshing, limits } = useQuotes(POLL_MS)
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
  // Endereço da tela: #aba ou #aba/assunto (ex.: #cenarios/calendario), que dá para favoritar e enviar.
  const readHash = () => {
    const raw = window.location.hash.replace('#', '')
    const i = raw.indexOf('/')
    const h = i < 0 ? raw : raw.slice(0, i), sub = i < 0 ? '' : raw.slice(i + 1) // o BNDES guarda série e período depois da primeira barra
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
  const cenView = CEN_VIEWS.some((v) => v.id === sub) ? sub : 'projecoes'
  const goto = (id, to = '', replace = false) => {
    setTab(id)
    setSub(to)
    try {
      const hash = `#${id}${to ? `/${to}` : ''}`
      if (window.location.hash !== hash) window.history[replace ? 'replaceState' : 'pushState'](null, '', hash)
    } catch {
      /* sem histórico (ex.: arquivo local) */
    }
    if (!(id === 'bndes' && tab === 'bndes')) window.scrollTo({ top: 0 }) // escolher série e período na aba BNDES não leva ao topo
  }
  const openCurrency = CURRENCIES.find((c) => c.code === open)
  const wait = limits.wait > 0 ? ` (${limits.wait}s)` : ''
  const quoteRefresh = { run: refresh, busy: refreshing, disabled: refreshing || limits.wait > 0 || limits.left <= 0, title: limits.left <= 0 ? 'Limite diário de atualizações manuais atingido neste navegador' : `Consulta a cotação agora, direto na fonte. Limite: 1 por minuto e ${REFRESH_DAILY_MAX} por dia (restam ${limits.left}).${wait}` }
  const rates = rateTiles(macro.data, curves.data)
  const oil = useDataFile('oil.json')
  const feed = feedState({ error, aged: quoteAgeWarning, hasQuotes: !!quotes })
  const feedAt = updatedAt ? new Date(updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : null
  const quoteStatus = (
    <p className="status src">
          <span className={`dot ${error ? 'err' : quoteAgeWarning ? 'delayed' : quotes ? 'ok' : ''}`} aria-label={quoteAgeWarning ? 'Há referência antiga, reserva ou indisponível; confira os horários no rodapé' : undefined} />
          {error
            ? `Falha ao atualizar as cotações de câmbio (${error}). Tentando novamente…`
            : updatedAt
              ? `Câmbio — consulta de ${dataTimestamp(updatedAt)} · ${via === 'central' ? 'coleta central' : via === 'direto' ? 'consulta direta' : 'fonte reserva'}`
              : 'Carregando…'}
          {updatedAt && !error && <span className="src-more"> · fonte: AwesomeAPI e BCB · atualiza a cada 10 min</span>}
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
  )
  return (
    <AvisosProvider general={<>
        <p><strong>Aviso:</strong> Conteúdo meramente informativo e ilustrativo, baseado em fontes públicas. As simulações são hipotéticas e não constituem recomendação, oferta ou garantia de resultado. Os dados podem apresentar defasagens ou imprecisões e devem ser conferidos nas fontes oficiais antes de qualquer decisão. O uso é de responsabilidade do usuário, observadas as responsabilidades previstas na legislação aplicável.</p>
        <p>Fonte: AwesomeAPI (câmbio), Banco Central, B3, NY Fed e Tesouro dos EUA · yuan: CNH (offshore), por cruzamento USD/BRL ÷ USD/CNH</p>
        <p><i>{DISCLAIMER}</i></p>
      </>}>
    <AvisoInicial />
    <header className="term-head">
      <TopBar tab={tab} onTab={(id) => goto(id)} feed={feed} feedAt={feedAt} />
      <Tape quotes={quotes} rates={rates} oil={oil.data} />
    </header>
    <div className="nav-top"><Nav tab={tab} onTab={(id) => goto(id)} /></div>
    {tab === 'resumo' && (
      <div className="clocks-top">
        <Clock codes={['BRL', 'USD', 'GBP', 'JPY', 'CNH']} />
        <AvisosButton className="clocks-info" />
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
      {tab !== 'resumo' && (
        <header className={`top${['calculadora', 'noticias', 'feriados'].includes(tab) ? ' top-min' : ''}`}>
          {!['calculadora', 'noticias', 'feriados'].includes(tab) && <h1>{TABS.find((t) => t.id === tab).label}</h1>}
          <AvisosButton className="clocks-info" />
        </header>
      )}

      {tab === 'resumo' && (
        <>
          <HolidayNotice hol={hol} />
          <Resumo quotes={quotes} macro={macro} curves={curves} ptax={macro.data?.ptax} onOpen={(code, selection) => { if (selection) { setPreset(selection.intraday ? 'day' : ({ week: '7', month: '30', year: 'custom' })[selection.id] || selection.id); if (selection.range) setRange(selection.range); else if (!selection.intraday) setRange(rangeFor(selection.days)); else setDay(selection.day ? fromInput(selection.day) : fromInput(marketDate(Date.now()))); setNotice('') } setOpen(code) }} goto={goto} colors={COLORS} status={quoteStatus} quoteRefresh={quoteRefresh} />

        </>
      )}

      {tab === 'juros' && (
        <>
          <RatesSnapshot macro={macro} />
          <Macro macro={macro} />
          <CdiFuturo curves={curves} macro={macro.data} hol={hol} />
          <Curves curves={curves} />
          <Indexadores />
        </>
      )}

      {tab === 'cenarios' && (
        <>
          <nav className="learn-nav cen-nav" aria-label="Assuntos de Cenários">
            {CEN_VIEWS.map((v) => (
              <button key={v.id} type="button" className={cenView === v.id ? 'on' : ''} aria-current={cenView === v.id ? 'true' : undefined} onClick={() => goto('cenarios', v.id)}>{v.label}</button>
            ))}
          </nav>
          {cenView === 'projecoes' ? <Projecoes macro={macro} /> : cenView === 'outros' ? <Outros macro={macro} /> : cenView === 'calendario' ? <Calendario /> : <MarketContext part={cenView} />}
        </>
      )}

      {tab === 'bndes' && <Bndes view={sub} onView={(v, replace) => goto('bndes', v, replace)} />}

      {tab === 'calculadora' && <Calculadora view={sub} onView={(v) => goto('calculadora', v)} />}

      {tab === 'feriados' && <Feriados hol={hol} />}

      {tab === 'noticias' && (
        <>
          <News colors={COLORS} />
          <MoveAgenda goto={goto} colors={COLORS} />
        </>
      )}

      {tab === 'aprender' && <Aprender view={sub} goto={goto} />}

      {tab === 'config' && <Config quotesAt={updatedAt} quotesVia={via} fx={fx} setFx={setFx} />}

      {open && (
        <Sheet onClose={() => setOpen(null)}>
          <ChartFilters><Period range={range} preset={preset} onPreset={onPreset} onDates={onDates} day={day} onDay={onDay} /></ChartFilters>
          {notice && <p role="status">{notice}</p>}
          {open === 'PAR' ? (
            <ParityChart color={COLORS.PAR} start={range.start} end={range.end} day={preset === 'day' ? day : null} />
          ) : (
            openCurrency && (
              <HistoryChart onDay={onDay} key={openCurrency.code} currency={openCurrency} color={COLORS[openCurrency.code]} start={range.start} end={range.end} day={preset === 'day' ? day : null} />
            )
          )}
        </Sheet>
      )}
      </Suspense>
    </main>
    </AvisosProvider>
  )
}
