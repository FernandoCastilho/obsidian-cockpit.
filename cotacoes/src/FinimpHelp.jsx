import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Ajuda modal nativa: foco contido pelo navegador, Escape e retorno ao acionador.
// Isolada da ajuda global para não alterar o comportamento das outras calculadoras.
export default function FinimpHelp({ title, children }) {
  const [open, setOpen] = useState(false)
  const button = useRef(null), dialog = useRef(null), id = useId()
  const close = () => { dialog.current?.close(); setOpen(false); button.current?.focus() }
  useLayoutEffect(() => {
    if (!open || !dialog.current) return
    const popup = dialog.current
    popup.showModal()
    const place = () => {
      if (window.innerWidth <= 560) { popup.style.top='auto';popup.style.left='16px';return }
      const anchor = button.current.getBoundingClientRect(), box = popup.getBoundingClientRect()
      popup.style.left=Math.min(Math.max(8,anchor.left),Math.max(8,window.innerWidth-box.width-8))+'px'
      popup.style.top=Math.min(Math.max(8,anchor.bottom+8),Math.max(8,window.innerHeight-box.height-8))+'px'
    }
    place()
    window.addEventListener('resize',place)
    return () => {window.removeEventListener('resize',place);if(popup.open)popup.close()}
  },[open])
  return <span className="fi-help"><button ref={button} type="button" aria-label={'Ajuda: '+title} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(true)}>?</button>
    {open && createPortal(<dialog ref={dialog} id={id} className="fi-help-dialog" aria-labelledby={id+'-title'} aria-describedby={id+'-body'} onCancel={event=>{event.preventDefault();close()}} onClick={event=>{if(event.target!==event.currentTarget)return;const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close()}}>
      <h3 id={id+'-title'}>{title}</h3><div id={id+'-body'}>{children}</div><button type="button" className="fi-help-close" onClick={close}>Fechar ajuda</button>
    </dialog>,document.body)}
  </span>
}
