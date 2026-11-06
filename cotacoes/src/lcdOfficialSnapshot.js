// Dados públicos lidos no arquivo oficial, via link revelado pela consulta BNDES.
// Snapshot congelado; este módulo NÃO consulta rede nem representa atualização automática.
export const LCD_SNAPSHOT_AS_OF = '2026-11-05'
export const LCD_SNAPSHOT_CAPTURED_AT = '2026-11-05T14:52:00Z'
export const LCD_SNAPSHOT_SOURCE = 'https://www.bndes.gov.br/Moedas/umLD1.txt'
export const LCD_SNAPSHOT_POINTS = Object.freeze([
  ['2025-02-01', -0.25], ['2025-04-01', -0.25], ['2025-07-01', -0.25],
  ['2025-09-01', -0.25], ['2025-10-01', -0.22], ['2026-01-01', -0.11],
  ['2026-04-01', -0.13], ['2026-07-01', -0.13], ['2026-10-01', -0.11],
].map(point => Object.freeze(point)))

export function withOfficialLcdSnapshot(data) {
  // Substituição deliberada SOMENTE de LD1 pelo snapshot documentado. Ao liberar
  // a fonte automática será preciso revisar esta política, não só ativar o coletor.
  return { ...data, series: { ...data?.series, LD1: { points: LCD_SNAPSHOT_POINTS.map(point => [...point]), source: LCD_SNAPSHOT_SOURCE, sourceValidated: true, referenceCoverageThrough: LCD_SNAPSHOT_AS_OF, capturedAt: LCD_SNAPSHOT_CAPTURED_AT, automaticUpdate: false } }, stale: { ...data?.stale, LD1: Date.parse(LCD_SNAPSHOT_CAPTURED_AT) } }
}
