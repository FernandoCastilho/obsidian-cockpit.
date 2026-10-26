// Fixture synthetic values only; no provider feed or prices are certified by this smoke.
const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict')
;(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:8768',out=process.env.TABLE_QA_OUTPUT||'table-qa';fs.mkdirSync(out,{recursive:true});const results=[]
 try{for(const width of [390,820,1440]){
 const ctx=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));let mode='ok';const now=Date.now(),day=864e5
 await ctx.route('**/*',route=>{
  const u=new URL(route.request().url()),name=u.pathname.split('/').pop()
  if(name==='intraday.json')return mode==='ok'?route.fulfill({json:{generatedAt:now,series:Object.fromEntries(['USD','EUR','JPY','CNH'].map(c=>[c,{points:[[now-600000,5],[now-300000,5.1],[now,5.2]]}]))}}):route.abort()
  if(name==='macro.json')return route.fulfill({json:{generatedAt:now,cdi:[[now-day,12]],selic:[[now-day,12]],sofr:[[now-day,4]],ptax:{USD:{sell:5.03,date:'2026-10-23'}},ptaxHist:{}}})
  if(name==='history.json')return route.fulfill({json:{generatedAt:now,series:Object.fromEntries(['USD','EUR','JPY','CNH'].map(c=>[c,{points:[[now-3*day,5],[now-day,5.1]]}]))}})
  if(u.hostname==='economia.awesomeapi.com.br')return mode==='ok'?route.fulfill({json:Object.fromEntries(['USDBRL','EURBRL','JPYBRL','USDCNH'].map((c,i)=>[c,{bid:String(i===2?.03355:5.4511),ask:String(i===2?.0336:5.46),high:'6',low:'.01',pctChange:i===1?'-0.52':'0.51',varBid:i===2?'0.00002':i===1?'-.0284':'.0277',timestamp:String(Math.floor(now/1000))}]))}):route.abort()
  if(u.hostname==='api.frankfurter.dev')return mode==='reserve'?route.fulfill({json:{date:new Date(now-day).toISOString().slice(0,10),rates:{BRL:5.12}}}):route.abort()
  if(u.origin===base)return route.continue();return route.abort()
 })
 await p.goto(base+'/#resumo');const table=p.getByRole('table',{name:'Câmbio em reais · últimas referências disponíveis'});await table.waitFor();await table.getByText('5,4511',{exact:true}).first().waitFor()
 assert.equal(await table.locator('tbody').count(),4);assert.match(await p.getByRole('heading',{name:/Mercado hoje/}).innerText(),/Mercado hoje/)
 const nav=p.getByRole('navigation',{name:'Seções'}).getByRole('button',{name:'Mercado hoje',exact:true});await nav.waitFor();assert.equal(await nav.evaluate(e=>e.scrollWidth<=e.clientWidth),true)
 assert.match(await table.locator('tbody').first().innerText(),/\+0,0277/);assert.match(await table.locator('tbody').nth(2).innerText(),/0,03355/)
 assert.equal(await table.locator('tbody').nth(3).getByLabel('Variação absoluta indisponível para o cruzamento').count(),1)
 const bounds=await table.locator('.market-open').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));assert.ok(bounds.every(x=>x.height>=44&&x.width>=44))
 for(const [index,name]of ['Dólar americano','Euro','Iene japonês','Yuan'].entries()){
  await table.locator('tbody').nth(index).locator('.market-price').click();const modal=p.getByRole('dialog',{name:'detalhes da moeda'});await modal.waitFor();await modal.screenshot({path:`${out}/${width}-${index}-modal.png`});assert.match(await modal.innerText(),new RegExp(index===0?'USD':index===1?'EUR':index===2?'JPY':'CNH'));await p.keyboard.press('Escape');await modal.waitFor({state:'hidden'})
 }
 const widget=p.locator('tv-single-ticker');assert.equal(await widget.getAttribute('symbol'),'TVC:UKOIL');assert.equal(await widget.getAttribute('transparent'),'');await p.getByRole('button',{name:'Petróleo Brent: abrir histórico'}).click();const oil=p.getByRole('dialog',{name:'histórico do petróleo Brent'});await oil.waitFor();assert.match(await oil.innerText(),/Histórico EIA independente do CFD/);await oil.getByRole('group',{name:'Período do petróleo'}).getByRole('button',{name:'Semana',exact:true}).click();await p.keyboard.press('Escape');await oil.waitFor({state:'hidden'});
 const button=table.getByRole('button',{name:'Dólar americano: abrir gráfico'});for(const key of ['Enter','Space']){await button.focus();await p.keyboard.press(key);const modal=p.getByRole('dialog',{name:'detalhes da moeda'});await modal.waitFor();await p.keyboard.press('Escape');await modal.waitFor({state:'hidden'});assert.equal(await button.evaluate(e=>e===document.activeElement),true)}
 await table.screenshot({path:`${out}/${width}-table.png`});await p.screenshot({path:`${out}/${width}-page.png`,fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 await p.getByRole('navigation',{name:'Seções'}).getByRole('button',{name:'Juros',exact:true}).click();await p.goBack();await table.waitFor();await p.goForward();await p.waitForURL('**/#juros')
 mode='error';await p.goto(base+'/#resumo');await p.getByRole('button',{name:'Atualizar cotações agora',exact:true}).click();await p.getByText('Atualização pendente',{exact:false}).first().waitFor();await p.getByRole('table').screenshot({path:out+'/'+width+'-stale.png'});
 for(const state of ['reserve','error']){mode=state;await p.goto(base+'/#resumo');await p.reload();await p.getByRole('table').waitFor();await p.waitForTimeout(250);if(state==='reserve'){await p.getByText('Referência diária de reserva',{exact:false}).first().waitFor();assert.equal(await p.locator('.market-values .pct').count(),0);await p.getByText('CNY/BRL',{exact:false}).first().waitFor()}else await p.getByText('Cotação indisponível',{exact:false}).first().waitFor();await p.getByRole('table').screenshot({path:`${out}/${width}-${state}.png`});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 assert.deepEqual(errors,[]);results.push({width,passed:true,bounds,errors,checks:['4 semantic rows','source-only absolute delta','CNH absolute unavailable','JPY 5 decimals','4 row clicks','Enter and Space','Escape focus restore','back forward','reserve and error','no overflow']});await ctx.close()
 }fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)})
