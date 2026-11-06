// Rascunhos apenas em memória: sobrevivem à navegação interna e somem ao recarregar/fechar a aba.
// Não usa armazenamento do navegador, rede ou índice de busca.
export function createDraftStore(initial) {
  let value = initial()
  const listeners = new Set()
  const emit = () => listeners.forEach(listener => listener())
  return {
    getSnapshot: () => value,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    update(patch) { value = { ...value, ...(typeof patch === 'function' ? patch(value) : patch) }; emit() },
    reset() { value = initial(); emit() },
  }
}

export const newFinimpDraft = () => ({
  principalText: '', currency: 'USD',
  competitor: { annualRate: '', flatRate: '', tac: '0' },
  itau: { annualRate: '', flatRate: '', tac: '0' },
  useTac: false,
  goalMode: 'equal', goalTerm: 5, targetText: '',
})
export const finimpDraftStore = createDraftStore(newFinimpDraft)
