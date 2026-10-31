import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COLOR, DECAY_MS, arrowHead, atalho, isDrag, kindOf, lifeOf, shapeAlpha, styleOf, trim } from './laser.js'
import './Laser.css'

// Onde a camada de desenho entra: dentro do diálogo modal aberto (senão ele ficaria por cima e travaria o ponteiro) ou no corpo da página.
const hostNow = () => [...document.querySelectorAll('dialog[open]')].at(-1) ?? document.body

// Camada só de desenho: nunca captura o mouse. Quem ouve os gestos é a janela, então o clique simples e o passar do mouse seguem para a página.
function Camada() {
  const ref = useRef(null)
  const st = useRef({ shapes: [], g: null, raf: 0, swallow: false })
  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext('2d'), S = st.current
    const size = () => { const r = window.devicePixelRatio || 1; canvas.width = innerWidth * r; canvas.height = innerHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0) }
    size(); addEventListener('resize', size)

    const point = (e) => ({ x: e.clientX, y: e.clientY, t: performance.now() })
    const down = (e) => {
      if (e.button !== 0 || e.target.closest?.('.laser-btn')) return
      S.g = { id: e.pointerId, from: point(e), target: e.target, drag: false, shape: null }
    }
    const move = (e) => {
      const g = S.g
      if (!g || e.pointerId !== g.id) return
      const p = point(e)
      if (!g.drag) {
        if (!isDrag(g.from, p)) return
        // Virou arrasto: a página desiste do gesto (cancela o que começou no pointerdown) e o laser assume.
        g.drag = true; S.swallow = true
        g.target?.dispatchEvent?.(new PointerEvent('pointercancel', { bubbles: true, pointerId: e.pointerId, pointerType: e.pointerType }))
        document.documentElement.classList.add('laser-drag')
        getSelection()?.removeAllRanges()
      }
      e.stopImmediatePropagation(); e.preventDefault()
      const kind = kindOf(e)
      if (!g.shape || g.shape.kind !== kind) {
        if (g.shape) S.shapes = S.shapes.filter((x) => x !== g.shape)
        g.shape = kind === 'free' ? { kind, points: [{ ...g.from }], live: true } : { kind, a: { ...g.from }, b: p, live: true }
        S.shapes.push(g.shape)
      }
      if (kind === 'free') g.shape.points.push(p); else g.shape.b = p
    }
    const end = (e) => {
      const g = S.g
      if (!g || !e.isTrusted || e.pointerId !== g.id) return // o pointercancel sintético que mandamos à página não encerra o gesto
      S.g = null
      document.documentElement.classList.remove('laser-drag')
      if (g.drag) {
        e.stopImmediatePropagation()
        if (g.shape) { g.shape.live = false; g.shape.releasedAt = performance.now() }
        setTimeout(() => { S.swallow = false }, 0) // o "click" que o navegador solta depois do arrasto não vai à página
      }
    }
    const click = (e) => { if (S.swallow) { e.stopImmediatePropagation(); e.preventDefault(); S.swallow = false } }
    const noSelect = (e) => { if (S.g) e.preventDefault() } // sem seleção de texto nem arrastar link/imagem enquanto o botão está apertado

    const frame = (now) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      S.shapes = S.shapes.filter((s) => s.live || (s.kind === 'free' ? s.points.some((p) => now - p.t < DECAY_MS) : shapeAlpha(now, s.releasedAt) > 0))
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      for (const s of S.shapes) {
        if (s.kind === 'free') {
          s.points = trim(s.points, now)
          for (let i = 1; i < s.points.length; i++) {
            const a = s.points[i - 1], b = s.points[i], { width, alpha } = styleOf(now - b.t)
            ctx.strokeStyle = `rgba(${COLOR},${alpha.toFixed(3)})`; ctx.shadowColor = `rgba(${COLOR},${(alpha * 0.8).toFixed(3)})`; ctx.shadowBlur = 8
            ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
          const head = s.points.at(-1)
          if (s.live && head) { ctx.shadowBlur = 10; ctx.fillStyle = `rgba(${COLOR},${lifeOf(now - head.t).toFixed(2)})`; ctx.beginPath(); ctx.arc(head.x, head.y, 5, 0, 7); ctx.fill() }
        } else {
          const alpha = shapeAlpha(now, s.releasedAt)
          ctx.strokeStyle = `rgba(${COLOR},${alpha.toFixed(3)})`; ctx.shadowColor = `rgba(${COLOR},${(alpha * 0.8).toFixed(3)})`; ctx.shadowBlur = 8; ctx.lineWidth = 4
          ctx.beginPath()
          if (s.kind === 'rect') ctx.rect(Math.min(s.a.x, s.b.x), Math.min(s.a.y, s.b.y), Math.abs(s.b.x - s.a.x), Math.abs(s.b.y - s.a.y))
          else { ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(s.b.x, s.b.y); for (const h of arrowHead(s.a, s.b)) { ctx.moveTo(s.b.x, s.b.y); ctx.lineTo(h.x, h.y) } }
          ctx.stroke()
        }
      }
      S.raf = requestAnimationFrame(frame)
    }
    S.raf = requestAnimationFrame(frame)
    addEventListener('pointerdown', down, true); addEventListener('pointermove', move, true)
    addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true)
    addEventListener('click', click, true); addEventListener('selectstart', noSelect, true); addEventListener('dragstart', noSelect, true)
    return () => {
      cancelAnimationFrame(S.raf); removeEventListener('resize', size)
      removeEventListener('pointerdown', down, true); removeEventListener('pointermove', move, true)
      removeEventListener('pointerup', end, true); removeEventListener('pointercancel', end, true)
      removeEventListener('click', click, true); removeEventListener('selectstart', noSelect, true); removeEventListener('dragstart', noSelect, true)
      document.documentElement.classList.remove('laser-drag')
    }
  }, [])
  return <canvas ref={ref} className="laser-canvas" aria-hidden="true" data-laser="on" />
}

// Botão discreto (um ponto no canto) que liga e desliga o laser; Ctrl + ~ ou Ctrl + " alterna (Alt+L também) e Esc para.
export default function Laser() {
  const [on, setOn] = useState(false)
  const [host, setHost] = useState(null)
  const onRef = useRef(false)
  onRef.current = on
  const toggle = useCallback(() => setOn((v) => !v), [])
  useEffect(() => {
    const key = (e) => {
      if (atalho(e)) { e.preventDefault(); setOn((v) => !v) }
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
    <button type="button" className={`laser-btn${on ? ' on' : ''}`} aria-pressed={on} aria-label="Laser pointer: riscar a tela" title={'Laser pointer (Ctrl + ~ ou Ctrl + "): com ele ligado, o mouse segue normal (clique); arraste para riscar, com Ctrl faz retângulo e com Shift, seta. Clique de novo, ou Esc, para parar'} onClick={toggle}>
      <span className="laser-dot" aria-hidden="true" />
    </button>
  )
  return (
    <>
      {!on && botao}
      {on && host && createPortal(<><Camada />{botao}<p className="laser-hint" role="status">Laser ligado: clique normal · arraste para riscar · Ctrl retângulo · Shift seta · Esc para parar</p></>, host)}
      {on && !host && botao}
    </>
  )
}
