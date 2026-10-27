// SONDAGEM TEMPORÁRIA (sai do repositório na etapa seguinte): descobre no deploy, com rede real, quais séries do Banco Central
// correspondem a TR, TBF e TLP. Imprime só o necessário; não grava arquivo nem altera o site.
const get = async (url, ms = 25000) => {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-sondagem)', accept: 'application/json' }, signal: AbortSignal.timeout(ms) })
    return { status: res.status, body: await res.text() }
  } catch (e) {
    return { status: 0, body: String(e.message) }
  }
}
const short = (s, n = 160) => String(s).replace(/\s+/g, ' ').slice(0, n)
console.log('### SONDAGEM INDEXADORES')

// 1) Portal de dados abertos do BCB (CKAN): títulos e links das séries
for (const q of ['taxa referencial', 'taxa básica financeira', 'taxa de longo prazo', 'TLP', 'TBF']) {
  const r = await get(`https://dadosabertos.bcb.gov.br/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=6`)
  let line = `[ckan "${q}"] http ${r.status}`
  try {
    const j = JSON.parse(r.body)
    const hits = (j.result?.results ?? []).map((p) => {
      const urls = (p.resources ?? []).map((x) => x.url).filter((u) => /sgs|bcdata/i.test(u || '')).map((u) => (u.match(/sgs\.(\d+)/) || [])[1] || short(u, 60))
      return `${short(p.title, 70)} => [${[...new Set(urls)].join(',')}]`
    })
    line += ` ${hits.length} resultados: ${hits.join(' || ')}`
  } catch { line += ' ' + short(r.body) }
  console.log(line)
}

// 2) Séries candidatas do SGS: código, última(s) observação(ões)
const CANDIDATES = [25, 226, 253, 256, 7811, 7812, 7813, 7814, 7815, 27572, 27573, 27574, 27575, 27576, 27577]
for (const code of CANDIDATES) {
  const r = await get(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/3?formato=json`, 20000)
  console.log(`[sgs ${code}] http ${r.status} ${short(r.body, 200)}`)
}
console.log('### FIM DA SONDAGEM')
