const U = {
 ff_this: 'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
 ff_next: 'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
 ibge: 'https://servicodados.ibge.gov.br/api/v3/calendario/?qtd=5',
 ibge2: 'https://servicodados.ibge.gov.br/api/v3/calendario/',
 bls: 'https://www.bls.gov/schedule/news_release/bls.ics',
 fed: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
 bcb_copom: 'https://www.bcb.gov.br/controleinflacao/calendarioreunioescopom',
 bcb_api: 'https://www.bcb.gov.br/api/servico/sitebcb/copom/calendario',
 bea: 'https://www.bea.gov/news/schedule',
 bea_ics: 'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics',
}
for (const [k, u] of Object.entries(U)) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(30000) })
    const t = await r.text()
    console.log(`### ${k} ${r.status} ${r.headers.get('content-type')} len=${t.length}`)
    console.log(t.slice(0, 700).replace(/\s+/g, ' '))
  } catch (e) { console.log(`### ${k} ERRO ${e.message}`) }
}
