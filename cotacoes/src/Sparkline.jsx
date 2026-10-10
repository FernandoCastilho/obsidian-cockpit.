import { useId } from 'react'
import { periodChange } from './stats.js'

// Minigráfico de linha: verde se o período subiu, vermelho se caiu (cores do app), cinza se não há dados.
export default function Sparkline({ points, height = 44 }) {
  const gid = useId().replace(/:/g, '')
  const W = 120
  if (!points || points.length < 2) return <svg viewBox={`0 0 ${W} ${height}`} className="spark" aria-hidden="true" />
  const vals = points.map((p) => p.bid)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const x = (i) => (i / (points.length - 1)) * W
  const y = (v) => 3 + (1 - (v - lo) / (hi - lo || 1)) * (height - 6)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.bid).toFixed(1)}`).join('')
  const up = periodChange(points) >= 0
  const color = up ? 'var(--up)' : 'var(--down)'
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="spark" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W},${height}L0,${height}Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
