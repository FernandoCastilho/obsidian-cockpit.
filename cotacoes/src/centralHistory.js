// Each browser-history entry owns its search context. Keep other features' state.
export function readCentralHistory(state, view) {
  const context = state?.centralSetorial
  if (!context || context.view !== view || typeof context.query !== 'string') return null
  return {
    view,
    query: context.query,
    scroll: Number.isFinite(context.scroll) && context.scroll >= 0 ? context.scroll : null,
    focusId: typeof context.focusId === 'string' ? context.focusId : '',
  }
}

export function withCentralHistory(state, context) {
  return { ...(state && typeof state === 'object' ? state : {}), centralSetorial: context }
}
