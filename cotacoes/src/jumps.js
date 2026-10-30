// Limites de "salto" entre duas observações das séries do BNDES. Uma só definição para a tela (selo "salto") e para o alerta de dados.
// Taxas (% a.a.): variação em pontos percentuais. Níveis (dólar, Selic acumulada): variação em %. TLP-IPCA é um percentual do mês e não tem limite.
export const JUMP_PP = 1
export const JUMP_PCT = { 604: 8, 143: 0.3, default: 3 }

// kind: 'rate' | 'level' | 'pct'; diff em p.p. (rate) ou em % (level); id só para níveis.
export function isJump(kind, diff, id) {
  if (!Number.isFinite(diff)) return false
  if (kind === 'rate') return Math.abs(diff) > JUMP_PP
  if (kind === 'level') return Math.abs(diff) > (JUMP_PCT[id] ?? JUMP_PCT.default)
  return false
}
export const JUMP_HINT = 'Variação acima do normal para esta série; confira a fonte do BNDES.'
