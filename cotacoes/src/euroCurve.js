// Curva do euro (BCE): valida o arquivo coletado para o gráfico de curvas, que já sabe desenhar "um ponto por vencimento".
export function normalizeEuroCurve(data) {
  const c = data?.curve
  if (c?.id !== 'euro-curve' || !Array.isArray(c.compare) || !c.compare.length || !c.curves || typeof c.checkedAt !== 'string') throw new Error('Arquivo da curva do euro inválido')
  for (const d of c.compare) {
    const pts = c.curves[d.date]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Array.isArray(pts) || pts.length < 5 || pts.some((p) => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || typeof p[2] !== 'string')) throw new Error('Curva do euro inválida')
  }
  return { compare: c.compare, curves: c.curves, sourceDate: c.sourceDate ?? c.compare[0].date, checkedAt: c.checkedAt, stale: !!c.stale, error: c.error }
}
