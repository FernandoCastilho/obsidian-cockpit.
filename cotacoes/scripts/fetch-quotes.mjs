// Coleta central de cotações (rodado a cada 5 min pelo workflow "Cotações (coleta central)").
// Falha de fonte nunca derruba o workflow: os arquivos anteriores ficam e a página mostra a idade da cotação.
import { collect } from './quotes-lib.mjs'

const r = await collect({ dir: process.env.DATA_DIR ?? '/tmp/data', key: process.env.AWESOMEAPI_KEY })
console.log(r.ok ? `Coleta ok: ${r.pairs} pares, ${r.points} pontos de intraday` : `Coleta falhou (${r.error}); mantidos os arquivos anteriores`)
