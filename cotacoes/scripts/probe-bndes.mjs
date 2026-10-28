// SONDAGEM TEMPORÁRIA (sai do repositório depois): composição da cesta de moedas (UMBNDES) no BNDES.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: '*/*' }
const ORI = 'https://www.bndes.gov.br'
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
const r = await fetch(ORI + '/wps/portal/site/home/financiamento/guia/custos-financeiros/cesta-de-moedas', { headers: H }); const b = new TextDecoder('utf-8').decode(await r.arrayBuffer())
const t = text(b); const i = t.search(/Cesta de Moedas/i)
console.log('### PÁGINA http', r.status); console.log(t.slice(i, i + 3200))
const links = [...b.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => [m[1].replace(/&amp;/g, '&'), text(m[2]).slice(0, 60)]).filter(([u, x]) => /\.pdf|composi|cesta|\d{2}\.\d{4}/i.test(u + x))
console.log('\n### LINKS (' + links.length + ')'); for (const [u, x] of links.slice(0, 40)) console.log(' -', x, '|', u.slice(0, 150))
const pdfs = links.filter(([u]) => /\.pdf/i.test(u))
for (const [u, x] of pdfs.slice(0, 3)) {
  const url = new URL(u, ORI).href
  const rr = await fetch(url, { headers: H }); const buf = Buffer.from(await rr.arrayBuffer())
  console.log('\n### PDF', x, '|', url.slice(0, 120), '| http', rr.status, 'bytes', buf.length)
  writeFileSync('/tmp/c.pdf', buf)
  try { console.log(execFileSync('pdftotext', ['-layout', '/tmp/c.pdf', '-'], { encoding: 'utf8' }).slice(0, 2500)) } catch (e) { console.log('pdftotext falhou:', e.message.slice(0, 100)) }
}
console.log('### FIM')
