// SONDAGEM TEMPORÁRIA 2: API do Banco do Japão (série de frete marítimo) e termos de uso do Drewry/Freightos.
const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-sondagem)' }, signal: AbortSignal.timeout(60000) }); return { r, t: await r.text() } }
const { t: meta } = await get('https://www.stat-search.boj.or.jp/api/v1/getMetadata?format=json&lang=en&db=PR02')
const rows = JSON.parse(meta).RESULTSET.filter((x) => /ocean|international transport|sea transport|freight|shipping|vessel/i.test(x.NAME_OF_TIME_SERIES))
for (const x of rows) console.log('BOJ', x.SERIES_CODE, '|', x.NAME_OF_TIME_SERIES, '|', x.UNIT, '|', x.FREQUENCY, '|', x.START_OF_THE_TIME_SERIES, '→', x.END_OF_THE_TIME_SERIES, '|', x.LAST_UPDATE)
for (const code of ['PRCS20_5200730001']) {
  const { r, t } = await get(`https://www.stat-search.boj.or.jp/api/v1/getDataCode?format=json&lang=en&db=PR02&code=${code}`)
  console.log('\nDATA', code, r.status, t.length, t.slice(0, 700))
}
const { t: wci } = await get('https://www.drewry.co.uk/supply-chain-advisors/supply-chain-expertise/world-container-index-assessed-by-drewry')
const text = wci.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
for (const re of [/.{0,200}Composite.{0,400}/i, /.{0,200}(copyright|reproduc|licen[cs]e|permission|terms of use).{0,300}/i]) console.log('\nWCI>', (text.match(re) || ['(sem trecho)'])[0])
const { t: fbx } = await get('https://www.freightos.com/enterprise/terminal/freightos-baltic-index-global-container-pricing-index/')
const ft = fbx.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
for (const re of [/.{0,200}South America.{0,300}/i, /.{0,200}(free|license|API|terms).{0,200}/i]) console.log('\nFBX>', (ft.match(re) || ['(sem trecho)'])[0])
