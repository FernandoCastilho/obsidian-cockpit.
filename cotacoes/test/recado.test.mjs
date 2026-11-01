import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { jaVisto, marcarVisto, recadoAtivo } from '../src/recado.js'

const T = Date.parse('2026-11-05T12:00:00-03:00')

test('recado: desligado, sem texto ou arquivo estranho não aparece', () => {
  assert.equal(recadoAtivo(null, T), null)
  assert.equal(recadoAtivo({ ativo: false, texto: 'oi' }, T), null)
  assert.equal(recadoAtivo({ ativo: 'true', texto: 'oi' }, T), null, 'só o booleano true liga')
  assert.equal(recadoAtivo({ ativo: true, texto: '   ' }, T), null)
})

test('recado: ligado aparece com título padrão, nível e chave pelo conteúdo', () => {
  const r = recadoAtivo({ ativo: true, texto: ' Reunião às 15h ' }, T)
  assert.deepEqual(r, { id: 'Recado\nReunião às 15h', titulo: 'Recado', texto: 'Reunião às 15h', nivel: 'info' })
  assert.equal(recadoAtivo({ ativo: true, texto: 'x', nivel: 'urgente' }, T).nivel, 'urgente')
  assert.equal(recadoAtivo({ ativo: true, texto: 'x', nivel: 'qualquer' }, T).nivel, 'info')
  assert.equal(recadoAtivo({ ativo: true, texto: 'x', id: 'r7' }, T).id, 'r7')
  assert.notEqual(recadoAtivo({ ativo: true, texto: 'a' }, T).id, recadoAtivo({ ativo: true, texto: 'b' }, T).id, 'texto novo = recado novo')
})

test('recado: respeita início e fim; datas vazias ou inválidas não bloqueiam', () => {
  const base = { ativo: true, texto: 'x' }
  assert.equal(recadoAtivo({ ...base, ate: '2026-11-04T18:00:00-03:00' }, T), null, 'vencido')
  assert.equal(recadoAtivo({ ...base, de: '2026-11-06T08:00:00-03:00' }, T), null, 'ainda não começou')
  assert.ok(recadoAtivo({ ...base, de: '2026-11-05T08:00:00-03:00', ate: '2026-11-07' }, T))
  assert.ok(recadoAtivo({ ...base, de: '', ate: 'amanhã' }, T))
})

test('recado: "já visto" guarda a última chave e tolera storage indisponível', () => {
  const mem = new Map(), storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) }
  assert.equal(jaVisto('a', storage), false)
  marcarVisto('a', storage)
  assert.equal(jaVisto('a', storage), true)
  assert.equal(jaVisto('b', storage), false)
  const quebrado = { getItem: () => { throw new Error('privado') }, setItem: () => { throw new Error('privado') } }
  assert.equal(jaVisto('a', quebrado), false)
  assert.doesNotThrow(() => marcarVisto('a', quebrado))
})

test('recado: o arquivo publicado é JSON válido, vem desligado e explica o uso', () => {
  const f = JSON.parse(readFileSync(new URL('../public/recado.json', import.meta.url), 'utf8'))
  assert.equal(f.ativo, false)
  assert.equal(recadoAtivo(f), null)
  assert.match(f._como_usar, /ativo para true/)
})
