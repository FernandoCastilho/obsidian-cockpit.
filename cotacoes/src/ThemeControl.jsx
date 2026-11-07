import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { readThemePreference, setThemePreference, subscribeTheme } from './systemTheme.js'
import './ThemeControl.css'

const OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Automático', detail: 'Acompanha o dispositivo' },
]

function ThemeIcon({ theme }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {theme === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" /></> : theme === 'dark' ? <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" /> : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}
  </svg>
}

export default function ThemeControl({ className = '' }) {
  const preference = useSyncExternalStore(subscribeTheme, readThemePreference, () => 'system')
  const [open, setOpen] = useState(false)
  const container = useRef(null), trigger = useRef(null), options = useRef(null)
  const id = useId()
  const label = OPTIONS.find(option => option.value === preference).label
  const close = () => { setOpen(false); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    options.current?.querySelector('[aria-pressed="true"]')?.focus()
    const outside = event => { if (!container.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <div className={`theme-control ${className}`} ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close() }
  }}>
    <button type="button" className="theme-trigger" ref={trigger} aria-label={`Tema: ${label}. Alterar aparência`} title={`Tema: ${label}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <ThemeIcon theme={preference} />
    </button>
    {open && <div className="theme-options" id={id} ref={options} role="group" aria-label="Aparência do painel">
      {OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={preference === option.value} onClick={() => { setThemePreference(option.value); close() }}>
        <ThemeIcon theme={option.value} /><span>{option.label}{option.detail && <small>{option.detail}</small>}</span><span className="theme-check" aria-hidden="true">{preference === option.value ? '✓' : ''}</span>
      </button>)}
    </div>}
  </div>
}
