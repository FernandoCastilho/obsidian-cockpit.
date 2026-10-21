import { useLayoutEffect, useRef, useState } from 'react'

// O mesmo conteúdo permanece montado ao ampliar: filtros e seleções são preservados.
// O diálogo nativo mantém foco e Escape dentro da vista ampliada, inclusive no celular.
export default function Expandable({ children, label, modal = false, onClose }) {
  const [full, setFull] = useState(false)
  const ref = useRef(null)
  const active = modal || full
  useLayoutEffect(() => {
    const el = ref.current
    if (active) {
      el.removeAttribute('open')
      el.showModal()
      const previous = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        el.close()
        document.body.style.overflow = previous
      }
    }
    el.setAttribute('open', '')
  }, [active])
  const restore = () => setFull(false)
  return (
    <dialog ref={ref} className={`expandable-panel${active ? ' is-dialog' : ''}${full ? ' is-full' : ''}`} aria-label={label}
      onCancel={(e) => { e.preventDefault(); full ? restore() : onClose?.() }}
      onClick={(e) => { if (modal && e.target === e.currentTarget) onClose?.() }}>
      <div className="expandable-controls">
        <button type="button" className="btn" aria-label={`${full ? 'Restaurar' : 'Maximizar'} ${label}`} aria-pressed={full} onClick={() => setFull((v) => !v)}>
          {full ? '↙ Restaurar' : '⛶ Tela cheia'}
        </button>
        {modal && <button type="button" className="btn" onClick={onClose} aria-label="Fechar detalhes">Fechar ×</button>}
      </div>
      {children}
    </dialog>
  )
}
