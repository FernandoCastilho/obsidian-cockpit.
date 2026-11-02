import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { refreshScenarios } from '../../scripts/refresh-scenarios.mjs'
import { RETAIN_FILES, createWeeklySnapshot } from '../../scripts/weekly-data.mjs'

export const previousMacro = {
  generatedAt: 10, focusCheckedAt: 9, focus: { date: '2026-10-16', rows: [] },
  ptax: { USD: { sell: 5 } }, cdi: { value: 10 }, errors: ['falha anterior'],
  stale: { focus: 9, ptax: 7 }, otherMetadata: { original: true },
}
export const nextFocus = { date: '2026-10-23', rows: [{ label: 'IPCA', values: { 2026: { median: 4 } } }] }
export function weeklyFixture() {
  return Object.fromEntries(RETAIN_FILES.map(file => [file, file.endsWith('.json')
    ? JSON.stringify(file === 'macro.json' ? previousMacro : { generatedAt: 8, originalFile: file }, null, 2) + '\n'
    : '\uFEFFserie,nome,data,valor,unidade\r\nTEST,"Série, original",2026-10-23,5.1234,% a.a.\r\n']))
}

// O CI exercita o build real, usando apenas dados simulados e sem consultar o mercado.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Informe o caminho do snapshot de teste')
  const fixture = weeklyFixture()
  const retained = await refreshScenarios({ load: async file => fixture[file], collect: async () => nextFocus, now: 20 })
  await writeFile(process.argv[2], JSON.stringify(createWeeklySnapshot(retained)), 'utf8')
}
