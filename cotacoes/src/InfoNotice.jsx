import { useId, useRef, useState } from 'react'

// General information is disclosed on activation; material warnings stay in place.
export default function InfoNotice({ children }) {
  const id = useId(), dialog = useRef(null), trigger = useRef(null)
  const [open, setOpen] = useState(false)
  const close = () => dialog.current?.close()
  const containFocus = e => {
    if (e.key !== 'Tab') return
    const targets = [...dialog.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.getClientRects().length)
    const first = targets[0], last = targets.at(-1)
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
  }
  return <aside className="app-disclaimer" aria-label="Informações e avisos gerais">
    <button type="button" ref={trigger} className="info-notice-trigger" aria-label="Informações, fontes e avisos gerais" aria-haspopup="dialog" aria-controls={id} aria-expanded={open} onClick={() => { dialog.current.showModal(); setOpen(true) }}><span aria-hidden="true">ⓘ</span></button>
    <dialog ref={dialog} id={id} className="info-notice-dialog" onKeyDown={containFocus} aria-labelledby={id + '-title'} onClose={() => { setOpen(false); trigger.current?.focus() }} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="info-notice-head"><h2 id={id + '-title'}>Informações, fontes e avisos gerais</h2><button type="button" autoFocus className="btn" onClick={close}>Fechar</button></div>
      {children}
    </dialog>
  </aside>
}
