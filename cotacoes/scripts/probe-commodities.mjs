import { spawnSync } from 'node:child_process'
const get = async (u, t = 'text') => { const r = await fetch(u, { signal: AbortSignal.timeout(40000), headers: { 'user-agent': 'Mozilla/5.0' } }); console.log(r.status, u); if (!r.ok) return null; return t === 'buf' ? Buffer.from(await r.arrayBuffer()) : r.text() }
const tryit = async (name, fn) => { try { await fn() } catch (e) { console.log('ERRO', name, e.message) } }
for (const u of ['https://www.eia.gov/dnav/ng/hist/rngwhhdd.htm', 'https://www.eia.gov/dnav/pet/hist/EER_EPD2DXL0_PF4_Y35NY_DPGD.htm']) await tryit(u, async () => {
  const h = await get(u); if (!h) return
  const t = h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  console.log(t.match(/[^.]{0,100}\(Dollars per [^)]*\)/i)?.[0], '|', t.match(/Release Date:[^A-Z]*[\d/]+/i)?.[0])
  const rows = [...h.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1].replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim()))
  console.log('rows', rows.length); for (const r of rows.filter(r => r.length > 4).slice(0, 3)) console.log(JSON.stringify(r)); for (const r of rows.filter(r => r.length > 4).slice(-3)) console.log(JSON.stringify(r))
})
await tryit('anp', async () => {
  const buf = await get('https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/resumo_semanal_lpc_2026_10_18-2026_10_24.xlsx', 'buf'); if (!buf) return
  const py = `
import sys,io,zipfile,re,xml.etree.ElementTree as ET
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); print(z.namelist())
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
print(re.findall(r'<sheet [^>]*>',z.read('xl/workbook.xml').decode()))
ss=[''.join(t.text or '' for t in si.findall('.//m:t',ns)) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns)]
for n in sorted(x for x in z.namelist() if x.startswith('xl/worksheets/sheet')):
  print('==',n)
  r=ET.fromstring(z.read(n))
  for i,row in enumerate(r.findall('m:sheetData/m:row',ns)):
    if i>14: break
    out=[]
    for c in row.findall('m:c',ns):
      v=c.find('m:v',ns)
      if v is not None: out.append(c.get('r')+'='+(ss[int(v.text)] if c.get('t')=='s' else v.text))
    print(out)
`
  const o = spawnSync('python3', ['-c', py], { input: buf, encoding: 'utf8', maxBuffer: 50e6 }); console.log(o.stdout.slice(0, 6000), o.stderr.slice(0, 500))
})
