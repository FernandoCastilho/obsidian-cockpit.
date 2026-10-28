// SONDAGEM TEMPORÁRIA 8 (sai do repositório depois): serviço público de taxas do guia do BNDES, no formato que os gráficos da página usam.
const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'application/json,*/*', referer: 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/guia/custos-financeiros/tfb-taxa-fixa-bndes' }
const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10).replaceAll('-', '')
const base = 'https://www.bndes.gov.br/apoioFinanceiro/rest/taxas/'
const fmts = (c) => [`${c}/20260101/${hoje}`]
for (const c of ['TFB_60_30', 'TFB_36_30', 'TFB_120_90', 'TFBTR_60_90', 'TFBTR_120_180', 'C01', 'C02', 'C03', 'C05', '777', '236', '200', '311', '590', 'TFBD_24_120']) {
  for (const p of fmts(c)) {
    try {
      const r = await fetch(base + p, { headers: H, signal: AbortSignal.timeout(40000) }); const t = await r.text()
      let n = '', last = ''
      try { const j = JSON.parse(t); if (Array.isArray(j)) { n = j.length + ' registros'; last = JSON.stringify(j.slice(-2)); } else last = t.slice(0, 200) } catch { last = t.replace(/\s+/g, ' ').slice(0, 140) }
      console.log(`${c.padEnd(15)} http ${r.status} ${n} ${last}`)
    } catch (e) { console.log(c, 'erro', String(e.cause?.code || e.message)) }
  }
}
console.log('### FIM')
