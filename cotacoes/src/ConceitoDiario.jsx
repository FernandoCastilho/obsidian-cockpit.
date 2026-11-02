import { useEffect, useRef, useState } from 'react'
import { conceitoDoDia, conceitoVisto, marcarConceito } from './conceitoDiario.js'
import './AvisoInicial.css'

export default function ConceitoDiario({ ready, goto }) {
  const [entrada, setEntrada] = useState(conceitoDoDia)
  const ref = useRef(null)
  const ativo = useRef(false)
  const vistos = useRef(new Set())
  const overflow = useRef(null)
  const navegando = useRef(false)
  useEffect(() => {
    if (!ready || navigator.webdriver) return undefined
    const el = ref.current
    const tentar = () => {
      if (document.visibilityState === 'hidden' || el.open) return
      const atual = conceitoDoDia()
      if (!ativo.current && (vistos.current.has(atual.dia) || conceitoVisto(atual.dia))) return
      if (atual.dia !== entrada.dia) { setEntrada(atual); return }
      // Reserva o modal de forma síncrona, sem setState entre a verificação e showModal.
      if (document.querySelector('dialog:modal')) return
      el.showModal()
      navegando.current = false
      el.querySelector('button')?.focus({ preventScroll: true })
      overflow.current = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      ativo.current = true
      vistos.current.add(entrada.dia)
      marcarConceito(entrada.dia)
    }
    tentar()
    const timer = setInterval(tentar, 500)
    return () => {
      clearInterval(timer)
      if (el.open) el.close()
      if (overflow.current !== null) { document.body.style.overflow = overflow.current; overflow.current = null }
    }
  }, [ready, entrada])

  const fechar = (navegar = false) => {
    navegando.current = navegar === true
    ativo.current = false
    ref.current.close()
    if (overflow.current !== null) { document.body.style.overflow = overflow.current; overflow.current = null }
  }
  return (
    <dialog ref={ref} className="conceito-diario" aria-labelledby="conceito-dia-title" aria-describedby="conceito-dia-text" onCancel={(e) => { e.preventDefault(); fechar() }} onClose={() => {
      // Após a restauração nativa de foco; o botão do aviso já saiu do DOM.
      if (!navegando.current && !document.querySelector('dialog:modal')) {
        const target = [...document.querySelectorAll('nav button[aria-current="page"], nav button, main button')].find(el => !el.disabled && el.getClientRects().length > 0)
        target?.focus({ preventScroll: true })
      }
    }} onKeyDown={(e) => {
      if (e.key !== 'Tab') return
      const buttons = ref.current.querySelectorAll('button')
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }}>
      <p className="conceito-dia-tag">Conceito do dia · Aprender</p>
      <h2 id="conceito-dia-title">{entrada.conceito.nome}</h2>
      <p id="conceito-dia-text">{entrada.conceito.frase}</p>
      <div className="conceito-dia-actions">
        <button type="button" className="btn" autoFocus onClick={fechar}>Fechar</button>
        <button type="button" className="btn" onClick={() => { fechar(true); goto('aprender', entrada.conceito.id) }}>Abrir conceito completo</button>
      </div>
    </dialog>
  )
}
