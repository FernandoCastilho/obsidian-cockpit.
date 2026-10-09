import { CURRENCIES } from './useQuotes.js'

const num = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}%`
const arrow = (v) => (v > 0 ? '🔺' : v < 0 ? '🔻' : '➖')

// Texto no formato do WhatsApp: *negrito*, _itálico_. Só a cotação do momento e a variação do dia.
export function buildMessage(quotes, when = new Date()) {
  const stamp = `${when.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  const lines = CURRENCIES.filter((c) => quotes?.[c.code]).map((c) => {
    const q = quotes[c.code]
    return `${c.flag} *${q.source ?? c.code}* R$ ${num(q.bid)} ${arrow(q.pct)} ${pct(q.pct)}`
  })
  if (!lines.length) return ''
  return [`*Cotações* · ${stamp}`, '', ...lines, '', '_Valores em reais (BRL)_'].join('\n')
}

export const whatsappUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`
