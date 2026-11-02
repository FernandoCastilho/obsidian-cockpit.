// Movimento do app: só ao abrir e ao trocar de tela, nunca em loop, sempre abaixo de 1 s.
// Com "reduzir movimento" ligado no sistema, tudo aparece pronto, sem animação.
export const reduceMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return true }
}

// Atraso da cascata das barras: 60 ms entre uma e outra, com teto para a última terminar antes de 1 s.
export const cascade = (i, step = 60, max = 420) => ({ '--bar-delay': `${Math.min(i * step, max)}ms` })

// Troca de tela: o conteúdo novo entra por esmaecimento curto (0,22 s). A animação anterior é cancelada
// para trocas seguidas não se acumularem. Só opacidade: não cria camada de posição nem desloca o layout.
export function fadeIn(el, previous) {
  previous?.cancel()
  if (!el || reduceMotion() || typeof el.animate !== 'function') return null
  return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' })
}
