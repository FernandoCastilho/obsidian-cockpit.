// Coleta os acessos ao app no Umami (link de compartilhamento) e grava public/acessos.json. Rodado a cada hora no deploy.
import { mkdir, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { DIAS, UMAMI_API, acessosFile, parseAtivos, parseDias } from './acessos-lib.mjs'

const SHARE = process.env.UMAMI_SHARE || '9glfHXZ6e2nYNmNj' // público: é o link de compartilhamento só de leitura
const now = Date.now()
const get = async (path, headers = {}) => {
  const res = await fetch(UMAMI_API + path, { headers: { accept: 'application/json', ...headers }, signal: AbortSignal.timeout(20000) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path.split('?')[0]}: HTTP ${res.status} ${text.slice(0, 120)}`)
  try { return JSON.parse(text) } catch { throw new Error(`${path.split('?')[0]}: resposta não é JSON`) }
}
let file
try {
  const share = await get(`/share/${SHARE}`)
  const { websiteId, token } = share
  if (!websiteId || !token) throw new Error('link de compartilhamento sem websiteId/token: ' + JSON.stringify(Object.keys(share)))
  const h = { 'x-umami-share-token': token }
  const ativos = await get(`/websites/${websiteId}/active`, h)
  const startAt = now - DIAS * 864e5
  const pv = await get(`/websites/${websiteId}/pageviews?startAt=${startAt}&endAt=${now}&unit=day&timezone=America/Sao_Paulo`, h)
  console.log('Umami: active =', JSON.stringify(ativos).slice(0, 200), '| pageviews keys =', Object.keys(pv ?? {}))
  const online = parseAtivos(ativos), dias = parseDias(pv)
  if (online == null && !dias.length) throw new Error('respostas sem números reconhecíveis')
  file = acessosFile({ online: online ?? 0, dias, now })
} catch (e) {
  console.warn('Acessos: ' + e.message)
  file = acessosFile({ online: null, dias: [], now, erro: e.message, anterior: await loadPrevious('acessos.json') })
}
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/acessos.json', import.meta.url), JSON.stringify(file) + '\n')
console.log(`acessos.json: online=${file.online} hoje=${file.hoje?.visitantes} semana=${file.semana?.visitantes} dias=${file.dias?.length} stale=${file.stale}`)
