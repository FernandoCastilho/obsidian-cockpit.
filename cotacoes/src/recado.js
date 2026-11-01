// Recado da administração: o app relê public/recado.json a cada minuto e mostra um pop-up quando há recado novo.
// Regras puras (sem DOM) para poder testar: o que vale como recado, a chave de "já visto" e a validade.

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Normaliza o arquivo; devolve null quando não há recado para mostrar (desligado, vazio, vencido ou ainda não começou).
export function recadoAtivo(data, now = Date.now()) {
  if (!data || typeof data !== 'object' || data.ativo !== true) return null
  const titulo = texto(data.titulo, 120) || 'Recado'
  const corpo = texto(data.texto, 2000)
  if (!corpo) return null
  const inicio = data.de ? Date.parse(data.de) : NaN
  const fim = data.ate ? Date.parse(data.ate) : NaN
  if (Number.isFinite(inicio) && now < inicio) return null
  if (Number.isFinite(fim) && now > fim) return null
  const nivel = data.nivel === 'urgente' ? 'urgente' : 'info'
  // Sem "id", qualquer mudança no título ou no texto conta como recado novo.
  const id = texto(data.id, 80) || `${titulo}\n${corpo}`
  return { id, titulo, texto: corpo, nivel }
}

const CHAVE = 'recado-visto'
export function jaVisto(id, storage = globalThis.localStorage) {
  try { return storage?.getItem(CHAVE) === id } catch { return false }
}
export function marcarVisto(id, storage = globalThis.localStorage) {
  try { storage?.setItem(CHAVE, id) } catch { /* modo privado: o recado volta na próxima abertura */ }
}
