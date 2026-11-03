// Contagem de acessos (ilustrativa, gratuita): Umami Cloud, sem cookies nem dado pessoal. Mostra no painel do Umami quem está
// online e os acessos por dia. Só conta o site publicado (não o ambiente local, as prévias nem os testes automáticos).
export const UMAMI_ID = 'ae53b4f8-bfa9-447c-906c-467501b31807'
export const UMAMI_SRC = 'https://cloud.umami.is/script.js'
export const SITE_HOST = 'fernandocastilho.github.io'

export const deveContar = ({ prod, hostname, webdriver }) => !!prod && hostname === SITE_HOST && !webdriver

export function iniciarContagem({ prod = import.meta.env?.PROD, doc = typeof document !== 'undefined' ? document : null } = {}) {
  if (!doc || !deveContar({ prod, hostname: doc.location?.hostname, webdriver: typeof navigator !== 'undefined' && navigator.webdriver })) return false
  if (doc.querySelector(`script[data-website-id="${UMAMI_ID}"]`)) return true
  const s = doc.createElement('script')
  s.defer = true
  s.src = UMAMI_SRC
  s.dataset.websiteId = UMAMI_ID
  s.dataset.domains = SITE_HOST
  doc.head.appendChild(s) // se a rede bloquear o endereço, o app segue normal e o acesso só não é contado
  return true
}
