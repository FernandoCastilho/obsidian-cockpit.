import { CURRENCIES } from './useQuotes.js'

const num = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}%`
const arrow = (v) => (v > 0 ? '🔺' : v < 0 ? '🔻' : '➖')

export const DISCLAIMER = 'Valores ilustrativos, em reais (BRL). Para cotações reais, consulte a Tesouraria do Itaú.'

const stampOf = (when) =>
  `${when.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

// Só a cotação do momento e a variação do dia, sem compra/venda/máx./mín.
function rows(quotes) {
  return CURRENCIES.filter((c) => quotes?.[c.code]).map((c) => {
    const q = quotes[c.code]
    return { key: c.code, country: [...c.flag].map((ch) => String.fromCharCode(ch.codePointAt(0) - 0x1f1e6 + 65)).join(''), icon: c.flag, code: q.source ?? c.code, price: `R$ ${num(q.bid)}`, trend: `${arrow(q.pct)} ${pct(q.pct)}` }
  })
}

// WhatsApp: *negrito*, _itálico_.
export function buildMessage(quotes, when = new Date()) {
  const r = rows(quotes)
  if (!r.length) return ''
  return [`*Cotações* · ${stampOf(when)}`, '', ...r.map((x) => `${x.icon} *${x.code}* ${x.price} ${x.trend}`), '', `_${DISCLAIMER}_`].join('\n')
}

// E-mail / Teams: texto simples, sem marcação.
export function buildPlain(quotes, when = new Date()) {
  const r = rows(quotes)
  if (!r.length) return ''
  return [`Cotações · ${stampOf(when)}`, '', ...r.map((x) => `${x.icon} ${x.code}  ${x.price}  ${x.trend}`), '', DISCLAIMER].join('\n')
}

// E-mail / Teams: versão formatada (negrito) com a bandeira como imagem; `pngs` = { USD: dataURI, ... }.
export function buildHtml(quotes, when = new Date(), pngs = {}) {
  const r = rows(quotes)
  if (!r.length) return ''
  const lines = r
    .map((x) => {
      const png = pngs[x.key]
      const flag = png ? `<img src="${png}" width="18" height="12" alt="${x.country}" style="vertical-align:middle">` : x.icon
      return `${flag}&nbsp;<b>${x.code}</b>&nbsp;&nbsp;${x.price}&nbsp;&nbsp;${x.trend}`
    })
    .join('<br>')
  return `<p><b>Cotações</b> · ${stampOf(when)}</p><p>${lines}</p><p><i>${DISCLAIMER}</i></p>`
}

export const whatsappUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`
