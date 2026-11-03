import { CONCEITOS } from './educacao.js'

export const CONCEITO_DIA_KEY = 'aprender-conceito-dia'
export function conceitoDoDia(now = new Date()) {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const [ano, mes, data] = dia.split('-').map(Number)
  const indice = Math.floor(Date.UTC(ano, mes - 1, data) / 86400000)
  return { dia, conceito: CONCEITOS[indice % CONCEITOS.length] }
}

// Falha de persistência não impede a leitura; o componente também guarda a sessão.
export function conceitoVisto(dia) {
  try { return globalThis.localStorage?.getItem(CONCEITO_DIA_KEY) === dia } catch { return false }
}
export function marcarConceito(dia) {
  try { globalThis.localStorage?.setItem(CONCEITO_DIA_KEY, dia) } catch { /* sessão apenas */ }
}
