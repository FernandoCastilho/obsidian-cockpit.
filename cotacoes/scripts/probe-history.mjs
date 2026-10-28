// SONDAGEM TEMPORÁRIA: roda a coleta de histórico de verdade (rede + chave) numa pasta vazia e resume o resultado.
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectHistory } from './quotes-lib.mjs'
const dir = await mkdtemp(join(tmpdir(), 'probe-'))
const r = await collectHistory({ dir, key: process.env.AWESOMEAPI_KEY })
console.log('resultado', JSON.stringify(r))
const f = JSON.parse(await readFile(join(dir, 'history.json'), 'utf8'))
console.log('backfill', JSON.stringify(f.backfill))
for (const [c, s] of Object.entries(f.series)) {
  const p = s.points
  console.log(c, 'pontos', p.length, 'de', new Date(p[0].t).toISOString().slice(0, 10), 'a', new Date(p.at(-1).t).toISOString().slice(0, 10), 'primeiro', p[0].bid, 'último', p.at(-1).bid)
}
