// Só o casco do app fica em cache. Dados financeiros nunca passam pelo cache.
const CASCA = 'caixa-v1'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CASCA).then((c) => c.addAll(['./', 'favicon.svg', 'manifest.webmanifest'])))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('caixa-') && k !== CASCA).map((k) => caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url)
  if (e.request.method !== 'GET' || u.origin !== location.origin) return
  e.respondWith(fetch(e.request).then((r) => {
    const copia = r.clone()
    caches.open(CASCA).then((c) => c.put(e.request, copia))
    return r
  }).catch(() => caches.match(e.request)))
})
