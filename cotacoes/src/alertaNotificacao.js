import { textoAlerta } from './alertaVariacao.js'

export function permissaoNotificacao() {
  if (typeof Notification === 'undefined') return 'indisponivel'
  return ['default', 'denied', 'granted'].includes(Notification.permission) ? Notification.permission : 'indisponivel'
}

// `true` significa que o navegador aceitou o envio, não que o sistema o exibiu ou que a pessoa leu.
// Sem permissão ou em caso de falha, o chamador deve manter o alerta pendente.
export async function notificarAlerta(a) {
  if (permissaoNotificacao() !== 'granted') return false
  try {
    const title = `Painel Especialista · ${a.nome} ${a.dir === 'alta' ? '▲' : '▼'}`
    const options = { body: textoAlerta(a), tag: a.id, icon: './favicon.svg' }
    const reg = typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (permissaoNotificacao() !== 'granted') return false
    if (reg?.showNotification) await reg.showNotification(title, options)
    else new Notification(title, options)
    return true
  } catch { return false }
}
