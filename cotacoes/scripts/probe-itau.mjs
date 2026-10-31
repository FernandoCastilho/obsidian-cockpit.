// Sonda temporária: lê as duas páginas do Itaú e descreve a estrutura (HTML pronto ou JavaScript), bloqueios, feeds e links por tópico.
const UA = 'Mozilla/5.0 (compatible; cotacoes-coleta/1.0; +https://github.com/FernandoCastilho/obsidian-cockpit.)'
const PAGES = ['https://www.itau.com.br/investimentos/analises/', 'https://www.itau.com.br/investimentos/noticias/']
const get = async (u, accept = 'text/html') => {
  const r = await fetch(u, { headers: { 'user-agent': UA, accept, 'accept-language': 'pt-BR,pt;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
  return { status: r.status, url: r.url, type: r.headers.get('content-type'), server: r.headers.get('server'), text: await r.text() }
}
const attempt = async (u, accept) => { try { return await get(u, accept) } catch (e) { return { status: 0, text: '', error: e.message } } }
const robots = await attempt('https://www.itau.com.br/robots.txt', 'text/plain')
console.log('ROBOTS', robots.status, robots.error ?? ''); console.log(robots.text.slice(0, 1800))
for (const u of PAGES) {
  const r = await attempt(u)
  console.log('\n=====', u, '->', r.status, r.type, 'server=', r.server, 'bytes=', r.text.length, r.error ?? '')
  const h = r.text
  console.log('title:', (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1]?.replace(/\s+/g, ' ').trim())
  console.log('bloqueio?', /access denied|akamai|captcha|incapsula|cloudflare|request blocked|forbidden/i.test(h.slice(0, 4000)))
  console.log('scripts:', (h.match(/<script/gi) ?? []).length, '| __NEXT_DATA__:', /__NEXT_DATA__/.test(h), '| ng-app/react-root:', /ng-app|id="root"|data-reactroot|__NUXT__/.test(h))
  console.log('rss/atom:', [...h.matchAll(/<link[^>]+(rss|atom)[^>]*>/gi)].map((m) => m[0]).slice(0, 3))
  const links = [...h.matchAll(/<a\b[^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => [m[1], m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()]).filter(([, t]) => t.length > 25)
  console.log('links com texto longo:', links.length); for (const [href, t] of links.slice(0, 25)) console.log(' -', t.slice(0, 110), '|', href.slice(0, 120))
  console.log('datas no HTML:', [...new Set((h.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}T[\d:]+/g) ?? []))].slice(0, 8))
  console.log('endpoints json/api citados:', [...new Set([...h.matchAll(/["'(]([^"'()\s]*(?:\.json|\/api\/|graphql|\/services\/)[^"'()\s]*)["')]/gi)].map((m) => m[1]))].slice(0, 15))
  console.log('scripts externos:', [...h.matchAll(/<script[^>]+src="([^"]+)"/gi)].map((m) => m[1]).slice(0, 8))
  console.log('categorias/tópicos (rótulos curtos em botões/abas):', [...h.matchAll(/<(?:button|li|a)[^>]*(?:tab|filter|categoria|topic)[^>]*>([\s\S]*?)<\/(?:button|li|a)>/gi)].map((m) => m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).filter((t) => t && t.length < 40).slice(0, 15))
}
for (const u of ['https://www.itau.com.br/sitemap.xml', 'https://www.itau.com.br/investimentos/analises/rss', 'https://www.itau.com.br/investimentos/noticias/rss']) { const r = await attempt(u, '*/*'); console.log('\nEXTRA', u, r.status, r.type, r.text.length, r.text.slice(0, 160).replace(/\s+/g, ' ')) }
