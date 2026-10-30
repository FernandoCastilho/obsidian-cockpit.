import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Ícone "?" com explicação: abre ao passar o mouse, ao focar pelo teclado ou ao tocar/clicar (fixa).
// `fixed`: o balão sai do contêiner (portal no corpo da página) e se posiciona pela janela, para não ser cortado nem ficar atrás de células de uma tabela com rolagem.
export default function Help({ label, align = 'left', wide = false, fixed = false, children }) {
  const [pinned, setPinned] = useState(false)
  const [hover, setHover] = useState(false)
  const ref = useRef(null)
  const id = useId()
  const show = pinned || hover
  const popRef = useRef(null)
  const mobile = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 560px)').matches
  const [shift, setShift] = useState(0)
  const [pos, setPos] = useState(null)

  // Mantém o balão dentro da janela (perto da borda direita ou esquerda ele deslocava para fora da tela).
  useLayoutEffect(() => {
    if (fixed) return
    if (!show || !popRef.current) return setShift(0)
    const r = popRef.current.getBoundingClientRect()
    const base = r.left - shift
    const w = r.width
    const max = window.innerWidth - 8
    setShift(base + w > max ? max - (base + w) : base < 8 ? 8 - base : 0)
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  // Balão "fixed": mede o botão e o balão, mantém dentro da janela (abre para cima se faltar espaço embaixo) e fecha ao rolar a página.
  useLayoutEffect(() => {
    if (!fixed || mobile || !show || !ref.current || !popRef.current) return setPos(null)
    const b = ref.current.getBoundingClientRect()
    const w = popRef.current.offsetWidth, h = popRef.current.offsetHeight
    const left = Math.min(Math.max(8, b.left - 8), Math.max(8, window.innerWidth - w - 8))
    const top = b.bottom + 6 + h > window.innerHeight - 8 && b.top - 6 - h >= 8 ? b.top - 6 - h : b.bottom + 6
    setPos({ top, left })
  }, [show, fixed]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fixed || mobile || !show) return
    const close = () => { setHover(false); setPinned(false) }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [fixed, show]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pinned) return
    const onDown = (e) => !ref.current?.contains(e.target) && !popRef.current?.contains(e.target) && setPinned(false)
    const onKey = (e) => e.key === 'Escape' && setPinned(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  const pop = (
        <span role="tooltip" id={id} ref={popRef} className={`pop ${align}${wide ? ' wide' : ''}`} style={fixed && !mobile ? { position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? 0, right: 'auto' } : shift ? { transform: `translateX(${shift}px)` } : undefined}>
          {children}
          {(pinned || fixed) && mobile && <button type="button" className="pop-close" onClick={() => { setPinned(false); setHover(false) }}>Fechar</button>}
        </span>
  )

  return (
    <span
      className="help"
      ref={ref}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={show}
        aria-describedby={show ? id : undefined}
        onClick={() => setPinned((p) => !p)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        ?
      </button>
      {show && pinned && mobile && <span className="pop-backdrop" onClick={() => setPinned(false)} aria-hidden="true" />}
      {show && (fixed ? createPortal(pop, document.body) : pop)}
    </span>
  )
}
