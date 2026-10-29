const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: '*/*' }
const ORI = 'https://www.bndes.gov.br'
const base = ORI + '/apoioFinanceiro/rest/taxas/'
async function get(url) {
  try {
    const r = await fetch(url, { headers: { ...H, referer: ORI + '/' }, signal: AbortSignal.timeout(40000) })
    const t = await r.text()
    return { s: r.status, len: t.length, head: t.slice(0, 110).replace(/\s+/g, ' '), tail: t.slice(-75).replace(/\s+/g, ' ') }
  } catch (e) { return { err: e.message } }
}
const codes = []
for (const p of [36, 60, 84, 120]) for (const l of [30, 60, 90, 120]) codes.push(`TFBTR_${p}_${l}`)
for (const p of [12, 24, 36, 60]) for (const l of ['00', '0', 30, 90]) codes.push(`CFD_${p}_${l}`)
for (const p of [24, 72, 120]) for (const l of [30, 60, 90, 120]) codes.push(`TFBD_${p}_${l}`)
for (const c of codes) {
  const t = await get(`${base}${c}.txt`)
  if (t.s === 200 && t.len > 40) { console.log('OK  txt', c, t.len, '|', t.head, '...', t.tail); continue }
  const j = await get(`${base}${c}/20200101/20261029`)
  if (j.s === 200 && j.len > 4) console.log('OK  json', c, j.len, '|', j.head, '...', j.tail)
  else if (j.s === 200 || t.s === 200) console.log('vazio', c, 'txt', t.s, t.len, 'json', j.s, j.len)
}
console.log('### FIM (404 omitidos)')
