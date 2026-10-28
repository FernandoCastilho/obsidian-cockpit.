// SONDAGEM TEMPORÁRIA: o que as fontes de frete (Japão, China, rotas) oferecem de forma legível por máquina.
const targets = [
  'https://www.boj.or.jp/en/statistics/pi/sppi_2020/index.htm',
  'https://www.stat-search.boj.or.jp/index_en.html',
  'https://www.stat-search.boj.or.jp/info/dload_en.html',
  'https://www.stat-search.boj.or.jp/api/v1/getMetadata?format=json&lang=en&db=PR02',
  'https://en.sse.net.cn/indices/scfinew.jsp',
  'https://en.sse.net.cn/indices/ccfinew.jsp',
  'https://www.sse.net.cn/index/indexImportDetail?name=scfi',
  'https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry',
  'https://fbx.freightos.com/',
]
for (const u of targets) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-sondagem)' }, signal: AbortSignal.timeout(40000), redirect: 'follow' })
    const t = await r.text()
    const title = (t.match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim()
    const links = [...new Set([...t.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map((m) => m[1]).filter((l) => /csv|json|api|zip|xls|download|dload|\.txt/i.test(l)))].slice(0, 12)
    console.log('\n##', u, '→', r.status, r.url !== u ? r.url : '', 'bytes', t.length, 'title:', title)
    console.log('links:', JSON.stringify(links))
    const text = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    console.log('texto:', text.slice(0, 500))
    const kw = text.match(/.{0,120}(Santos|South America|ocean freight|Ocean freight|international transportation).{0,200}/i)
    if (kw) console.log('trecho:', kw[0])
  } catch (e) { console.log('\n##', u, 'ERRO', e.message) }
}
