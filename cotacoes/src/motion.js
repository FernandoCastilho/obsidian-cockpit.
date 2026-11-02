// Movimento do app: só ao abrir e ao trocar de tela, nunca em loop, sempre abaixo de 1 s.
// Com "reduzir movimento" ligado no sistema, tudo aparece pronto, sem animação.
export const reduceMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return true }
}

// Atraso da cascata das barras: 60 ms entre uma e outra, com teto para a última terminar antes de 1 s.
export const cascade = (i, step = 60, max = 420) => ({ '--bar-delay': `${Math.min(i * step, max)}ms` })

// Troca de tela: o conteúdo novo entra por esmaecimento curto com leve subida (0,26 s). A animação anterior é cancelada
// para trocas seguidas não se acumularem.
export function fadeIn(el, previous) {
  previous?.cancel()
  if (!el || reduceMotion() || typeof el.animate !== 'function') return null
  // esmaece e sobe 8 px; `translate` (e não `transform`) e sem `fill`: ao terminar, nada fica aplicado no <main>
  return el.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' })
}
