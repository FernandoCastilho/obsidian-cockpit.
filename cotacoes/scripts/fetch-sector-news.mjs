#!/usr/bin/env node
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeSectorNewsFile } from './sector-news-lib.mjs'
import { normalizeSectorNews } from '../src/sectorNews.js'

// External collection is disabled locally and in CI until durable access state is approved.
// --offline only revalidates a valid existing snapshot within the saved 120h window.
// It does not make an old attempted/generated date count as collection success.
export async function main(args = process.argv.slice(2)) {
  const offline = args.includes('--offline')
  if (args.includes('--live')) throw new Error('Coleta externa desativada em todos os ambientes: faltam guardas e persistência homologadas de suspensão e último sucesso. Use somente --offline com snapshot válido existente. Nenhuma requisição foi iniciada.')
  if (!offline) throw new Error('Use --offline para revalidar um snapshot existente sem acesso à rede. Coleta externa desativada.')
  const value = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1] }
  const output = resolve(value('--output') || fileURLToPath(new URL('../public/sector-news.json', import.meta.url)))
  const input = resolve(value('--input') || output)
  if (args.includes('--sources')) throw new Error('--sources não se aplica à revalidação offline. Coleta externa desativada.')
  // Missing, malformed or unsupported state must never become an empty replacement.
  const previous = JSON.parse(await readFile(input, 'utf8'))
  const now = Date.now()
  normalizeSectorNews(previous, now)
  const result = makeSectorNewsFile({ previous, now })
  await mkdir(dirname(output), { recursive: true })
  const temp = `${output}.${process.pid}.tmp`
  await writeFile(temp, JSON.stringify(result, null, 2) + '\n')
  await rename(temp, output)
  const summary = { output, mode: 'offline-revalidation', generatedAt: result.generatedAt, topics: Object.keys(result.topics).length, uniqueItems: new Set(Object.values(result.topics).flatMap(t => t.items.map(i => i.link))).size, states: Object.fromEntries(Object.entries(result.sourceStates).map(([id, s]) => [id, s.status])) }
  console.log(JSON.stringify(summary, null, 2))
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1 })
