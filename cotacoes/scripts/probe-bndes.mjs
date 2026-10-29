const H = { 'user-agent': 'Mozilla/5.0', referer: 'https://www.bndes.gov.br/' }
const base = 'https://www.bndes.gov.br/apoioFinanceiro/rest/taxas/'
async function get(url) {
  try {
    const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(40000) })
    const t = await r.text()
    return { status: r.status, ct: r.headers.get('content-type'), len: t.length, head: t.slice(0, 300), tail: t.slice(-160) }
  } catch (e) { return { err: e.message } }
}
for (const p of [36, 60, 84, 120]) for (const l of [30, 60, 90, 120]) {
  const code = `TFB_${p}_${l}`
  const j = await get(`${base}${code}/20261015/20261029`)
  console.log(code, 'json', JSON.stringify(j))
}
for (const code of ['TFB_60_90', 'TFB_60_30', 'TFB_36_90']) console.log(code, 'txt', JSON.stringify(await get(`${base}${code}.txt`)))
