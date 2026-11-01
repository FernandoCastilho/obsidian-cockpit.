// Diagnóstico (não publica nada): a página antiga de taxas referenciais da B3 (www2.bmf.com.br) traz curvas de datas passadas?
import { createHash } from 'node:crypto'
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10)
const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', accept: 'text/html,*/*' }
for (const taxa of ['PRE', 'DOL']) {
  for (const iso of ['2026-10-30', '2026-10-29', '2026-10-23', '2026-09-30', '2025-10-30']) {
    const [y, m, d] = iso.split('-')
    for (const base of ['https://www2.bmf.com.br/pages/portal/bmfbovespa/lumis/lum-taxas-referenciais-bmf-ptBR.asp', 'https://www2.bmf.com.br/pages/portal/bmfbovespa/boletim1/TxRef1.asp']) {
      const url = `${base}?Data=${d}/${m}/${y}&Data1=${y}${m}${d}&slcTaxa=${taxa}`
      try {
        const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(30000) })
        const buf = Buffer.from(await r.arrayBuffer()), t = new TextDecoder('latin1').decode(buf)
        const tds = [...t.matchAll(/<td[^>]*>\s*([^<]*?)\s*<\/td>/gi)].map((x) => x[1]).filter(Boolean)
        const nums = tds.filter((x) => /^-?\d+(?:\.\d{3})*(?:,\d+)?$/.test(x))
        console.log(`${taxa} ${iso} ${base.split('/').pop()} → HTTP ${r.status} · ${buf.length} bytes · hash ${hash(t)} · ${nums.length} números · início ${JSON.stringify(nums.slice(0, 9))} · título ${(t.match(/Atualizado em:?[^<]*/i) || t.match(/\d{2}\/\d{2}\/\d{4}/) || [''])[0]}`)
      } catch (e) { console.log(`${taxa} ${iso} ${base.split('/').pop()} → erro ${e.message}`) }
    }
  }
}
