// Mesma cadência de verificação das cotações; cada histórico mantém seu próprio TTL de rede.
export const DATA_POLL_MS = 60000

// Mantém a cadência existente, pausa em segundo plano e retoma ao voltar à aba/janela.
// Foco e visibilitychange podem chegar juntos: não duplicar nem sobrepor a mesma carga.
export function startVisiblePolling(load, intervalMs) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    load()
    return () => {}
  }
  let timer = null
  let stopped = false
  let pending = false
  let lastStarted = -Infinity
  const run = () => {
    if (stopped || document.hidden || pending || Date.now() - lastStarted < intervalMs) return
    pending = true
    lastStarted = Date.now()
    Promise.resolve().then(() => !stopped && load()).then(
      () => { pending = false },
      () => { pending = false },
    )
  }
  const resume = () => {
    if (document.hidden) {
      clearInterval(timer)
      timer = null
      return
    }
    run()
    if (timer === null) timer = setInterval(run, intervalMs)
  }
  resume()
  document.addEventListener('visibilitychange', resume)
  window.addEventListener('focus', resume)
  return () => {
    stopped = true
    clearInterval(timer)
    document.removeEventListener('visibilitychange', resume)
    window.removeEventListener('focus', resume)
  }
}
