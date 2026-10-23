// Publication cadence and collector freshness are separate from observation age.
export function oilStatus(data, failed = false, now = new Date()) {
  if (!data) return { pending: failed, label: failed ? 'Referência indisponível' : 'Carregando referência…' }
  const checked = Date.parse(data.generatedAt)
  const age = now.getTime() - checked
  const missedCollection = !Number.isFinite(checked) || age < 0 || age > 26 * 60 * 60 * 1000
  const overdue = !data.nextReleaseDate || now.toISOString().slice(0, 10) > data.nextReleaseDate
  const pending = failed || !!data.stale || missedCollection || overdue
  return { pending, label: pending ? 'Último dado · atualização pendente' : 'EIA · publicação semanal · sem intraday' }
}
