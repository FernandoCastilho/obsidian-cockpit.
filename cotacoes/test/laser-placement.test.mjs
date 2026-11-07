import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import { hookRenderer } from './helpers/hooks.mjs'
import * as laser from '../src/laser.js'
const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/Laser.jsx', import.meta.url), 'utf8')
const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' })

function setup() {
  let active = [], next = 0
  const frames = new Map(), listeners = new Map(), observers = new Set()
  const slot = (id) => ({ id, offsetParent: null, getClientRects: () => [{}], inert: false, closest() { return this.inert ? {} : null } })
  const header = slot('header'), diagramSlot = slot('diagram')
  const body = { querySelectorAll: () => [header, ...(active.length ? [diagramSlot] : [])] }
  const host = (id, slots) => ({ id, getClientRects: () => [{}], closest: () => null, querySelectorAll: () => slots, contains: el => slots.includes(el) })
  const diagram = host('diagram', [diagramSlot]), native = host('native', [])
  const document = { body, querySelectorAll: selector => selector === '.laser-slot' ? body.querySelectorAll() : active }
  const module = { exports: {} }
  runInNewContext(code, {
    module, exports: module.exports, document,
    requestAnimationFrame: fn => { const id = ++next; frames.set(id, fn); return id },
    cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class { constructor(fn) { this.fn = fn } observe() { observers.add(this.fn) } disconnect() { observers.delete(this.fn) } },
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: type => listeners.delete(type),
    require: name => name === './laser.js' ? laser : name === './Laser.css' ? {} : name === 'react-dom' ? { createPortal: (children, target) => ({ children, target }) } : require(name),
  })
  const renderer = hookRenderer(() => module.exports.default())
  const settle = async () => {
    await renderer.settle()
    for (const [id, fn] of [...frames]) { frames.delete(id); fn() }
    await renderer.settle()
    return renderer.value.props.children.filter(Boolean)
  }
  const change = value => { active = value ? [value] : []; header.inert = value === diagram; for (const fn of observers) fn() }
  return { renderer, settle, change, header, diagramSlot, diagram, native, listeners }
}

test('laser migra com estado único para o diagrama e volta ao cabeçalho; alternância preserva portal', async () => {
  const h = setup()
  let children = await h.settle()
  assert.equal(children.length, 1)
  assert.equal(children[0].target, h.header)
  h.change(h.diagram)
  children = await h.settle()
  assert.equal(children[0].target, h.diagramSlot)
  children[0].children.props.onClick()
  children = await h.settle()
  assert.equal(children.length, 2)
  assert.equal(children[0].target, h.diagram, 'canvas dentro do modal')
  assert.equal(children[1].target, h.diagramSlot, 'controle permanece no mesmo portal')
  assert.equal(children[1].children.props['aria-pressed'], true)
  h.change(null)
  children = await h.settle()
  assert.equal(children[1].target, h.header)
  assert.equal(children[1].children.props['aria-pressed'], true, 'mesmo estado global ao voltar')
  h.renderer.close()
  assert.equal(h.listeners.size, 0)
})

test('Escape desliga antes do evento chegar ao diagrama; reabrir não duplica controles', async () => {
  const h = setup()
  await h.settle()
  h.change(h.diagram)
  let children = await h.settle()
  children[0].children.props.onClick()
  await h.settle()
  const events = []
  h.listeners.get('keydown')({ key: 'Escape', preventDefault: () => events.push('prevent'), stopImmediatePropagation: () => events.push('stop') })
  children = await h.settle()
  assert.deepEqual(events, ['prevent', 'stop'])
  assert.equal(children.length, 1)
  assert.equal(children[0].target, h.diagramSlot)
  assert.equal(children[0].children.props['aria-pressed'], false)
  h.change(null); await h.settle(); h.change(h.diagram)
  assert.equal((await h.settle()).length, 1)
  h.renderer.close()
})

test('diálogos nativos sem encaixe mantêm botão no cabeçalho até ligar o laser', async () => {
  const h = setup()
  await h.settle(); h.change(h.native)
  let children = await h.settle()
  assert.equal(children[0].target, h.header)
  children[0].children.props.onClick()
  children = await h.settle()
  assert.equal(children[0].target, h.native)
  assert.equal(children[1].target, h.native)
  children[1].children.props.onClick()
  children = await h.settle()
  assert.equal(children.length, 1)
  assert.equal(children[0].target, h.header)
  h.renderer.close()
})
