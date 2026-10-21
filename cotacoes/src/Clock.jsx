import { useEffect, useState } from 'react'

// Relógio de cada praça, no fuso do mercado que representa.
// open/close: horário aproximado de negociação local (dias úteis).
export const ZONES = {
  BRL: { city: 'São Paulo', short: 'SP', tz: 'America/Sao_Paulo', open: 9, close: 18 },
  USD: { city: 'Nova York', short: 'NY', tz: 'America/New_York', open: 8, close: 17 },
  GBP: { city: 'Londres', short: 'LDN', tz: 'Europe/London', open: 8, close: 17 },
  JPY: { city: 'Tóquio', short: 'TYO', tz: 'Asia/Tokyo', open: 9, close: 17 },
  CNH: { city: 'Xangai', short: 'SHA', tz: 'Asia/Shanghai', open: 9, close: 17 },
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

function isOpen(now, zone) {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: zone.tz, weekday: 'short' }).format(now)
  if (wd === 'Sat' || wd === 'Sun') return false
  const h = Number(part(now, zone.tz, { hour: '2-digit', hourCycle: 'h23' }))
  return h >= zone.open && h < zone.close
}

function One({ zone, now }) {
  const open = isOpen(now, zone)
  return (
    <span
      className="clock-one"
      title={`${zone.city} — mercado ${open ? 'aberto' : 'fechado'}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
    >
      <span
        aria-hidden="true"
        style={{ width: 7, height: 7, borderRadius: '50%', background: open ? '#22c55e' : '#9ca3af', display: 'inline-block' }}
      />
      <small>{zone.short}</small>
      <b>{part(now, zone.tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</b>
    </span>
  )
}

export default function Clock({ codes: all }) {
  const now = useNow()
  const codes = all.filter((c) => ZONES[c])
  if (!codes.length) return null
  return (
    <div
      className="clock"
      role="timer"
      aria-label={codes.map((c) => ZONES[c].city).join(', ')}
      style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between', gap: 8, overflowX: 'auto', fontSize: '0.8rem' }}
    >
      {codes.map((c) => (
        <One key={c} zone={ZONES[c]} now={now} />
      ))}
    </div>
  )
}
