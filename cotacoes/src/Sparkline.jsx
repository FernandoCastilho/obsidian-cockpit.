import { useId } from 'react'
import { periodChange } from './stats.js'

// Minigráfico de linha. A cor vem de `tone` (a mesma variação mostrada no quadro): verde se subiu, vermelho se caiu, cinza se estável.
// Sem `tone`, usa a variação do próprio período.
export default function Sparkline({ points, tone, height = 44 }) {
  const gid = useId().replace(/:/g, '')
  const W = 120
  if (!points || points.length < 2) return <svg viewBox={`0 0 ${W} ${height}`} className="spark" aria-hidden="true" />
  const vals = points.map((p) => p.bid)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const x = (i) => (i / (points.length - 1)) * W
  const y = (v) => 3 + (1 - (v - lo) / (hi - lo || 1)) * (height - 6)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.bid).toFixed(1)}`).join('')
  const t = tone ?? (periodChange(points) >= 0 ? 'up' : 'down')
  const color = t === 'up' ? 'var(--up)' : t === 'down' ? 'var(--down)' : 'var(--mut)'
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="spark" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W},${height}L0,${height}Z`} fill={`url(#${gid})`} />
      <path className="line" style={{ color }} d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
