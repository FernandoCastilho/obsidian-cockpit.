import test from 'node:test'
import assert from 'node:assert/strict'
import { CONCEITOS } from '../src/educacao.js'
import { conceitoDoDia, conceitoVisto, marcarConceito } from '../src/conceitoDiario.js'

test('conceito diário usa o dia de São Paulo, com conteúdo real e ciclo sem repetição consecutiva', () => {
  const antes = conceitoDoDia(new Date('2026-11-03T02:59:59Z'))
  const depois = conceitoDoDia(new Date('2026-11-03T03:00:00Z'))
  assert.equal(antes.dia, '2026-11-02')
  assert.equal(depois.dia, '2026-11-03')
  assert.notEqual(antes.conceito.id, depois.conceito.id)
  assert.ok(CONCEITOS.includes(antes.conceito))
  assert.deepEqual(antes, conceitoDoDia(new Date('2026-11-02T03:00:00Z')))
  const ids = new Set(Array.from({ length: CONCEITOS.length }, (_, i) => conceitoDoDia(new Date(Date.UTC(2026, 10, 2 + i, 12))).conceito.id))
  assert.equal(ids.size, CONCEITOS.length)
})

test('persistência diária é separada e tolera armazenamento bloqueado', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const mem = new Map()
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: k => mem.get(k), setItem: (k, v) => mem.set(k, v) } })
    assert.equal(conceitoVisto('2026-11-02'), false)
    marcarConceito('2026-11-02')
    assert.equal(conceitoVisto('2026-11-02'), true)
    assert.equal(conceitoVisto('2026-11-03'), false)
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('bloqueado') } })
    assert.equal(conceitoVisto('2026-11-02'), false)
    assert.doesNotThrow(() => marcarConceito('2026-11-02'))
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else delete globalThis.localStorage
  }
})
