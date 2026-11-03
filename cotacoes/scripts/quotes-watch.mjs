// Vigia da coleta de cotações: o agendamento do GitHub às vezes pula a partida do pregão (03/11/2026: coleta parada das 7h44
// às 11h15). De 15 em 15 min, no pregão (9h30 às 18h de Brasília, seg–sex), se o quotes.json da branch `data` tiver mais de
// 15 min e não houver coleta rodando ou na fila, dispara a coleta (quotes.yml), que fica ligada até o fim do pregão.
import { appendFile } from 'node:fs/promises'

export const LIMITE_MIN = 15
export function quotesWatchDecision({ generatedAt, running = false, now = Date.now() }) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(new Date(now)).map((x) => [x.type, x.value]))
  const min = Number(p.hour) * 60 + Number(p.minute)
  if (['Sat', 'Sun'].includes(p.weekday) || min < 9 * 60 + 30 || min > 18 * 60) return { run: false, reason: 'fora do pregão' }
  const idade = Number.isFinite(generatedAt) ? Math.round((now - generatedAt) / 60000) : Infinity
  if (idade <= LIMITE_MIN) return { run: false, reason: `coleta em dia (${idade} min)` }
  if (running) return { run: false, reason: `coleta com ${idade} min, mas já há execução rodando ou na fila` }
  return { run: true, reason: `coleta parada há ${idade === Infinity ? '?' : idade} min: disparando` }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const generatedAt = Number(process.env.GENERATED_AT)
  const running = process.env.RUNNING === 'true'
  const d = quotesWatchDecision({ generatedAt, running })
  console.log('Cotações:', d.reason)
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `run=${d.run}\n`)
}
