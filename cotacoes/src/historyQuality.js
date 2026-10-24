import { centralMaxAge } from './useQuotes.js'

// Ausência não é zero. Aceita apenas pontos reais e ordena sem inventar observações.
export function validHistoryPoints(points) {
  return (Array.isArray(points) ? points : []).filter(p => Number.isFinite(p?.t) && Number.isFinite(p?.bid) && p.bid > 0).sort((a, b) => a.t - b.t)
}

// Diário é coletado a cada 6 h. A margem de 2 h evita acusar o intervalo normal.
// As coletas param no fim de semana, conforme quotes.yml.
export function historyQuality({ points, generatedAt, end, intraday = false, reference = false }, now = Date.now()) {
  const messages = []
  if (!reference) {
    const weekendAllowance = Math.max(0, centralMaxAge(now) - 75 * 60000)
    const limit = intraday ? centralMaxAge(now) : 8 * 3600000 + weekendAllowance
    if (!Number.isFinite(generatedAt)) messages.push('Data da coleta não informada pela fonte.')
    else if (generatedAt > now + 60000) messages.push('Data da coleta está no futuro; confira o relógio e a fonte.')
    else if (now - generatedAt > limit) messages.push('A coleta está atrasada; exibindo a última série disponível.')
  }
  const last = points?.at(-1)
  // Tolerância conservadora para fins de semana e feriados; não presume pregão em toda data civil.
  if (!intraday && last && Number.isFinite(end) && end - last.t > 5 * 86400000) messages.push('Cobertura parcial: a série termina mais de cinco dias antes do fim solicitado.')
  return messages.join(' ')
}
