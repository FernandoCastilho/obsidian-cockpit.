import { moneyParts } from './format.js'

// Valor em reais com hierarquia: os reais em destaque, "R$" e centavos mais discretos.
export default function Money({ v, cents = true }) {
  const p = moneyParts(v)
  return (
    <span className="money">
      {p.neg ? '−' : ''}
      <span className="cur">R$&nbsp;</span>
      {p.whole}
      {cents && <span className="cents">,{p.cents}</span>}
    </span>
  )
}
