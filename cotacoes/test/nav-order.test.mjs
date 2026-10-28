import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Nav.jsx importa JSX; lê o texto-fonte para travar a ordem do menu.
const src = readFileSync(new URL('../src/Nav.jsx', import.meta.url), 'utf8')
test('menu: Mercado hoje, Juros, Cenários e depois as demais; barra do celular com as 4 primeiras', () => {
  const ids = [...src.matchAll(/^\s{2}\{ id: '(\w+)', label:/gm)].map((m) => m[1])
  assert.deepEqual(ids, ['resumo', 'juros', 'cenarios', 'calculadora', 'noticias', 'feriados', 'aprender', 'config']) // mesma ordem da barra do computador (DESK_TABS)
  assert.match(src, /const PRIMARY = \['resumo', 'juros', 'cenarios', 'calculadora'\]/)
})

import { DESK_TABS } from '../src/terminal.js'
test('menu do celular e da barra do computador seguem a mesma ordem', () => {
  const ids = [...src.matchAll(/^\s{2}\{ id: '(\w+)', label:/gm)].map((m) => m[1])
  assert.deepEqual(ids, DESK_TABS.map((t) => t.id))
})
