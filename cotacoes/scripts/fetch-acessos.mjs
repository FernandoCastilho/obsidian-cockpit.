// Coleta os acessos ao app no Umami (link de compartilhamento) e grava public/acessos.json. Rodado a cada hora no deploy.
import { mkdir, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { DIAS, UMAMI_API, acessosFile, parseAtivos, parseDias } from './acessos-lib.mjs'

const SHARE = process.env.UMAMI_SHARE || '9glfHXZ6e2nYNmNj' // público: é o link de compartilhamento só de leitura
const now = Date.now()
// No Umami Cloud a API do app fica sob um prefixo (ex.: /analytics/us/api) que não é documentado: testa os candidatos e o que
// aparecer na própria página de compartilhamento, e grava o que funcionou (o navegador usa o mesmo para o "online" ao vivo).
const getAt = async (base, path, headers = {}) => {
  const res = await fetch(base + path, { headers: { accept: 'application/json', ...headers }, signal: AbortSignal.timeout(20000) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${base}${path.split('?')[0]}: HTTP ${res.status}`)
  try { return JSON.parse(text) } catch { throw new Error(`${base}${path.split('?')[0]}: resposta não é JSON`) }
}
async function descobrir() {
  const bases = [UMAMI_API, 'https://cloud.umami.is/analytics/us/api', 'https://cloud.umami.is/analytics/eu/api', 'https://cloud.umami.is/analytics/api', 'https://api.umami.is', 'https://api.umami.is/api']
  try {
    const html = await (await fetch(`https://cloud.umami.is/share/${SHARE}`, { signal: AbortSignal.timeout(20000) })).text()
    for (const m of html.matchAll(/apiUrl\\?"\s*:\s*\\?"([^"\\]+)/g)) { const u = m[1].startsWith('http') ? m[1] : 'https://cloud.umami.is' + m[1]; bases.unshift(u.replace(/\/$/, '')) }
    for (const m of html.matchAll(/basePath\\?"\s*:\s*\\?"([^"\\]*)/g)) if (m[1]) bases.unshift('https://cloud.umami.is' + m[1] + '/api')
  } catch (e) { console.warn('página de compartilhamento: ' + e.message) }
  const erros = []
  for (const base of [...new Set(bases)]) {
    try { const share = await getAt(base, `/share/${SHARE}`); if (share?.websiteId && share?.token) { console.log('Umami: API em', base); return { base, share } } erros.push(base + ': sem token') } catch (e) { erros.push(e.message) }
  }
  throw new Error('API do Umami não encontrada: ' + erros.join(' | '))
}
let file
try {
  const { base, share } = await descobrir()
  const { websiteId, token } = share
  const h = { 'x-umami-share-token': token, 'x-umami-share-context': '1' }
  const ativos = await getAt(base, `/websites/${websiteId}/active`, h)
  const startAt = now - DIAS * 864e5
  const pv = await getAt(base, `/websites/${websiteId}/pageviews?startAt=${startAt}&endAt=${now}&unit=day&timezone=America/Sao_Paulo`, h)
  console.log('Umami: active =', JSON.stringify(ativos).slice(0, 200), '| pageviews keys =', Object.keys(pv ?? {}))
  const online = parseAtivos(ativos), dias = parseDias(pv)
  if (online == null && !dias.length) throw new Error('respostas sem números reconhecíveis')
  file = { ...acessosFile({ online: online ?? 0, dias, now }), api: base }
} catch (e) {
  console.warn('Acessos: ' + e.message)
  file = acessosFile({ online: null, dias: [], now, erro: e.message, anterior: await loadPrevious('acessos.json') })
}
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/acessos.json', import.meta.url), JSON.stringify(file) + '\n')
console.log(`acessos.json: online=${file.online} hoje=${file.hoje?.visitantes} semana=${file.semana?.visitantes} dias=${file.dias?.length} stale=${file.stale}`)
