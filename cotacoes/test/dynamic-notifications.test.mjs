import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import { hookRenderer } from './helpers/hooks.mjs'

const require = createRequire(import.meta.url)

async function setup(t) {
  const source = (await readFile(new URL('../src/DynamicNotifications.jsx', import.meta.url), 'utf8')).replace("import './DynamicNotifications.css'", '')
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
  const module = { exports: {} }, timers = new Map()
  const opener = { isConnected: true, focus() { this.focused = true } }
  const document = { activeElement: opener, body: {} }
  runInNewContext(code, { module, exports: module.exports, require: name => name === 'react-dom' ? { createPortal: child => child } : require(name), document,
    setTimeout: (fn, delay) => { const id = Symbol(); timers.set(id, { fn, delay }); return id }, clearTimeout: id => timers.delete(id) })
  const render = hookRenderer(() => module.exports.default({ children: null }))
  t.after(() => render.close())
  await render.settle()
  const trigger = value => render.value.props.value(value)
  const overlay = () => render.value.props.children[1]
  const card = () => overlay().props.children[1]
  return { render, trigger, overlay, card, timers, document, opener }
}

test('notificação anuncia resultado, expande detalhes, pausa o prazo e fecha com Escape restaurando foco', async t => {
  const h = await setup(t)
  h.trigger({ title: 'Consulta concluída', message: 'Coleta das 10h' })
  await h.render.settle()
  assert.equal(h.overlay().props.children[0].props.role, 'status')
  assert.equal(h.timers.size, 1)
  assert.equal([...h.timers.values()][0].delay, 9000)
  h.card().props.children[0].props.onClick()
  await h.render.settle()
  assert.equal(h.card().props.children[2].props.hidden, false)
  assert.equal(h.timers.size, 0)
  h.card().ref.current = { contains: () => true }
  h.document.activeElement = {}
  h.card().props.onKeyDown({ key: 'Escape', preventDefault() {} })
  await h.render.settle()
  assert.equal(h.card(), null)
  assert.equal(h.opener.focused, true)
})

test('falha persiste; confirmação fecha no prazo; notificações consecutivas substituem a anterior', async t => {
  const h = await setup(t)
  h.trigger({ title: 'Falha', message: 'Tente novamente', error: true })
  await h.render.settle()
  assert.equal(h.timers.size, 0)
  h.trigger({ title: 'Consulta concluída', message: 'Novo resultado' })
  await h.render.settle()
  assert.equal(h.overlay().props.children[0].props.children, 'Consulta concluída. Novo resultado')
  const timer = [...h.timers.values()][0]
  timer.fn()
  await h.render.settle()
  assert.equal(h.card(), null)
})
