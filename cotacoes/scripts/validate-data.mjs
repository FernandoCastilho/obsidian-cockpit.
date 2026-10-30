// Valida os dados publicados (branch `data` + PTAX recém-coletada). Nunca falha o deploy: grava o relatório para o alerta.
import { readFile, writeFile } from 'node:fs/promises'
import { validateAll } from './validate-lib.mjs'
const base = process.env.VALIDATE_BASE || `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/data`
const get = async (name) => {
  try {
    const res = await fetch(`${base}/${name}`, { signal: AbortSignal.timeout(30000) })
    return res.ok ? await res.json() : null
  } catch { return null }
}
const local = async (f) => { try { return JSON.parse(await readFile(new URL(`../public/${f}.json`, import.meta.url), 'utf8')) } catch { return null } }
const macro = await local('macro') // PTAX recém-coletada
const bndes = await local('bndes'), moedas = await local('moedas')
const items = validateAll({ quotes: await get('quotes.json'), history: await get('history.json'), intraday: await get('intraday.json'), macro, bndes, moedas })
await writeFile(`${process.env.RUNNER_TEMP ?? '/tmp'}/validation.json`, JSON.stringify({ items }))
console.log(items.length ? `Validação: ${items.length} problema(s)\n${items.map((i) => `- [${i.area}] ${i.message}`).join('\n')}` : 'Validação: dados consistentes')
