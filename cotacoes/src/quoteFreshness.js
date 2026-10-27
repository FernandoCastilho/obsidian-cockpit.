// Product age guard, not a provider SLA or a market-open/closed detector.
export const QUOTE_AGE_LIMIT_MS = 10 * 60000
export function quoteAgeState(quote, now = Date.now()) {
  if (!quote) return 'Sem dado'
  if (quote.stale) return 'Pendente'
  if (quote.fallback) return 'Reserva diária'
  if (!Number.isFinite(quote.timestamp) || quote.timestamp <= 0 || quote.timestamp > now + 60000) return 'Horário inválido'
  return now - quote.timestamp > QUOTE_AGE_LIMIT_MS ? 'Dado antigo' : ''
}
