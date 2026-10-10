// Navegação por abas: barra inferior no celular, barra superior no computador (a posição muda só no CSS).
const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p) => <path key={p} d={p} />)}
  </svg>
)

export const TABS = [
  { id: 'resumo', label: 'Resumo', icon: ['M3 11l9-8 9 8', 'M5 10v10h5v-6h4v6h5V10'] },
  { id: 'moedas', label: 'Moedas', icon: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M14.5 9.5c-.4-1-1.3-1.5-2.5-1.5-1.4 0-2.5.7-2.5 1.8 0 2.4 5 1.2 5 3.6 0 1.1-1.1 1.8-2.5 1.8-1.3 0-2.2-.6-2.6-1.6', 'M12 6.5V8M12 16v1.5'] },
  { id: 'juros', label: 'Juros', icon: ['M5 20V11', 'M12 20V5', 'M19 20v-6'] },
  { id: 'cenarios', label: 'Cenários', icon: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'] },
  { id: 'noticias', label: 'Notícias', icon: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 12h6M9 16h6'] },
]

export default function Nav({ tab, onTab }) {
  return (
    <nav className="tabs" aria-label="Seções">
      {TABS.map((t) => (
        <button key={t.id} type="button" className={t.id === tab ? 'on' : ''} aria-current={t.id === tab ? 'page' : undefined} onClick={() => onTab(t.id)}>
          <Icon d={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
