// Percentuais legais, nunca parâmetros editáveis. Histórico anterior requer outro regime.
export const IOF_SOURCE = 'https://www2.camara.leg.br/legin/fed/decret/2007/decreto-6306-14-dezembro-2007-566561-normaatualizada-pe.html'
export function resolveCreditIof({ date, profile = 'pj', operationValue, eligible = false }) {
  const parsed = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00Z') : null
  if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < '2025-07-17') return { ok: false, error: 'Informe data a partir de 17/07/2025. O histórico tributário anterior não é simulado.' }
  if (!Number.isFinite(operationValue) || operationValue < 0) return { ok: false, error: 'Informe o valor total da operação para determinar o IOF.' }
  if (!['pj', 'simples'].includes(profile)) return { ok: false, error: 'Selecione o enquadramento tributário.' }
  if (profile === 'simples' && !eligible) return { ok: false, error: 'Confirme a opção pelo Simples Nacional/MEI para determinar o enquadramento.' }
  return { ok: true, daily: profile === 'simples' && Math.round(operationValue * 100) <= 3000000 ? 0.00274 : 0.0082, additional: 0.38, maxDays: 365, source: IOF_SOURCE }
}
