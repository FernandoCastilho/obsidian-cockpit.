import { CURRENCIES } from './useQuotes.js'

const num = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}%`
const arrow = (v) => (v > 0 ? '🔺' : v < 0 ? '🔻' : '➖')

// Windows (exceto Firefox) não desenha emojis de bandeira: mostra só as letras do país.
export const defaultIcons = () =>
  typeof navigator !== 'undefined' && /Windows/.test(navigator.userAgent) && !/Firefox/.test(navigator.userAgent) ? 'moeda' : 'bandeira'

const COIN = { USD: '💵', EUR: '💶', JPY: '💴', CNH: '🏮' }
const icon = (c, icons) => (icons === 'moeda' ? COIN[c.code] : c.flag)

const stampOf = (when) =>
  `${when.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

// Só a cotação do momento e a variação do dia, sem compra/venda/máx./mín.
function rows(quotes, icons) {
  return CURRENCIES.filter((c) => quotes?.[c.code]).map((c) => {
    const q = quotes[c.code]
    return { icon: icon(c, icons), code: q.source ?? c.code, price: `R$ ${num(q.bid)}`, trend: `${arrow(q.pct)} ${pct(q.pct)}` }
  })
}

// WhatsApp: *negrito*, _itálico_.
export function buildMessage(quotes, when = new Date(), icons = 'bandeira') {
  const r = rows(quotes, icons)
  if (!r.length) return ''
  return [`*Cotações* · ${stampOf(when)}`, '', ...r.map((x) => `${x.icon} *${x.code}* ${x.price} ${x.trend}`), '', '_Valores em reais (BRL)_'].join('\n')
}

// E-mail / Teams: texto simples, sem marcação.
export function buildPlain(quotes, when = new Date(), icons = 'bandeira') {
  const r = rows(quotes, icons)
  if (!r.length) return ''
  return [`Cotações · ${stampOf(when)}`, '', ...r.map((x) => `${x.icon} ${x.code}  ${x.price}  ${x.trend}`), '', 'Valores em reais (BRL)'].join('\n')
}

// E-mail / Teams: versão formatada (negrito) colada junto com o texto simples.
export function buildHtml(quotes, when = new Date(), icons = 'bandeira') {
  const r = rows(quotes, icons)
  if (!r.length) return ''
  const lines = r.map((x) => `${x.icon} <b>${x.code}</b>&nbsp;&nbsp;${x.price}&nbsp;&nbsp;${x.trend}`).join('<br>')
  return `<p><b>Cotações</b> · ${stampOf(when)}</p><p>${lines}</p><p><i>Valores em reais (BRL)</i></p>`
}

export const whatsappUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`
