// Vigia do Focus: lê o macro.json publicado e diz se é preciso disparar a atualização (saída "run=true|false" para o GitHub Actions).
import { appendFile } from 'node:fs/promises'
import { focusWatchDecision } from './focus-collector.mjs'

const [owner, name] = (process.env.GITHUB_REPOSITORY ?? '').split('/')
let published = null
try {
  const res = await fetch(`https://${owner.toLowerCase()}.github.io/${name}/macro.json?t=${Date.now()}`, { signal: AbortSignal.timeout(20000) })
  if (res.ok) published = (await res.json())?.focus?.date ?? null
} catch (e) { console.warn('macro.json publicado indisponível:', e.message) }
const d = focusWatchDecision(published)
console.log(`Focus: ${d.reason}`)
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `run=${d.run}\n`)
