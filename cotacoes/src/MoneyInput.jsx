import { formatMoneyText } from './moneyInput.js'

// Campo de valor com prefixo da moeda; formata ao sair do campo e seleciona o conteúdo ao entrar.
export default function MoneyInput({ prefix = 'R$', value, onChange, ...rest }) {
  return (
    <span className="money-wrap">
      <i aria-hidden="true">{prefix}</i>
      <input inputMode="decimal" autoComplete="off" {...rest} value={value} onChange={(e) => onChange(e.target.value)} onFocus={(e) => e.target.select()} onBlur={(e) => { const f = formatMoneyText(e.target.value); if (f !== e.target.value) onChange(f) }} />
    </span>
  )
}
