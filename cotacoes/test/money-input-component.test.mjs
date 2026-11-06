import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import * as moneyInput from '../src/moneyInput.js'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/MoneyInput.jsx', import.meta.url), 'utf8')
const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
const module = { exports: {} }
runInNewContext(code, { module, exports: module.exports, require: name => name === './moneyInput.js' ? moneyInput : require(name) })
const inputFor = props => module.exports.default(props).props.children.find(child => child?.type === 'input')

test('MoneyInput notifica o formulário no blur mesmo vazio ou inválido', () => {
  for (const value of ['', 'inválido']) {
    const changes = [], blurs = []
    const input = inputFor({ value, onChange: text => changes.push(text), onBlur: event => blurs.push(event), id: 'principal', 'aria-describedby': 'principal-err' })
    const event = { target: { value } }
    input.props.onBlur(event)
    assert.equal(blurs.length, 1, `o formulário deve receber blur para ${JSON.stringify(value)}`)
    assert.equal(blurs[0], event)
    assert.deepEqual(changes, [], 'não substitui a entrada vazia ou inválida')
    assert.equal(input.props['aria-describedby'], 'principal-err')
  }
})

test('MoneyInput mantém formatação ao sair e chama o onBlur do consumidor', () => {
  const changes = [], blurs = []
  const input = inputFor({ value: '1000', onChange: value => changes.push(value), onBlur: event => blurs.push(event) })
  const event = { target: { value: '1000' } }
  input.props.onBlur(event)
  assert.deepEqual(changes, ['1.000,00'])
  assert.equal(blurs.length, 1)
  assert.equal(blurs[0], event)
  assert.doesNotThrow(() => inputFor({ value: '0', onChange() {} }).props.onBlur({ target: { value: '0' } }))
})
