// O app instalável depende destes arquivos: se um sumir ou o manifesto quebrar, o deploy para.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const pub = (f) => new URL(`../public/${f}`, import.meta.url)

test('manifesto: campos exigidos para instalar e ícones existentes', () => {
  const m = JSON.parse(readFileSync(pub('manifest.webmanifest'), 'utf8'))
  assert.equal(m.display, 'standalone')
  assert.ok(m.name && m.short_name && m.start_url && m.scope)
  assert.match(m.theme_color, /^#[0-9a-f]{6}$/i)
  const sizes = m.icons.map((i) => i.sizes)
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'))
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'))
  for (const i of m.icons) assert.ok(existsSync(pub(i.src)), `ícone ausente: ${i.src}`)
  assert.ok(existsSync(pub('apple-touch-icon.png')))
})

test('index.html liga o manifesto e o ícone do iOS por caminho relativo', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/)
  assert.match(html, /rel="apple-touch-icon" href="\.\/apple-touch-icon\.png"/)
  assert.match(html, /name="theme-color"/)
})

test('service worker: não intercepta outros domínios nem métodos que não sejam GET', () => {
  const sw = readFileSync(pub('sw.js'), 'utf8')
  assert.match(sw, /req\.method !== 'GET'\) return/)
  assert.match(sw, /url\.origin !== self\.location\.origin\) return/)
})
