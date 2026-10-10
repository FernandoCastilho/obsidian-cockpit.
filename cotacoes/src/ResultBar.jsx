import { useEffect, useState } from 'react'

// Barra de resultado do celular: fica fixa acima das abas enquanto o resultado da calculadora está fora da tela; toque leva até ele.
export default function ResultBar({ targetId, main, sub }) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [targetId, !!main])
  if (!main || inView) return null
  return (
    <button type="button" className="result-bar" onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
      <span className="rb-text">
        <b>{main}</b>
        {sub && <small>{sub}</small>}
      </span>
      <span aria-hidden="true">▾</span>
    </button>
  )
}
