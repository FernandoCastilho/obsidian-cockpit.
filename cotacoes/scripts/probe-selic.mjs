const H = { 'user-agent': 'Mozilla/5.0 (cotacoes-sonda)', accept: 'application/json' }
const get = async (u) => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) }); if (r.ok) return await r.text(); console.log('HTTP', r.status, u) } catch (e) { console.log('ERRO', e.message) } await new Promise((r) => setTimeout(r, 2500)) } return null }
const BASE = 'https://fernandocastilho.github.io/obsidian-cockpit./'
// 1) o que o app publica
const m = JSON.parse(await get(BASE + 'macro.json?t=' + Date.now()))
const d = (t) => new Date(t).toISOString().slice(0, 10)
console.log('APP selic (últimas 6 mudanças):', JSON.stringify(m.selic.slice(-6).map(([t, v]) => [d(t), v])))
console.log('APP cdi (últimos 5):', JSON.stringify(m.cdi.slice(-5).map(([t, v]) => [d(t), v])), 'generatedAt', new Date(m.generatedAt).toISOString())
// 2) fonte oficial: SGS 432 (meta Selic) e 4389 (CDI anualizado)
const s432 = JSON.parse(await get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/12?formato=json'))
console.log('BCB SGS 432 (últimos 12 dias):', JSON.stringify(s432.map((x) => [x.data, x.valor])))
const s4389 = JSON.parse(await get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/5?formato=json'))
console.log('BCB SGS 4389 CDI (últimos 5):', JSON.stringify(s4389.map((x) => [x.data, x.valor])))
// 3) quando a meta mudou, no histórico longo da série
const all = JSON.parse(await get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=01/01/2025&dataFinal=31/12/2026'))
const mud = all.filter((x, i) => i === 0 || x.valor !== all[i - 1].valor)
console.log('BCB SGS 432 mudanças desde 2025:', JSON.stringify(mud.map((x) => [x.data, x.valor])))
// 4) histórico oficial das reuniões do Copom (página do BCB)
const html = await get('https://www.bcb.gov.br/controleinflacao/historicotaxasjuros')
if (html) {
  const txt = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  const i = txt.search(/\d{3,4}ª/)
  console.log('BCB página Copom (trecho):', txt.slice(Math.max(0, i - 200), i + 900))
}
