import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

// Ícone "?" com explicação: abre ao passar o mouse, ao focar pelo teclado ou ao tocar/clicar (fixa).
export default function Help({ label, align = 'left', wide = false, children }) {
  const [pinned, setPinned] = useState(false)
  const [hover, setHover] = useState(false)
  const ref = useRef(null)
  const id = useId()
  const show = pinned || hover
  const popRef = useRef(null)
  const mobile = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 560px)').matches
  const [shift, setShift] = useState(0)

  // Mantém o balão dentro da janela (perto da borda direita ou esquerda ele deslocava para fora da tela).
  useLayoutEffect(() => {
    if (!show || !popRef.current) return setShift(0)
    const r = popRef.current.getBoundingClientRect()
    const base = r.left - shift
    const w = r.width
    const max = window.innerWidth - 8
    setShift(base + w > max ? max - (base + w) : base < 8 ? 8 - base : 0)
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pinned) return
    const onDown = (e) => !ref.current?.contains(e.target) && setPinned(false)
    const onKey = (e) => e.key === 'Escape' && setPinned(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

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
      {show && (
        <span role="tooltip" id={id} ref={popRef} className={`pop ${align}${wide ? ' wide' : ''}`} style={shift ? { transform: `translateX(${shift}px)` } : undefined}>
          {children}
          {pinned && mobile && <button type="button" className="pop-close" onClick={() => setPinned(false)}>Fechar</button>}
        </span>
      )}
    </span>
  )
}
