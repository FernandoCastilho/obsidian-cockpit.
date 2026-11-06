// CSS follows the same query from the first paint; listeners keep embeds and browser chrome in sync.
export const THEME_QUERY = '(prefers-color-scheme: light)'
export const THEME_COLORS = { dark: '#050505', light: '#f5f4f0' }

export function readSystemTheme(target = globalThis) {
  return target.matchMedia?.(THEME_QUERY).matches ? 'light' : 'dark'
}

export function subscribeSystemTheme(onChange, target = globalThis) {
  const media = target.matchMedia?.(THEME_QUERY)
  if (!media) return () => {}
  const changed = () => onChange()
  if (media.addEventListener) {
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }
  media.addListener?.(changed)
  return () => media.removeListener?.(changed)
}

export function connectSystemTheme(target = globalThis, doc = globalThis.document) {
  const apply = () => {
    const theme = readSystemTheme(target)
    doc.documentElement.dataset.theme = theme
    doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  }
  apply()
  return subscribeSystemTheme(apply, target)
}
