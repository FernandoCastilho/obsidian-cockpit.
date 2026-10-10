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

import { readFileSync as rf } from 'node:fs'
import { isWeekendBR } from '../src/market.js'
test('coleta automática só de segunda a sexta (horário de Brasília) e app reconhece o fim de semana', () => {
  for (const f of ['pages.yml', 'quotes.yml']) {
    const crons = [...rf(new URL(`../../.github/workflows/${f}`, import.meta.url), 'utf8').matchAll(/- cron: '([^']+)'/g)].map((m) => m[1])
    assert.ok(crons.length >= 1)
    for (const c of crons) assert.notEqual(c.split(' ')[4], '*', `${f}: o agendamento "${c}" roda no fim de semana`)
  }
  // sexta 21h (Brasília) = sábado 00h UTC: ainda sexta; sábado e domingo ao meio-dia: fim de semana
  assert.equal(isWeekendBR(Date.parse('2026-10-10T15:00:00Z')), true) // sábado
  assert.equal(isWeekendBR(Date.parse('2026-10-11T15:00:00Z')), true) // domingo
  assert.equal(isWeekendBR(Date.parse('2026-10-10T01:00:00Z')), false) // sexta 22h em Brasília
  assert.equal(isWeekendBR(Date.parse('2026-10-12T12:00:00Z')), false) // segunda
})
