import { useEffect, useState } from 'react'
import { useDataFile } from './useDataFile.js'
import { SITE_HOST } from './acessos.js'
import { Panel } from './TerminalDesk.jsx'

// Acessos ao app (Umami): selo "online" no topo e quadro em Configurações. Os números vêm de acessos.json, gerado de hora em
// hora pela coleta (link de compartilhamento do Umami); "online" é quem estava com o app aberto na última leitura.
export const UMAMI_SHARE_URL = 'https://cloud.umami.is/share/9glfHXZ6e2nYNmNj'
const hm = (t) => new Date(t).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
const n = (v) => (Number.isFinite(v) ? v.toLocaleString('pt-BR') : '—')
const valido = (d) => d && Number.isFinite(d.generatedAt) && Date.now() - d.generatedAt < 6 * 3600e3

// "Online" ao vivo: o navegador lê o Umami a cada 1 min (link de compartilhamento). Se a rede bloquear ou o Umami recusar,
// fica com a leitura de hora em hora do acessos.json. Só no site publicado e com a aba visível.
const API = 'https://cloud.umami.is/api', SHARE = '9glfHXZ6e2nYNmNj'
let share = null
async function lerAoVivo() {
  share = share ?? await fetch(`${API}/share/${SHARE}`, { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
  const r = await fetch(`${API}/websites/${share.websiteId}/active`, { headers: { 'x-umami-share-token': share.token }, signal: AbortSignal.timeout(8000) })
  if (!r.ok) { share = null; throw new Error(r.status) }
  const j = await r.json()
  const v = Array.isArray(j) ? j[0]?.x ?? j[0]?.visitors : j?.visitors ?? j?.x ?? j?.active
  if (!Number.isFinite(Number(v))) throw new Error('sem número')
  return Number(v)
}
let vivo = { online: null, at: 0 }
const ouvintes = new Set()
let timer = null
function iniciarVivo() {
  if (timer || typeof window === 'undefined' || window.location.hostname !== SITE_HOST || navigator.webdriver) return
  const tick = async () => {
    if (document.visibilityState !== 'visible') return
    try { vivo = { online: await lerAoVivo(), at: Date.now() } } catch { vivo = { online: null, at: 0 } }
    ouvintes.forEach((f) => f(vivo))
  }
  tick(); timer = setInterval(tick, 60000)
}
export function useOnline() {
  const { data } = useDataFile('acessos.json')
  const [v, setV] = useState(vivo)
  useEffect(() => { ouvintes.add(setV); iniciarVivo(); return () => ouvintes.delete(setV) }, [])
  if (Number.isFinite(v.online) && Date.now() - v.at < 3 * 60000) return { online: v.online, at: v.at, aoVivo: true, data }
  if (valido(data) && Number.isFinite(data.online)) return { online: data.online, at: data.generatedAt, aoVivo: false, data }
  return { online: null, data }
}

export function OnlineBadge({ onOpen }) {
  const { online, at, aoVivo, data } = useOnline()
  if (!Number.isFinite(online)) return null
  return (
    <button type="button" className="online-badge" onClick={onOpen} title={`${aoVivo ? 'Ao vivo' : 'Última leitura'}: pessoas com o app aberto (${hm(at)}).${data?.hoje ? ` Hoje: ${n(data.hoje.visitantes)} visitantes.` : ''} Clique para ver os acessos.`} aria-label={`${online} online agora; ver acessos ao app`}>
      <span className="online-dot" aria-hidden="true" />{n(online)} online
    </button>
  )
}

export function AcessosPanel() {
  const file = useDataFile('acessos.json')
  const d = file.data
  const agora = useOnline()
  const dias = (d?.dias ?? []).slice(-30)
  const max = Math.max(1, ...dias.map((x) => x.visitantes ?? 0))
  return (
    <Panel title="Acessos ao app" note="contagem anônima (Umami); online ao vivo quando a rede permite, senão de hora em hora" className="config-wide acessos" refresh={['acessos.json']}>
      <div id="acessos" />
      {!d && <p className="status">{file.status === 'loading' ? 'Carregando os acessos…' : 'Acessos indisponíveis no momento.'}</p>}
      {d && (
        <>
          <div className="acessos-kpis">
            <div><small>Online agora</small><b><span className="online-dot" aria-hidden="true" />{n(agora.online ?? d.online)}</b><small>{agora.aoVivo ? `ao vivo · ${hm(agora.at)}` : `na leitura das ${hm(d.generatedAt)}`}</small></div>
            <div><small>Hoje</small><b>{n(d.hoje?.visitantes)}</b><small>visitantes · {n(d.hoje?.views)} visualizações</small></div>
            <div><small>Últimos 7 dias</small><b>{n(d.semana?.visitantes)}</b><small>visitantes · {n(d.semana?.views)} visualizações</small></div>
          </div>
          {dias.length > 0 && (
            <div className="acessos-dias" role="img" aria-label={`Visitantes por dia nos últimos ${dias.length} dias`}>
              {dias.map((x) => (
                <span key={x.d} className="acessos-dia" title={`${x.d.split('-').reverse().join('/')}: ${n(x.visitantes)} visitantes, ${n(x.views)} visualizações`}>
                  <i style={{ height: `${Math.max(3, ((x.visitantes ?? 0) / max) * 100)}%` }} />
                  <small>{x.d.slice(8)}</small>
                </span>
              ))}
            </div>
          )}
          {d.stale && <p className="status stale">Última leitura falhou; mostrando os números anteriores.</p>}
          <p className="muted acessos-nota">Contagem anônima, sem cookies e sem dado pessoal. Acessos de redes que bloqueiam o contador não entram. <a href={UMAMI_SHARE_URL} target="_blank" rel="noreferrer">Ver detalhes no Umami ↗</a></p>
        </>
      )}
    </Panel>
  )
}
