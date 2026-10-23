// Uma cotação é um ponto real; somente duas ou mais permitem calcular variação.
export function comparisonSeries(rows) {
  return {
    available: rows.filter((r) => r.points.length > 0),
    comparable: rows.filter((r) => r.points.length > 1),
    incomplete: rows.filter((r) => r.points.length < 2),
  }
}
