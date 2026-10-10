// Mercado: fim de semana no horário de Brasília (as coletas automáticas não rodam sábado nem domingo).
export function isWeekendBR(now = Date.now()) {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(now)
  return d === 'Sat' || d === 'Sun'
}
