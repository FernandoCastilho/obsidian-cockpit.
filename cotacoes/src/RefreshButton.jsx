import { useEffect, useRef, useState } from 'react'
import { collectedAt } from './useDataFile.js'
import { requestRefresh } from './refreshBus.js'
import './RefreshButton.css'

const hm = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

// Botão "atualizar" de um painel. Dois modos:
//  - files: relê os arquivos de dados do painel (a coleta é horária: traz o que houver de novo publicado);
//  - custom: { run, busy, disabled, title } para o câmbio, que consulta a API direto (com limite por navegador).
export default function RefreshButton({ files = [], label, custom }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const say = (m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 9000) }
  const run = async () => {
    if (custom) {
      setBusy(true)
      try { const ok = await custom.run(); say(ok === false ? 'Não foi possível atualizar agora' : `Atualizado às ${hm(Date.now())}`) } finally { setBusy(false) }
      return
    }
    setBusy(true)
    try {
      const { failed } = await requestRefresh(files)
      const at = collectedAt(files)
      say(failed ? 'Não foi possível atualizar agora' : at ? `Consultado às ${hm(Date.now())} · coleta das ${hm(at)}` : `Consultado às ${hm(Date.now())}`)
    } finally { setBusy(false) }
  }
  const working = busy || custom?.busy
  const title = custom?.title ?? 'Atualizar este painel. A fonte é coletada de hora em hora; o botão traz o último dado publicado.'
  return (
    <span className="refresh-wrap">
      {msg && <small className="refresh-msg" aria-hidden="true">{msg.replace(/^Consultado às /, '').replace(' · coleta das ', ' · coleta ')}</small>}
      <button type="button" className="refresh-btn" onClick={run} disabled={working || custom?.disabled} aria-label={`Atualizar ${label}`} title={title}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={working ? 'spin' : ''} aria-hidden="true">
          <path d="M20 11a8 8 0 00-14.5-4.6M4 4v4h4" />
          <path d="M4 13a8 8 0 0014.5 4.6M20 20v-4h-4" />
        </svg>
      </button>
      <span className="sr-only" role="status">{msg}</span>
    </span>
  )
}
