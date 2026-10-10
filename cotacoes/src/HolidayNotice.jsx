import { calLabel, cnMissingYears, upcomingHolidays } from './holidays.js'

const today = () => new Date().toISOString().slice(0, 10)
const dm = (s) => s.split('-').reverse().join('/')
const when = (d, t) => {
  const diff = Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${t}T12:00:00Z`)) / 864e5)
  return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : dm(d)
}

// Aviso de feriados nas praças escolhidas (próximos dias) e de calendário chinês ainda não publicado.
export default function HolidayNotice({ hol, days = 5, list = false }) {
  const t = today()
  const up = upcomingHolidays(t, days, hol.pracas, hol.ctx)
  const y = Number(t.slice(0, 4))
  const missing = hol.pracas.includes('CN') && hol.loaded ? cnMissingYears([y, y + 1], hol.ctx) : []
  if (!up.length && !missing.length) return list ? <p className="status">Nenhum feriado nas praças escolhidas nos próximos {days} dias.</p> : null
  return (
    <div className="holiday-notice" role="status">
      {up.length > 0 && (
        <ul>
          {up.map((u) => (
            <li key={u.date + u.cal}>
              <b>{when(u.date, t)}</b> · feriado em <b>{calLabel(u.cal)}</b>: {u.name}
              {u.cal === 'NY' && ' (sem liquidação em USD)'}
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <p className="status stale">
          China: o calendário oficial de {missing.join(' e ')} ainda não foi publicado pelo governo (costuma sair em novembro). Esses anos aparecem só com fins de semana; confira antes de fechar datas.
        </p>
      )}
    </div>
  )
}
