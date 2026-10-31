import { useEffect, useRef, useState } from 'react'
import './Nav.css'
// Navegação por abas: barra inferior fixa no celular e no computador (a posição muda só no CSS).
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p) => <path key={p} d={p} />)}
  </svg>
)

export const TABS = [
  { id: 'resumo', label: 'Mercado hoje', icon: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M14.5 9.5c-.4-1-1.3-1.5-2.5-1.5-1.4 0-2.5.7-2.5 1.8 0 2.4 5 1.2 5 3.6 0 1.1-1.1 1.8-2.5 1.8-1.3 0-2.2-.6-2.6-1.6', 'M12 6.5V8M12 16v1.5'] },
  { id: 'juros', label: 'Juros', icon: ['M5 20V11', 'M12 20V5', 'M19 20v-6'] },
  { id: 'cenarios', label: 'Cenários', icon: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'] },
  { id: 'noticias', label: 'Notícias', icon: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 12h6M9 16h6'] },
  { id: 'bndes', label: 'BNDES', icon: ['M4 20h16', 'M6 20V10l6-5 6 5v10', 'M10 20v-5h4v5'] },
  { id: 'setores', label: 'Setores', icon: ['M3 20h18', 'M5 20V9l5 3V8l5 3V5l4 2v13'] },
  { id: 'calculadora', label: 'Calculadoras', icon: ['M6 3h12v18H6z', 'M9 7h6', 'M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01M15 18h.01'] },
  { id: 'feriados', label: 'Feriados', icon: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4M16 3v4'] },
  { id: 'aprender', label: 'Aprender', icon: ['M3 9l9-5 9 5-9 5-9-5z', 'M7 11.5V16c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4.5', 'M21 9v6'] },
  { id: 'config', label: 'Configurações', icon: ['M12 9a3 3 0 100 6 3 3 0 000-6z', 'M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z'] },
]

const PRIMARY = ['resumo', 'juros', 'cenarios', 'noticias']
const DOTS = ['M5 12h.01M12 12h.01M19 12h.01']

// Ordem: Mercado hoje, Juros, Cenários e as demais. No celular, as 4 primeiras ficam na barra e as demais entram em "Mais"; no computador aparecem todas.
export default function Nav({ tab, onTab }) {
  const [more, setMore] = useState(false)
  const ref = useRef(null)
  const secondary = TABS.filter((t) => !PRIMARY.includes(t.id))
  useEffect(() => {
    if (!more) return
    const onDown = (e) => !ref.current?.contains(e.target) && setMore(false)
    const onKey = (e) => e.key === 'Escape' && setMore(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [more])
  return (
    <nav className="tabs" aria-label="Seções" ref={ref}>
      {TABS.map((t) => (
        <button key={t.id} type="button" className={`${t.id === tab ? 'on' : ''}${PRIMARY.includes(t.id) ? '' : ' sec'}`} aria-current={t.id === tab ? 'page' : undefined} onClick={() => onTab(t.id)}>
          <Icon d={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
      <div className="more-tab">
        <button type="button" className={secondary.some((t) => t.id === tab) ? 'on' : ''} aria-expanded={more} aria-haspopup="menu" onClick={() => setMore((m) => !m)}>
          <Icon d={DOTS} />
          <span>Mais</span>
        </button>
        {more && (
          <div className="more-sheet" role="menu">
            {secondary.map((t) => (
              <button key={t.id} type="button" role="menuitem" className={t.id === tab ? 'on' : ''} onClick={() => (setMore(false), onTab(t.id))}>
                <Icon d={t.icon} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
