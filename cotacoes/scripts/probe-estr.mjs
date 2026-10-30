import { ESTR_API, parseEstr } from './estr-lib.mjs'
const r = await fetch(ESTR_API, { headers: { accept: 'text/csv', 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(30000) })
const txt = await r.text()
console.log('HTTP', r.status, r.headers.get('content-type'), 'bytes', txt.length)
console.log('CABEÇALHO:', txt.split(/\r?\n/)[0])
console.log('LINHA 1:', txt.split(/\r?\n/)[1])
console.log('ÚLTIMA:', txt.trim().split(/\r?\n/).at(-1))
try { const p = parseEstr(txt); console.log('PARSE OK', p.length, 'dias; primeiro', JSON.stringify(p[0]), 'último', JSON.stringify(p.at(-1)), 'mín', Math.min(...p.map((x) => x.value)), 'máx', Math.max(...p.map((x) => x.value))) } catch (e) { console.log('PARSE FALHOU:', e.message) }
