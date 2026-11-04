import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './DynamicNotifications.css'

const Notifications = createContext(() => {})
export const useDynamicNotifications = () => useContext(Notifications)

// Web adaptation inspired by rit3zh/expo-dynamic-notifications; no native dependencies.
export default function DynamicNotifications({ children }) {
  const [notice, setNotice] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const card = useRef(null)
  const opener = useRef(null)
  const trigger = useCallback((value) => {
    if (!card.current?.contains(document.activeElement)) opener.current = document.activeElement
    setExpanded(false)
    setNotice({ ...value, id: Date.now() })
  }, [])
  const dismiss = () => {
    if (card.current?.contains(document.activeElement) && opener.current?.isConnected) opener.current.focus({ preventScroll: true })
    setNotice(null)
    setFocused(false)
    setHovered(false)
  }
  useEffect(() => {
    if (!notice || notice.error || expanded || hovered || focused) return undefined
    const timer = setTimeout(() => setNotice(null), 9000)
    return () => clearTimeout(timer)
  }, [notice, expanded, hovered, focused])
  return <Notifications.Provider value={trigger}>
    {children}
    {createPortal(<div className="dynamic-notices">
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice ? `${notice.title}. ${notice.message}` : ''}</span>
      {notice && <section ref={card} className="dynamic-notice" data-error={notice.error || undefined}
        aria-label="Resultado da atualização" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation?.(); dismiss() } }}>
        <button type="button" className="dynamic-notice-content" aria-expanded={expanded} aria-controls="dynamic-notice-detail" onClick={() => setExpanded(v => !v)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d={notice.error ? 'M12 5v9m0 3v2' : 'm5 12 4 4L19 6'} /></svg>
          <span><strong>{notice.title}</strong><span className="dynamic-notice-hint">{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span></span>
        </button>
        <button type="button" className="dynamic-notice-close" aria-label="Fechar notificação" onClick={dismiss}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
        <p id="dynamic-notice-detail" hidden={!expanded}>{notice.message}</p>
      </section>}
    </div>, document.querySelector?.('dialog:modal') || document.body)}
  </Notifications.Provider>
}
