// Service worker: abre o app sem rede (último conteúdo) e mantém os dados no cache.
// Versão do cache: troque ao mudar a estratégia; os arquivos com hash do Vite se renovam sozinhos.
const CACHE = 'cotacoes-v2'
const SHELL = ['./', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const put = async (req, res) => {
  if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone())
  return res
}

// Rede primeiro, com o cache como reserva (páginas e arquivos de dados: sempre o mais novo possível).
// cache: 'no-cache' revalida no servidor: sem isso, o cache HTTP do GitHub Pages (10 min) pode entregar a página antiga logo após um deploy.
const networkFirst = (req) => fetch(req, { cache: 'no-cache' }).then((res) => put(req, res)).catch(() => caches.match(req, { ignoreSearch: true }))

// Cache primeiro (arquivos estáticos com hash no nome).
const cacheFirst = async (req) => (await caches.match(req)) ?? fetch(req).then((res) => put(req, res))

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // APIs de cotação e outros domínios: sempre direto da rede, nunca do cache.
  if (url.origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req).then((r) => r ?? caches.match('./')))
  } else if (/\.json$/.test(url.pathname)) {
    event.respondWith(networkFirst(req))
  } else {
    event.respondWith(cacheFirst(req))
  }
})
