// Mensagem de erro para o usuário: sem texto técnico (JSON inválido, HTTP 404, "Failed to fetch"). O detalhe original vai só no title do selo.
export function mensagemErro(e) {
  const t = String(e?.message ?? e ?? '')
  if (!t) return 'Sem resposta da fonte'
  if (/Unexpected token|is not valid JSON|<!doctype|JSON/i.test(t)) return 'Arquivo ainda não publicado ou em formato inesperado'
  if (/\b404\b/.test(t)) return 'Arquivo ainda não publicado'
  if (/\b5\d\d\b/.test(t)) return 'Fonte fora do ar'
  if (/Failed to fetch|NetworkError|Load failed|timeout|abort|offline/i.test(t)) return 'Sem conexão com a fonte'
  return 'Fonte indisponível'
}
