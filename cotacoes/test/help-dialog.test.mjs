import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { transform } from 'esbuild'

// Exercita o componente e seus handlers com nós simulados. Não substitui o smoke
// de navegador para layout, inércia nativa do fundo e teclas dos rádios.
const source = await readFile(new URL('../src/HelpDialog.jsx', import.meta.url), 'utf8')
const compiled = await transform(source, { loader: 'jsx', format: 'cjs', jsxFactory: '__element' })
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]

function mount() {
  const slots = [], effects = [], events = []
  let cursor = 0, changed = false, tree
  const document = { body: {}, activeElement: null }
  const control = (type, checked) => ({ type, checked, disabled: false, tabIndex: 0, getClientRects: () => [{}], focus() { document.activeElement = this } })
  const trigger = control('button'), unchecked = control('radio', false), radio = control('radio', true), input = control('text'), closeButton = control('button')
  let opens = 0, closes = 0
  const popup = {
    open: false,
    showModal() { this.open = true; opens++ },
    close() { this.open = false; closes++ },
    querySelectorAll: () => [unchecked, radio, input, closeButton],
    getBoundingClientRect: () => ({ left: 20, right: 520, top: 20, bottom: 620 }),
  }
  const hooks = {
    useState(initial) {
      const index = cursor++
      slots[index] ??= { value: initial }
      return [slots[index].value, value => {
        const next = typeof value === 'function' ? value(slots[index].value) : value
        if (!Object.is(next, slots[index].value)) { slots[index].value = next; changed = true }
      }]
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial } },
    useId() { return hooks.useRef('test-dialog').current },
    useLayoutEffect(effect, dependencies) {
      const index = cursor++, previous = slots[index]
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) effects.push(() => {
        previous?.cleanup?.()
        slots[index] = { dependencies, cleanup: effect() }
      })
    },
  }
  const module = { exports: {} }, initialFocusRef = { current: radio }
  vm.runInNewContext(compiled.code, {
    module, exports: module.exports, document,
    window: { dispatchEvent: event => events.push(event) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail } },
    require: name => {
      if (name === 'react') return hooks
      if (name === 'react-dom') return { createPortal: node => node }
      if (name.endsWith('.css')) return {}
      throw new Error('Importação inesperada: ' + name)
    },
    __element: (type, props, ...children) => {
      if (props?.ref) props.ref.current = type === 'dialog' ? popup : trigger
      return { type, props: { ...props, children } }
    },
  })
  const render = () => {
    do {
      cursor = 0; changed = false
      tree = module.exports.default({ title: 'Paridade para a Finimp', initialFocusRef, children: 'Formulário' })
      while (effects.length) effects.shift()()
    } while (changed)
  }
  const find = predicate => nodes(tree).find(predicate)
  render()
  return {
    document, trigger, radio, input, closeButton, events, popup,
    triggerNode: () => find(node => node.type === 'button' && node.props['aria-label']),
    dialog: () => find(node => node.type === 'dialog'),
    closeNode: () => find(node => node.props?.className === 'help-dialog-close'),
    act(action) { action(); render() },
    open() { this.act(() => this.triggerNode().props.onClick()) },
    get opens() { return opens }, get closes() { return closes },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
  }
}

test('diálogo interativo: ativação explícita, sem tooltip/hover, semântica e foco inicial', () => {
  const app = mount()
  assert.equal(app.triggerNode().props['aria-haspopup'], 'dialog')
  assert.equal(app.triggerNode().props['aria-expanded'], false)
  assert.equal(app.triggerNode().props.onFocus, undefined)
  assert.equal(app.triggerNode().props.onPointerEnter, undefined)
  app.open()
  assert.equal(app.popup.open, true)
  assert.equal(app.document.activeElement, app.radio)
  assert.equal(app.dialog().props['aria-labelledby'], 'test-dialog-title')
  assert.equal(app.triggerNode().props['aria-controls'], app.dialog().props.id)
  assert.equal(app.events[0].type, 'help-open', 'dispensa outra ajuda sem modificar Help')
  app.unmount()
  assert.equal(app.popup.open, false)
})

test('Escape do formulário fecha, restaura foco e permite repetição de abertura', () => {
  const app = mount()
  for (let i = 0; i < 3; i++) {
    app.open()
    app.input.focus()
    let prevented = false
    app.act(() => app.dialog().props.onCancel({ preventDefault() { prevented = true } }))
    assert.equal(prevented, true)
    assert.equal(app.dialog(), undefined)
    assert.equal(app.document.activeElement, app.trigger)
    assert.equal(app.triggerNode().props['aria-expanded'], false)
  }
  assert.equal(app.opens, 3)
  assert.equal(app.closes, 3)
  app.unmount()
})

test('Fechar e cliques repetidos: um diálogo, foco restaurado', () => {
  const app = mount()
  app.open()
  app.open()
  assert.equal(app.opens, 1)
  app.act(() => app.closeNode().props.onClick())
  assert.equal(app.document.activeElement, app.trigger)
  assert.equal(app.popup.open, false)
  app.unmount()
})

test('Tab/Shift+Tab contêm foco e ignoram o rádio não selecionado', () => {
  const app = mount(); app.open()
  const key = (shiftKey = false) => {
    let prevented = false
    app.dialog().props.onKeyDown({ key: 'Tab', shiftKey, preventDefault() { prevented = true } })
    return prevented
  }
  assert.equal(key(true), true)
  assert.equal(app.document.activeElement, app.closeButton)
  assert.equal(key(), true)
  assert.equal(app.document.activeElement, app.radio)
  assert.equal(key(), false, 'passagem do rádio ao campo segue a navegação nativa')
  app.input.focus()
  assert.equal(key(), false)
  app.unmount()
})

test('clique externo fecha; clique interno e arrasto de dentro para fora não fecham', () => {
  const app = mount(); app.open()
  const event = (clientX, clientY, target = app.popup) => ({ target, currentTarget: app.popup, clientX, clientY })
  const down = e => app.act(() => app.dialog().props.onPointerDown(e))
  const click = e => app.act(() => app.dialog().props.onClick(e))
  down(event(30, 30)); click(event(30, 30))
  assert.equal(app.popup.open, true)
  down(event(30, 30, app.input)); click(event(2, 2))
  assert.equal(app.popup.open, true, 'arrasto iniciado no conteúdo não dispensa')
  down(event(2, 2)); click(event(2, 2))
  assert.equal(app.popup.open, false)
  assert.equal(app.document.activeElement, app.trigger)
  app.unmount()
})

test('conversor usa grupo e rádios nativos com nomes únicos e ref da seleção', async () => {
  const terminal = await readFile(new URL('../src/TerminalDesk.jsx', import.meta.url), 'utf8')
  assert.match(terminal, /<HelpDialog title="Paridade para a Finimp" initialFocusRef=\{selectedMode\}/)
  assert.match(terminal, /<fieldset className="fin-modos">/)
  assert.match(terminal, /<legend className="sr-only">Combinação de pagamento e financiamento<\/legend>/)
  assert.match(terminal, /type="radio" name=\{groupId\} value=\{id\} checked=\{modo === id\}/)
  assert.doesNotMatch(terminal, /role="radio"|role="radiogroup"/)
})
