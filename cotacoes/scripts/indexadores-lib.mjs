// Indexadores do crédito: TR, TBF e TLP (SGS do Banco Central) e TFB, Taxa Fixa do BNDES (serviço público que alimenta os
// gráficos da página de custos financeiros do BNDES). Sem dependências.
import { brDate, toBr } from './macro-lib.mjs'

// TR e TBF: séries diárias em % a.m., cada ponto vale para o período que começa em `data` e termina em `dataFim`.
// TLP: série mensal em % a.a., um ponto por mês de vigência.
// TFB: série diária em % a.a., por prazo do financiamento (36, 60, 84 e 120 meses) e liberação em até 30 dias.
export const INDEXADORES = {
  TR: { source: 'SGS', code: 226, name: 'Taxa Referencial', unit: 'a.m.', keep: 30, days: 45 },
  TBF: { source: 'SGS', code: 253, name: 'Taxa Básica Financeira', unit: 'a.m.', keep: 30, days: 45 },
  TLP: { source: 'SGS', code: 27572, name: 'Taxa de Longo Prazo', unit: 'a.a.', keep: 18, days: 600 },
  TFB36: { source: 'BNDES', code: 'TFB_36_30', name: 'Taxa Fixa do BNDES · até 36 meses', unit: 'a.a.', keep: 30, days: 45 },
  TFB60: { source: 'BNDES', code: 'TFB_60_30', name: 'Taxa Fixa do BNDES · 36 a 60 meses', unit: 'a.a.', keep: 30, days: 45 },
  TFB84: { source: 'BNDES', code: 'TFB_84_30', name: 'Taxa Fixa do BNDES · 60 a 84 meses', unit: 'a.a.', keep: 30, days: 45 },
  TFB120: { source: 'BNDES', code: 'TFB_120_30', name: 'Taxa Fixa do BNDES · 84 a 120 meses', unit: 'a.a.', keep: 30, days: 45 },
}

// Séries diárias do SGS exigem janela de datas (o atalho /ultimos/N devolve HTTP 400 para elas).
export const sgsWindow = (code, days, now = Date.now()) => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${toBr(now - days * 864e5)}&dataFinal=${toBr(now)}`

// Serviço do BNDES: /taxas/<código>/<AAAAMMDD inicial>/<AAAAMMDD final>, lista de { data: 'AAAA-MM-DD', valor }.
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10).replaceAll('-', '')
export const bndesWindow = (code, days, now = Date.now()) => `https://www.bndes.gov.br/apoioFinanceiro/rest/taxas/${code}/${ymd(now - days * 864e5)}/${ymd(now)}`
export const urlOf = (def, now = Date.now()) => (def.source === 'BNDES' ? bndesWindow(def.code, def.days, now) : sgsWindow(def.code, def.days, now))

// [{data, dataFim?, valor}] -> { latest, history } com pontos { start, end, value } (ms UTC ao meio-dia); null se nada válido.
export function parseIndexador(rows, keep = 30, now = Date.now()) {
  const points = (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const iso = typeof r?.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.data) ? Date.parse(`${r.data}T12:00:00Z`) : NaN
      const start = typeof r?.data === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(r.data) ? brDate(r.data) : iso
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
    if (parsed) series[key] = { source: def.source, code: def.code, name: def.name, unit: def.unit, ...parsed }
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
