import { useEffect, useRef, useState } from 'react'
import './AvisoInicial.css'

// Aviso exibido a cada entrada no aplicativo (não a cada troca de aba). Navegador automatizado (testes) não o recebe,
// para não cobrir a tela dos smokes; o smoke próprio do aviso desliga essa exceção.
export default function AvisoInicial() {
  const [open, setOpen] = useState(() => !(typeof navigator !== 'undefined' && navigator.webdriver))
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!open || !el) return undefined
    el.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { el.close(); document.body.style.overflow = previous }
  }, [open])
  if (!open) return null
  return (
    <dialog ref={ref} className="aviso-inicial" aria-labelledby="aviso-inicial-title" aria-describedby="aviso-inicial-text" onCancel={(e) => { e.preventDefault(); setOpen(false) }}>
      <h2 id="aviso-inicial-title">Aviso</h2>
      <p id="aviso-inicial-text">Este é um aplicativo educacional, com o intuito exclusivo de trazer informação ilustrativa. Não representa compromisso nem informações atualizadas on-line.</p>
      <button type="button" className="btn" autoFocus onClick={() => setOpen(false)}>Entendi</button>
    </dialog>
  )
}
