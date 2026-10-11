import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync as rf } from 'node:fs'

const sw = rf(new URL('../public/sw.js', import.meta.url), 'utf8')
const html = rf(new URL('../index.html', import.meta.url), 'utf8')
const manifest = JSON.parse(rf(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))

test('o service worker só apaga caches do próprio app', () => {
  assert.match(sw, /k\.startsWith\('financas-'\)/)
})
test('o service worker nunca guarda chamadas a outros domínios (Google)', () => {
  assert.match(sw, /url\.origin !== self\.location\.origin\) return/)
})
test('a página não é indexada por buscadores', () => {
  assert.match(html, /name="robots" content="noindex, nofollow"/)
})
test('manifesto instalável e com caminhos relativos (a página fica em /financas/)', () => {
  assert.equal(manifest.start_url, './')
  assert.equal(manifest.scope, './')
  assert.equal(manifest.display, 'standalone')
  for (const i of manifest.icons) assert.ok(!i.src.startsWith('/'), i.src)
})
