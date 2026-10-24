// Navegação apenas: não altera pontos nem cálculos financeiros.
export function nextChartIndex(key, current, count) {
  if (!count) return null
  const at = Math.min(count - 1, Math.max(0, current ?? 0))
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(count - 1, at + 1)
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(0, at - 1)
  return null
}
