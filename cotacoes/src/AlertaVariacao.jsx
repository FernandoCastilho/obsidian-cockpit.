import { useEffect, useMemo, useState } from 'react'
import { useIntraday, fromInput } from './useHistory.js'
import { marketDate } from './marketReturns.js'
import { LIMITE_PCT, alertasDoDia, textoAlerta } from './alertaVariacao.js'

// Faixa no topo com os alertas de variação do dia (dólar e euro, acima de 0,30% da primeira cotação do dia) e, se a pessoa
// autorizar, notificação do sistema. Cada alerta aparece e notifica uma vez; "Ok" o dispensa no dia.
const KEY = 'alerta-variacao'
const ler = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
const gravar = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* sem armazenamento */ } }
const firstOf = (s) => (s.status === 'ok' && s.data?.points?.length ? { t: s.data.points[0].t, v: s.data.points[0].bid } : null)

async function notificar(a) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const opts = { body: textoAlerta(a), tag: a.id, icon: './favicon.svg' }
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (reg?.showNotification) await reg.showNotification(`Painel Especialista · ${a.nome} ${a.dir === 'alta' ? '▲' : '▼'}`, opts)
    else new Notification(`Painel Especialista · ${a.nome} ${a.dir === 'alta' ? '▲' : '▼'}`, opts)
  } catch { /* navegador sem suporte */ }
}

export default function AlertaVariacao({ quotes }) {
  const testing = typeof navigator !== 'undefined' && navigator.webdriver // testes automáticos não recebem a faixa (o smoke próprio desliga isso)
  const today = fromInput(marketDate(Date.now()))
  const usd = useIntraday('USD', today, testing)
  const eur = useIntraday('EUR', today, testing)
  const [estado, setEstado] = useState(ler)
  const [perm, setPerm] = useState(() => (typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission))
  const alertas = useMemo(() => (testing ? [] : alertasDoDia({ quotes, firsts: { USD: firstOf(usd), EUR: firstOf(eur) } })), [quotes, usd, eur, testing])
  // notifica uma vez cada alerta novo
  useEffect(() => {
    const novos = alertas.filter((a) => !estado[a.id]?.notificado)
    if (!novos.length) return
    novos.forEach(notificar)
    const hoje = marketDate(Date.now())
    const next = Object.fromEntries(Object.entries({ ...estado }).filter(([k]) => k.startsWith(hoje)))
    for (const a of novos) next[a.id] = { ...next[a.id], notificado: true }
    gravar(next); setEstado(next)
  }, [alertas]) // eslint-disable-line react-hooks/exhaustive-deps
  const visiveis = alertas.filter((a) => !estado[a.id]?.dispensado)
  if (!visiveis.length) return null
  const dispensar = (id) => { const next = { ...estado, [id]: { ...estado[id], dispensado: true } }; gravar(next); setEstado(next) }
  const pedir = async () => { try { setPerm(await Notification.requestPermission()) } catch { /* sem suporte */ } }
  return (
    <div className="alerta-variacao" role="status" aria-live="polite">
      {visiveis.map((a) => (
        <div key={a.id} className={`alerta-var-item ${a.dir}`}>
          <span aria-hidden="true">{a.dir === 'alta' ? '▲' : '▼'}</span>
          <p><b>Alerta de variação (acima de {LIMITE_PCT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%):</b> {textoAlerta(a)}</p>
          <button type="button" className="btn" onClick={() => dispensar(a.id)} aria-label={`Dispensar alerta do ${a.nome.toLowerCase()}`}>Ok</button>
        </div>
      ))}
      {perm === 'default' && <button type="button" className="linklike alerta-var-perm" onClick={pedir}>Receber estes alertas também como notificação do sistema</button>}
    </div>
  )
}
