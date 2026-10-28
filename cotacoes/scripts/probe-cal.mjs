const get = async (u, ms = 25000) => { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(ms) }); return [r.status, await r.text()] }
const show = async (k, u) => { try { const [s, t] = await get(u); console.log(`### ${k} ${s} len=${t.length}`); return t } catch (e) { console.log(`### ${k} ERRO ${e.cause?.code || e.message}`); return '' } }
// IBGE (várias formas)
for (const u of ['https://servicodados.ibge.gov.br/api/v3/calendario/?qtd=3', 'https://servicodados.ibge.gov.br/api/v3/calendario', 'http://servicodados.ibge.gov.br/api/v3/calendario/?qtd=3', 'https://apisidra.ibge.gov.br/', 'https://www.ibge.gov.br/calendario-indicadores-novo.html']) {
  const t = await show('ibge ' + u, u); if (t) console.log(t.slice(0, 400).replace(/\s+/g, ' '))
}
// BCB Copom
for (const u of ['https://www.bcb.gov.br/controleinflacao/calendarioreunioescopom', 'https://www.bcb.gov.br/content/copom/calendario.json', 'https://www.bcb.gov.br/api/servico/sitebcb/copom/calendarioreunioes?filtro=']) {
  const t = await show('bcb ' + u, u); if (t) { console.log(t.slice(0, 300).replace(/\s+/g, ' ')); const m = t.match(/[^.]{0,80}2026[^.]{0,120}/g); console.log('2026 trechos', m?.slice(0, 3)) }
}
// Fed
const fed = await show('fed', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm')
const i = fed.indexOf('2026 FOMC Meetings'); console.log('fed idx', i); console.log(fed.slice(i, i + 1800).replace(/\s+/g, ' '))
// BLS
const bls = await show('bls', 'https://www.bls.gov/schedule/news_release/bls.ics')
const ev = [...bls.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)].map((m) => m[0])
const pick = ev.filter((e) => /DTSTART[^:]*:2026(10|11|12)/.test(e)).slice(0, 8).map((e) => e.replace(/\r?\n/g, ' | ').slice(0, 300)); console.log(pick.join('\n'))
console.log('bls resumos', [...new Set(ev.map((e) => /SUMMARY:(.*)/.exec(e)?.[1]?.trim()))].slice(0, 40).join(' ; '))
// BEA
const bea = await show('bea', 'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics')
const bev = [...bea.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)].map((m) => m[0])
console.log(bev.filter((e) => /DTSTART[^:]*:2026(10|11|12)/.test(e)).slice(0, 8).map((e) => e.replace(/\r?\n/g, ' | ').slice(0, 260)).join('\n'))
// FF
const ff = JSON.parse(await show('ff', 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'))
console.log('ff n', ff.length, 'paises', [...new Set(ff.map((x) => x.country))].join(','), 'impacts', [...new Set(ff.map((x) => x.impact))].join(','), JSON.stringify(ff.find((x) => x.impact === 'High')))
