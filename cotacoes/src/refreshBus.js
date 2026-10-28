// Barramento de atualização manual: o botão "atualizar" de cada painel pede a releitura dos arquivos de dados dele
// (o nome do arquivo é o identificador). Quem busca esse arquivo se inscreve aqui e relê na hora, sem esperar o ciclo automático.
const subs = new Set()

export function onRefresh(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

// Devolve { failed } quando todas as releituras terminam; uma falha não impede as demais.
export async function requestRefresh(files) {
  const results = await Promise.allSettled([...subs].map(async (fn) => fn(files)))
  return { failed: results.some((r) => r.status === 'rejected') }
}
