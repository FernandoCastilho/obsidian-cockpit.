import { flagSvg, hasFlag } from './flags.js'

// Bandeira em SVG (aparece em qualquer sistema). Decorativa: o nome do país/moeda já está no texto ao lado.
export default function Flag({ code, width = 20, height = 14, className = '' }) {
  if (!hasFlag(code)) return null
  return <span className={`flag ${className}`.trim()} aria-hidden="true" dangerouslySetInnerHTML={{ __html: flagSvg(code, `width="${width}" height="${height}"`) }} />
}
