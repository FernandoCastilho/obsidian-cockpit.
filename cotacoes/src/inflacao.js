// "Inflação · o que pesa": IPCA por grupos (IBGE) e fatores de fora do índice, lidos com regras simples e expostas na tela.
const finite = (v) => Number.isFinite(v)
export const FOCUS_BAND = { target: 3, floor: 1.5, ceiling: 4.5 } // meta contínua de 3% com tolerância de 1,5 p.p. (CMN)
// Limiares (em %) a partir dos quais uma variação conta como pressão ou alívio.
export const THRESHOLDS = { fx: 1, brent: 3, grains: 2 }

export function normalizeIpcaGroups(file) {
  const s = file?.series
  if (s?.id !== 'ipca-groups' || !Array.isArray(s.groups) || !Array.isArray(s.periods) || !s.groups.length || typeof s.checkedAt !== 'string') throw new Error('Arquivo do IPCA por grupos inválido')
  return s
}

const cmp2 = (a, b) => (!finite(a) || !finite(b) ? null : Math.round(a * 100) > Math.round(b * 100) ? 'up' : Math.round(a * 100) < Math.round(b * 100) ? 'down' : 'same')

// Linhas do último mês: peso, variação, variação do mês anterior, contribuição aproximada (peso × variação ÷ 100) e 12 meses.
export function groupRows(series) {
  const period = series.periods.at(-1), prev = series.periods.at(-2)
  const rows = series.groups.map((g) => {
    const now = g.byPeriod?.[period] ?? {}, before = g.byPeriod?.[prev] ?? {}
    return {
      id: g.id, name: g.name, general: g.id === 7169,
      weight: finite(now.weight) ? now.weight : null, mom: finite(now.mom) ? now.mom : null, prevMom: finite(before.mom) ? before.mom : null,
      y12: finite(now.y12) ? now.y12 : null,
      contribution: finite(now.weight) && finite(now.mom) ? (now.weight * now.mom) / 100 : null,
      trend: cmp2(now.mom, before.mom),
    }
  })
  const parts = rows.filter((r) => !r.general && r.contribution !== null)
  const top = parts.reduce((b, r) => (!b || r.contribution > b.contribution ? r : b), null)
  const bottom = parts.reduce((b, r) => (!b || r.contribution < b.contribution ? r : b), null)
  return { period, prev, rows, top: top && top.contribution > 0 ? top : null, bottom: bottom && bottom.contribution < 0 ? bottom : null }
}

// pressão (sobe além do limiar), alívio (cai além do limiar), neutro; sem número, sem leitura.
export const signalOf = (value, threshold) => (!finite(value) ? null : value >= threshold ? 'pressure' : value <= -threshold ? 'relief' : 'neutral')

const nf = (v, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const sg = (v, d = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${nf(Math.abs(v), d)}%`
const focusValue = (focus, label, year) => focus?.rows?.find((r) => r.label === label)?.values?.[year]?.median

// Fatores de fora do IPCA, a partir do que o app já coleta. Cada item: leitura numérica, sinal (ou null) e o porquê.
export function factorRows({ fx, brent, commodities = [], focus, selic }) {
  const out = []
  const fxMonth = fx?.month?.value, fxYear = fx?.year?.value
  out.push({
    id: 'cambio', label: 'Câmbio (USD/BRL)', signal: signalOf(fxMonth, THRESHOLDS.fx),
    reading: finite(fxMonth) ? `${sg(fxMonth)} no mês${finite(fxYear) ? ` · ${sg(fxYear)} no ano` : ''}` : '—',
    why: 'Dólar mais caro encarece importados, insumos e combustíveis em reais; mais barato alivia.',
  })
  const bm = brent?.month?.value
  out.push({
    id: 'petroleo', label: 'Petróleo (Brent)', signal: signalOf(bm, THRESHOLDS.brent),
    reading: finite(bm) ? `${sg(bm)} no mês${finite(brent?.year?.value) ? ` · ${sg(brent.year.value)} no ano` : ''}` : '—',
    why: 'Pesa em gasolina e diesel (Transportes) e no frete.',
  })
  for (const [id, label] of [['soybeans', 'Soja'], ['corn', 'Milho']]) {
    const c = commodities.find((x) => x.id === id), v = c?.variationPct
    out.push({
      id, label: `${label} (preço internacional)`, signal: signalOf(v, THRESHOLDS.grains),
      reading: finite(v) ? `${sg(v)} contra ${c.variationBasis ?? 'o período anterior'}` : '—',
      why: 'Grãos entram em rações, óleos e carnes (Alimentação e bebidas), com defasagem.',
    })
  }
  const f26 = focusValue(focus, 'IPCA', '2026'), f27 = focusValue(focus, 'IPCA', '2027')
  const { target, floor, ceiling } = FOCUS_BAND
  out.push({
    id: 'expectativas', label: 'Expectativas (Focus)',
    signal: !finite(f26) ? null : f26 > ceiling ? 'pressure' : f26 <= target ? 'relief' : 'neutral',
    reading: finite(f26) ? `IPCA 2026: ${nf(f26, 2)}%${finite(f27) ? ` · 2027: ${nf(f27, 2)}%` : ''} (meta ${nf(target)}%, banda ${nf(floor)}% a ${nf(ceiling)}%)` : '—',
    why: 'Expectativa acima da meta realimenta preços e salários; acima do teto da banda é a leitura mais pressionada.',
  })
  const s26 = focusValue(focus, 'Selic', '2026')
  out.push({
    id: 'juros', label: 'Juros (Selic)', signal: null,
    reading: finite(selic) ? `Selic ${nf(selic, 2)}% a.a.${finite(s26) ? ` · Focus para o fim de 2026: ${nf(s26, 2)}%` : ''}` : '—',
    why: 'Juro alto esfria a demanda e ajuda a levar a inflação à meta, com defasagem. Contexto, sem sinal.',
  })
  return out
}
