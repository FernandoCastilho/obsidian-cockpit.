// Login com Google (Google Identity Services). Só leitura da planilha.
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'
const KEY = 'financas:token'

const read = () => {
  try {
    const t = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    return t && t.exp > Date.now() + 60000 ? t.value : null
  } catch {
    return null
  }
}
const save = (value, seconds) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ value, exp: Date.now() + seconds * 1000 }))
  } catch {}
}
export const clearToken = () => {
  try {
    sessionStorage.removeItem(KEY)
  } catch {}
}
export const hasToken = () => !!read()

const loadGsi = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Não foi possível carregar o login do Google. Verifique a conexão.'))
    document.head.appendChild(s)
  })

// Chame a partir de um clique: o Google abre uma janela de autorização quando precisa.
export async function getToken(clientId) {
  const cached = read()
  if (cached) return cached
  if (!clientId) throw new Error('Informe o ID do cliente Google em Ajustes.')
  await loadGsi()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error_description || r.error || 'Login cancelado.'))
        save(r.access_token, Number(r.expires_in) || 3600)
        resolve(r.access_token)
      },
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'Login cancelado.' : e?.message || 'Falha no login.')),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

// Revoga o acesso concedido neste aparelho (melhor esforço: ignora falhas de rede).
export function revoke() {
  const t = read()
  clearToken()
  try {
    if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t, () => {})
  } catch {}
}
