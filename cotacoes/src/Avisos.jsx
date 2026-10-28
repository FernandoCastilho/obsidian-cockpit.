import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './Avisos.css'

// Central de avisos: fontes, metodologia e ressalvas ficam atrás de um "i" discreto, em vez de espalhadas pelo texto.
// Cada trecho de aviso da tela usa <Aviso>; ele só ocupa lugar na janela do "i" (e só existe no DOM enquanto ela está aberta).
// Alertas funcionais (dado atrasado, falha de coleta, erro de campo) continuam no lugar: são estado, não aviso.
const Ctx = createContext({ target: null, register: () => () => {}, open: () => {}, flag: false })

export function AvisosProvider({ general, children }) {
  const dialog = useRef(null)
  const opener = useRef(null)
  const [open, setOpen] = useState(false)
  const [node, setNode] = useState(null)
  const [marks, setMarks] = useState({})
  const register = useCallback((id, important) => {
    setMarks((m) => (m[id] === important ? m : { ...m, [id]: important }))
    return () => setMarks((m) => { const { [id]: _gone, ...rest } = m; return rest })
  }, [])
  const show = useCallback(() => {
    opener.current = document.activeElement
    setOpen(true)
    dialog.current?.showModal()
  }, [])
  const flag = Object.values(marks).some(Boolean)
  const value = useMemo(() => ({ target: open ? node : null, register, open: show, flag }), [open, node, register, show, flag])
  const close = () => dialog.current?.close()
  const containFocus = (e) => {
    if (e.key !== 'Tab') return
    const targets = [...dialog.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.getClientRects().length)
    const first = targets[0], last = targets.at(-1)
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }
  const titleId = useId()
  return (
    <Ctx.Provider value={value}>
      {children}
      <dialog ref={dialog} className="info-notice-dialog" aria-labelledby={titleId} onKeyDown={containFocus}
        onClose={() => { setOpen(false); opener.current?.focus?.() }}
        onClick={(e) => { if (e.target === e.currentTarget) close() }}>
        <div className="info-notice-head"><h2 id={titleId}>Informações, fontes e avisos gerais</h2><button type="button" autoFocus className="btn" onClick={close}>Fechar</button></div>
        <div className="avisos-body" ref={setNode} />
        <section className="aviso aviso-geral"><h3>Aviso geral</h3>{general}</section>
      </dialog>
    </Ctx.Provider>
  )
}

// Botão "i": pequeno e sem destaque; ganha um ponto âmbar só quando a tela tem aviso importante (ex.: calculadoras em validação).
export function AvisosButton({ className = '' }) {
  const { open, flag } = useContext(Ctx)
  return (
    <button type="button" className={`avisos-btn ${className}`} aria-label="Informações, fontes e avisos gerais" aria-haspopup="dialog" title={flag ? 'Informações e avisos desta tela (há aviso importante)' : 'Informações, fontes e avisos'} data-flag={flag ? 'on' : undefined} onClick={open}>
      <span aria-hidden="true">ⓘ</span>
    </button>
  )
}

// Aviso de uma tela: não aparece no corpo da página; vai para a janela do "i" com o título indicado.
export function Aviso({ title, important = false, children }) {
  const { target, register } = useContext(Ctx)
  const id = useId()
  useEffect(() => register(id, important), [id, important, register])
  return target ? createPortal(<section className={`aviso${important ? ' aviso-importante' : ''}`}>{title && <h3>{title}</h3>}{children}</section>, target) : null
}
