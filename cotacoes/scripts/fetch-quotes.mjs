// Coleta central de cotações (rodado a cada 5 min pelo workflow "Cotações (coleta central)").
// Falha de fonte nunca derruba o workflow: os arquivos anteriores ficam e a página mostra a idade da cotação.
import { collect, collectHistory } from './quotes-lib.mjs'

const r = await collect({ dir: process.env.DATA_DIR ?? '/tmp/data', key: process.env.AWESOMEAPI_KEY })
console.log(r.ok ? `Coleta ok: ${r.pairs} pares, ${r.points} pontos de intraday` : `Coleta falhou (${r.error}); mantidos os arquivos anteriores`)

const h = await collectHistory({ dir: process.env.DATA_DIR ?? '/tmp/data', key: process.env.AWESOMEAPI_KEY })
console.log(h.skipped ? 'Histórico: em dia (menos de 6 h)' : h.ok ? `Histórico: ${h.series} moedas${h.errors?.length ? ` (falhas: ${h.errors.join(' | ')})` : ''}` : `Histórico falhou (${h.error}); mantido o anterior`)
