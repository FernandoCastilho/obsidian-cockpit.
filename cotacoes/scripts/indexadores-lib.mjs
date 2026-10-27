// Indexadores do crédito (TR, TBF e TLP) a partir do SGS do Banco Central. Sem dependências.
import { brDate } from './macro-lib.mjs'

// TR e TBF: séries diárias em % a.m., cada ponto vale para o período que começa em `data` e termina em `dataFim`.
// TLP: série mensal em % a.a., um ponto por mês de vigência.
export const INDEXADORES = {
  TR: { code: 226, name: 'Taxa Referencial', unit: 'a.m.', keep: 30 },
  TBF: { code: 253, name: 'Taxa Básica Financeira', unit: 'a.m.', keep: 30 },
  TLP: { code: 27572, name: 'Taxa de Longo Prazo', unit: 'a.a.', keep: 18 },
}

export const sgsLast = (code, n) => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/${n}?formato=json`

// [{data, dataFim?, valor}] -> { latest, history } com pontos { start, end, value } (ms UTC ao meio-dia); null se nada válido.
export function parseIndexador(rows, keep = 30, now = Date.now()) {
  const points = (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const start = typeof r?.data === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(r.data) ? brDate(r.data) : NaN
      const end = typeof r?.dataFim === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(r.dataFim) ? brDate(r.dataFim) : null
      return { start, end, value: Number(r?.valor) }
    })
    .filter((p) => Number.isFinite(p.start) && Number.isFinite(p.value) && p.start <= now + 864e5)
    .sort((a, b) => a.start - b.start)
  if (!points.length) return null
  const history = points.slice(-keep)
  return { latest: history[history.length - 1], history }
}

// results = { TR: rows|null, ... } -> arquivo public/indexadores.json
export function buildIndexadores(results, errors = [], now = Date.now()) {
  const series = {}
  for (const [key, def] of Object.entries(INDEXADORES)) {
    const parsed = parseIndexador(results?.[key], def.keep, now)
    if (parsed) series[key] = { code: def.code, name: def.name, unit: def.unit, ...parsed }
  }
  return { schemaVersion: 1, generatedAt: now, series, errors }
}

// Série que falhou nesta coleta volta com o último dado publicado; `stale` guarda o instante da coleta original.
export function fillSeriesFromPrevious(out, prev) {
  const stale = {}
  for (const key of Object.keys(INDEXADORES)) {
    if (!out.series[key] && prev?.series?.[key]) {
      out.series[key] = prev.series[key]
      stale[key] = prev.stale?.[key] ?? prev.generatedAt ?? null
    }
  }
  out.stale = stale
  return out
}
