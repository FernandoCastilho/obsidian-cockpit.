import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './HelpDialog.css'

const outside = event => {
  if (event.target !== event.currentTarget) return false
  const box = event.currentTarget.getBoundingClientRect()
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
}

// Conteúdo interativo abre somente por ativação, nunca por hover/foco.
// O dialog nativo torna o fundo inerte; Help continua sendo usado para explicações simples.
export default function HelpDialog({ title, initialFocusRef, children }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef(null), dialog = useRef(null), backdropPress = useRef(false)
  const id = useId()
  const close = () => {
    dialog.current?.close()
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }
  useLayoutEffect(() => {
    if (!open || !dialog.current) return
    const popup = dialog.current
    window.dispatchEvent(new CustomEvent('help-open', { detail: id }))
    popup.showModal()
    initialFocusRef?.current?.focus({ preventScroll: true })
    return () => { if (popup.open) popup.close() }
  }, [open, id, initialFocusRef])

  const tab = event => {
    if (event.key !== 'Tab') return
    const controls = [...dialog.current.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
      .filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && (el.type !== 'radio' || el.checked))
    const first = controls[0], last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }

  return <span className="help">
    <button ref={trigger} type="button" aria-label={title} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(true)}>?</button>
    {open && createPortal(<dialog ref={dialog} id={id} className="help-dialog" aria-labelledby={`${id}-title`} onKeyDown={tab}
      onCancel={event => { event.preventDefault(); close() }}
      onPointerDown={event => { backdropPress.current = outside(event) }}
      onClick={event => { if (backdropPress.current && outside(event)) close(); backdropPress.current = false }}>
      <h3 id={`${id}-title`}>{title}</h3>
      {children}
      <button type="button" className="help-dialog-close" onClick={close}>Fechar conversor</button>
    </dialog>, document.body)}
  </span>
}
