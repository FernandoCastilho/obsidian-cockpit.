// Spread da TFB contra o DI: TFB do prazo da faixa menos a taxa DI x pré (B3) no vértice de mesmo prazo, do mesmo dia da curva.
// Aproximação: o prazo médio de um financiamento amortizável é menor que o prazo final, então a leitura é de ordem de grandeza.
export const DU_PER_MONTH = 21

// Taxa da curva (% a.a.) em `du` dias úteis, interpolando linearmente entre vértices; fora da curva devolve null.
export function diRate(points, du) {
  const v = (points ?? []).filter(([d, r]) => d > 0 && Number.isFinite(r)).sort((a, b) => a[0] - b[0])
  if (!v.length || !(du >= v[0][0]) || du > v.at(-1)[0]) return null
  for (let i = 0; i < v.length; i++) {
    if (v[i][0] === du) return v[i][1]
    if (v[i][0] > du) { const [x0, y0] = v[i - 1], [x1, y1] = v[i]; return y0 + ((y1 - y0) * (du - x0)) / (x1 - x0) }
  }
  return null
}

// tfbPoints: [[AAAA-MM-DD, valor]]; br: curves.br (curves por data, sourceDate); prazo em meses. null quando falta TFB do dia da curva ou curva.
export function tfbSpread(tfbPoints, br, prazo) {
  const date = br?.sourceDate, curve = br?.curves?.[date]
  if (!date || !Array.isArray(curve) || !Array.isArray(tfbPoints)) return null
  let tfb = null
  for (const p of tfbPoints) { if (p[0] <= date) tfb = p; else break }
  const du = prazo * DU_PER_MONTH, di = diRate(curve, du)
  if (!tfb || di == null) return null
  const pp = tfb[1] - di
  return { pp, tfb: tfb[1], tfbDate: tfb[0], di, curveDate: date, du, text: `${pp >= 0 ? '+' : '−'}${Math.abs(pp).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.p.` }
}
