export function dataTimestamp(value) {
  const date = new Date(value)
  if (value == null || !Number.isFinite(date.getTime())) return 'data não disponível'
  return `${date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (Brasília)`
}
