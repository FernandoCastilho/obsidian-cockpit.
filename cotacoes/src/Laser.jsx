import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COLOR, lifeOf, styleOf, trim } from './laser.js'
import './Laser.css'

// Onde a camada de desenho entra: dentro do diálogo modal aberto (senão ele ficaria por cima e travaria o ponteiro) ou no corpo da página.
const hostNow = () => [...document.querySelectorAll('dialog[open]')].at(-1) ?? document.body

function Camada({ onStop }) {
  const ref = useRef(null)
  const state = useRef({ strokes: [], current: null, raf: 0 })
  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext('2d'), st = state.current
    const size = () => { const r = window.devicePixelRatio || 1; canvas.width = innerWidth * r; canvas.height = innerHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0) }
    size(); addEventListener('resize', size)
    const frame = (now) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      for (const s of st.strokes) s.points = trim(s.points, now) // no mesmo objeto: o traço em andamento continua sendo o que recebe os pontos
      st.strokes = st.strokes.filter((s) => s === st.current || s.points.length > 1)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (const s of st.strokes) {
        for (let i = 1; i < s.points.length; i++) {
          const a = s.points[i - 1], b = s.points[i], { width, alpha } = styleOf(now - b.t)
          ctx.strokeStyle = `rgba(${COLOR},${alpha.toFixed(3)})`; ctx.shadowColor = `rgba(${COLOR},${(alpha * 0.8).toFixed(3)})`; ctx.shadowBlur = 8
          ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
        const head = s.points.at(-1)
        if (s === st.current && head) { ctx.shadowBlur = 10; ctx.fillStyle = `rgba(${COLOR},${lifeOf(now - head.t).toFixed(2)})`; ctx.beginPath(); ctx.arc(head.x, head.y, 5, 0, 7); ctx.fill() }
      }
      st.raf = requestAnimationFrame(frame)
    }
    st.raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(st.raf); removeEventListener('resize', size) }
  }, [])
  const add = (e) => { const s = state.current.current; if (s) s.points.push({ x: e.clientX, y: e.clientY, t: performance.now() }) }
  return (
    <canvas ref={ref} className="laser-canvas" aria-hidden="true" data-laser="on"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); const s = { points: [], drawing: true }; state.current.strokes.push(s); state.current.current = s; add(e) }}
      onPointerMove={(e) => { if (state.current.current) { add(e) } }}
      onPointerUp={() => { state.current.current = null }} onPointerCancel={() => { state.current.current = null }} onContextMenu={(e) => { e.preventDefault(); onStop() }} />
  )
}

// Botão discreto (um ponto no canto) que liga e desliga o laser; Alt+L alterna e Esc para.
export default function Laser() {
  const [on, setOn] = useState(false)
  const [host, setHost] = useState(null)
  const onRef = useRef(false)
  onRef.current = on
  const toggle = useCallback(() => setOn((v) => !v), [])
  useEffect(() => {
    const key = (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'l') { e.preventDefault(); setOn((v) => !v) }
      else if (e.key === 'Escape' && onRef.current) { e.preventDefault(); e.stopPropagation(); setOn(false) }
    }
    addEventListener('keydown', key, true)
    return () => removeEventListener('keydown', key, true)
  }, [])
  useEffect(() => {
    if (!on) { setHost(null); return undefined }
    setHost(hostNow())
    const mo = new MutationObserver(() => setHost(hostNow()))
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    return () => mo.disconnect()
  }, [on])
  const botao = (
    <button type="button" className={`laser-btn${on ? ' on' : ''}`} aria-pressed={on} aria-label="Laser pointer: riscar a tela" title="Laser pointer (Alt+L): clique para riscar a tela e clique de novo, ou Esc, para parar" onClick={toggle}>
      <span className="laser-dot" aria-hidden="true" />
    </button>
  )
  return (
    <>
      {!on && botao}
      {on && host && createPortal(<><Camada onStop={() => setOn(false)} />{botao}<p className="laser-hint" role="status">Laser ligado: arraste para riscar · Esc para parar</p></>, host)}
      {on && !host && botao}
    </>
  )
}
