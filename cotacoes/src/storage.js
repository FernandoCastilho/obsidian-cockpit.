// Armazenamento pode ser bloqueado pelo navegador. A tela continua utilizável.
export function readStorage(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
