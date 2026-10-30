// Gera public/csv/*.csv a partir de bndes.json e moedas.json já coletados. Nunca falha o deploy (sem arquivo, gera CSV só com o cabeçalho).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { buildCsvs } from './csv-lib.mjs'

const read = async (f) => { try { return JSON.parse(await readFile(new URL(`../public/${f}.json`, import.meta.url), 'utf8')) } catch { return null } }
const files = buildCsvs({ bndes: await read('bndes'), moedas: await read('moedas') })
await mkdir(new URL('../public/csv/', import.meta.url), { recursive: true })
for (const [name, text] of Object.entries(files)) await writeFile(new URL(`../public/csv/${name}`, import.meta.url), text)
console.log(`CSV: ${Object.entries(files).map(([n, t]) => `${n} ${t.split('\r\n').length - 2} linhas`).join(' · ')}`)
