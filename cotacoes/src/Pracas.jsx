import { CALENDARS } from './holidays.js'
import Explain from './Explain.jsx'

// Escolha das praças (calendários de feriado) usadas nos avisos e nas contas.
export default function Pracas({ pracas, onChange, label = 'Praças' }) {
  const toggle = (id) => onChange(pracas.includes(id) ? pracas.filter((p) => p !== id) : [...pracas, id])
  return (
    <div className="pracas">
      <span className="lbl">{label} <Explain id="feriados" /></span>
      <div className="chips" role="group" aria-label={label}>
        {CALENDARS.map((c) => (
          <button key={c.id} type="button" aria-pressed={pracas.includes(c.id)} title={c.label} onClick={() => toggle(c.id)}>
            {c.short}
          </button>
        ))}
      </div>
    </div>
  )
}
