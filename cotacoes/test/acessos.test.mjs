import test from 'node:test'
import assert from 'node:assert/strict'
import { deveContar, iniciarContagem, UMAMI_ID } from '../src/acessos.js'

test('contagem de acessos: só no site publicado, nunca local nem em teste automático', () => {
  assert.equal(deveContar({ prod: true, hostname: 'fernandocastilho.github.io', webdriver: false }), true)
  assert.equal(deveContar({ prod: false, hostname: 'fernandocastilho.github.io', webdriver: false }), false)
  assert.equal(deveContar({ prod: true, hostname: '127.0.0.1', webdriver: false }), false)
  assert.equal(deveContar({ prod: true, hostname: 'fernandocastilho.github.io', webdriver: true }), false)
})
test('contagem de acessos: injeta o script do Umami uma vez, com o ID e o domínio', () => {
  const added = []
  const doc = { location: { hostname: 'fernandocastilho.github.io' }, querySelector: (sel) => added.find((s) => sel.includes(s.dataset.websiteId)) ?? null, createElement: () => ({ dataset: {} }), head: { appendChild: (s) => added.push(s) } }
  assert.equal(iniciarContagem({ prod: true, doc }), true)
  assert.equal(iniciarContagem({ prod: true, doc }), true)
  assert.equal(added.length, 1)
  assert.equal(added[0].src, 'https://cloud.umami.is/script.js'); assert.equal(added[0].dataset.websiteId, UMAMI_ID); assert.equal(added[0].dataset.domains, 'fernandocastilho.github.io'); assert.equal(added[0].defer, true)
})
