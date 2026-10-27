import { useEffect, useRef, useState } from 'react'
import { ZONES } from './Clock.jsx'
import { COMMAND_HINTS, DESK_TABS, parseCommand } from './terminal.js'

const CLOCKS = [
  ['BRL', 'BRT'],
  ['USD', 'NYC'],
  ['GBP', 'LDN'],
  ['JPY', 'TYO'],
]
const STATE_TEXT = { ok: 'Dados', delayed: 'Dado antigo', err: 'Sem atualização', loading: 'Carregando' }

const part = (now, tz, opts) => new Intl.DateTimeFormat('pt-BR', { timeZone: tz, hourCycle: 'h23', ...opts }).format(now)

function Clocks() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="topbar-clocks" role="timer" aria-label="Horários de São Paulo, Nova York, Londres e Tóquio">
      {CLOCKS.map(([code, short], i) => (
        <span key={code} className={i === 2 ? 'opt' : undefined} title={ZONES[code].city}>
          <b>{short}</b>
          {part(now, ZONES[code].tz, { hour: '2-digit', minute: '2-digit', ...(code === 'BRL' ? { second: '2-digit' } : {}) })}
        </span>
      ))}
    </div>
  )
}

// Barra superior do terminal (computador): marca, linha de comando, seções, relógios e estado dos dados.
// Atalhos: "/" foca o comando; Alt+1 a Alt+7 trocam de seção (as teclas F1 a F12 ficam com o navegador).
export default function TopBar({ tab, onTab, onCommand, feed, feedAt }) {
  const input = useRef(null)
  const [text, setText] = useState('')
  const [miss, setMiss] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        input.current?.focus()
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-8]$/.test(e.key)) {
        e.preventDefault()
        onTab(DESK_TABS[Number(e.key) - 1].id)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onTab])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const cmd = parseCommand(text)
    if (!cmd) {
      setMiss(`Comando "${text.trim()}" não reconhecido. Tente USDBRL, EURUSD, JUROS, FOCUS, CALC ou NEWS.`)
      return
    }
    setMiss('')
    setText('')
    input.current?.blur()
    onCommand(cmd)
  }

  return (
    <div className="topbar">
      <div className="topbar-brand">
        COTAÇÕES<span>TERMINAL</span>
      </div>
      <form className="topbar-cmd" onSubmit={submit} role="search" aria-label="Linha de comando">
        <label htmlFor="cmd">Comando</label>
        <input ref={input} id="cmd" list="cmd-hints" autoComplete="off" spellCheck="false" placeholder="USDBRL   ( / )" value={text} onChange={(e) => { setText(e.target.value); setMiss('') }} aria-describedby={miss ? 'cmd-miss' : undefined} aria-invalid={miss ? true : undefined} />
        <datalist id="cmd-hints">{COMMAND_HINTS.map((h) => <option key={h} value={h} />)}</datalist>
        <button type="submit">IR</button>
        {miss && <p id="cmd-miss" role="status" className="topbar-miss">{miss}</p>}
      </form>
      <nav className="topbar-tabs" aria-label="Navegação principal">
        {DESK_TABS.map((t, i) => (
          <button key={t.id} type="button" className={t.id === tab ? 'on' : ''} aria-current={t.id === tab ? 'page' : undefined} onClick={() => onTab(t.id)} title={`Alt+${i + 1}`}>
            <i aria-hidden="true">{i + 1}</i>
            {t.label}
          </button>
        ))}
      </nav>
      <Clocks />
      <div className={`topbar-feed ${feed}`} role="status" title="Estado da última coleta de câmbio">
        <span aria-hidden="true" />
        {STATE_TEXT[feed]}
        {feedAt && feed !== 'loading' && <b>{feedAt}</b>}
      </div>
    </div>
  )
}
