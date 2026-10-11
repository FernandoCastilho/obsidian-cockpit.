import { useEffect, useState } from 'react'

// Relógio de cada país, no fuso do mercado que representa a moeda.
export const ZONES = {
  USD: { city: 'Nova York', tz: 'America/New_York' },
  EUR: { city: 'Frankfurt', tz: 'Europe/Berlin' },
  JPY: { city: 'Tóquio', tz: 'Asia/Tokyo' },
  CNH: { city: 'Xangai', tz: 'Asia/Shanghai' },
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(id)
  }, [])
  return now
}

const part = (now, tz, opts) => new Intl.DateTimeFormat('pt-BR', { timeZone: tz, ...opts }).format(now)

function One({ zone, now }) {
  const hour = Number(part(now, zone.tz, { hour: '2-digit', hourCycle: 'h23' }))
  const day = hour >= 7 && hour < 19
  return (
    <span className="clock-one" title={`${zone.city} (${zone.tz})`}>
      <span aria-hidden="true">{day ? '☀' : '☾'}</span>
      <b>{part(now, zone.tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</b>
      <small>
        {zone.city} · {part(now, zone.tz, { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')}
      </small>
    </span>
  )
}

export default function Clock({ codes }) {
  const now = useNow()
  return (
    <div className="clock" role="timer" aria-label={codes.map((c) => ZONES[c].city).join(' e ')}>
      {codes.map((c) => (
        <One key={c} zone={ZONES[c]} now={now} />
      ))}
    </div>
  )
}
