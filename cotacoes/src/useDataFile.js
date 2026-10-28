import { useEffect, useState } from 'react'
import { DATA_POLL_MS, startVisiblePolling } from './visiblePolling.js'
import { onRefresh } from './refreshBus.js'

// Um snapshot por arquivo: telas diferentes compartilham leitura, data e falhas.
const resources = new Map()
const TTL = 10 * 60000
function resource(file) {
  if (!resources.has(file)) {
    resources.set(file, { state: { status: 'loading' }, at: 0, pending: null, listeners: new Set() })
    // botão "atualizar" do painel: relê este arquivo na hora, ignorando o intervalo e o cache
    onRefresh((files) => files.includes(file) ? loadDataFile(file, Date.now(), true).then((s) => { if (s.status === 'error' || s.stale) throw new Error(s.error || 'falha') }) : undefined)
  }
  return resources.get(file)
}
export function loadDataFile(file, now = Date.now(), force = false) {
  const r = resource(file)
  if (r.pending) return r.pending
  if (!force && r.at && now - r.at < TTL) return Promise.resolve(r.state)
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 20000)
  r.pending = (async () => {
    try {
      const response = await fetch(`./${file}?t=${force ? now : Math.floor(now / TTL)}`, { signal: ctrl.signal, ...(force ? { cache: 'no-store' } : {}) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Arquivo de dados inválido')
      if (r.state.data?.generatedAt && data.generatedAt < r.state.data.generatedAt) throw new Error('Resposta anterior à última coleta disponível')
      r.state = { status: 'ok', data }
      r.at = Date.now()
    } catch (error) {
      const message = error.name === 'AbortError' ? 'A fonte demorou a responder. Tentando novamente.' : error.message
      r.state = r.state.data ? { ...r.state, stale: true, error: message } : { status: 'error', error: message }
    } finally {
      clearTimeout(timeout)
      r.pending = null
      for (const listener of r.listeners) listener(r.state)
    }
    return r.state
  })()
  return r.pending
}
export function useDataFile(file) {
  const r = resource(file)
  const [state, setState] = useState(r.state)
  useEffect(() => {
    r.listeners.add(setState)
    setState(r.state)
    const stop = startVisiblePolling(() => loadDataFile(file), DATA_POLL_MS)
    return () => { stop(); r.listeners.delete(setState) }
  }, [file, r])
  return state
}

// Hora da coleta mais recente entre os arquivos (ms), ou null.
export const collectedAt = (files) => Math.max(0, ...files.map((f) => resources.get(f)?.state?.data?.generatedAt ?? 0)) || null
