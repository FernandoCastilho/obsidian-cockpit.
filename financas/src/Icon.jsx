import { useState } from 'react'
import { GLYPHS, glyph, textOn } from './icons.js'

export const Icon = ({ name, size = 20 }) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={GLYPHS[glyph(name)]} />
  </svg>
)

// Ícone dentro de um quadrado suave; âmbar quando o item precisa de atenção.
export const Tile = ({ name, size = 34, warn }) => (
  <span className={warn ? 'tile warn' : 'tile'} style={{ width: size, height: size }}>
    <Icon name={name} size={Math.round(size * 0.56)} />
  </span>
)

// Selo do banco: logo informado na planilha (coluna logo_url) ou sigla na cor da marca.
export function BankBadge({ banco, size = 18 }) {
  const [falhou, setFalhou] = useState(false)
  if (!banco) return null
  if (banco.logo && !falhou) {
    return <img className="bank logo" src={banco.logo} alt={banco.nome} title={banco.nome} width={size} height={size} referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
  }
  const bg = /^#[0-9a-f]{6}$/i.test(banco.cor) ? banco.cor : '#6a6f6c'
  return (
    <span className="bank" title={banco.nome} style={{ width: size, height: size, background: bg, color: textOn(bg), fontSize: Math.round(size * (banco.sigla.length > 2 ? 0.38 : 0.5)) }}>
      {banco.sigla}
    </span>
  )
}
