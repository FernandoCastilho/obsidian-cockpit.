import { useEffect, useId, useRef, useState } from 'react'

// Ícone "?" com explicação: abre ao passar o mouse, ao focar pelo teclado ou ao tocar/clicar (fixa).
export default function Help({ label, align = 'left', children }) {
  const [pinned, setPinned] = useState(false)
  const [hover, setHover] = useState(false)
  const ref = useRef(null)
  const id = useId()
  const show = pinned || hover

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
      {show && (
        <span role="tooltip" id={id} className={`pop ${align}`}>
          {children}
        </span>
      )}
    </span>
  )
}
