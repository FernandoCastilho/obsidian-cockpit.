import test from 'node:test'
import assert from 'node:assert/strict'
import { GLYPHS, glyph, iconFor, textOn, CATEGORY_DEFAULT } from '../src/icons.js'

test('todo ícone padrão de categoria existe na biblioteca', () => {
  for (const [cat, name] of Object.entries(CATEGORY_DEFAULT)) assert.ok(GLYPHS[name], `${cat} → ${name}`)
})
test('ícones têm caminho SVG não vazio', () => {
  for (const [n, d] of Object.entries(GLYPHS)) assert.match(d, /^M[\d. -]/, n)
})
test('glyph e iconFor caem em tag quando o nome é desconhecido', () => {
  assert.equal(glyph('nao-existe'), 'tag')
  assert.equal(iconFor('', '', 'XXX'), 'tag')
  assert.equal(iconFor('', '', 'MOR'), 'home')
  assert.equal(iconFor('key', 'home', 'MOR'), 'key')
})
test('texto sobre cor de marca: escuro em fundo claro, claro em fundo escuro', () => {
  assert.equal(textOn('#F9DD16'), '#111111')
  assert.equal(textOn('#820AD1'), '#ffffff')
  assert.equal(textOn('lixo'), '#ffffff')
})
