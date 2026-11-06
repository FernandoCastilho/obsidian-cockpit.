import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import React from 'react'
import { hookRenderer } from './helpers/hooks.mjs'

const require = createRequire(import.meta.url)
const nodes = el => Array.isArray(el) ? el.flatMap(nodes) : el && typeof el === 'object' ? [el, ...nodes(el.props?.children)] : []
test('FINAME bloqueia sem confirmação, libera zero e revoga ao trocar funding', async t => {
  const deps = { react: React, './MoneyInput.jsx': { __esModule: true, default: () => null }, './Estado.jsx': { __esModule: true, default: () => null }, './CalculatorHelp.jsx': { __esModule: true, default: () => null }, './useDataFile.js': { useDataFile: () => ({ status: 'ready', data: { series: { C03: { points: [['2026-11-06', 10]] } } } }) }, './useMacro.js': { useMacro: () => ({ data: {} }) } }
  for (const name of ['moneyInput', 'emprestimo', 'bndes', 'finameMateriais', 'finameFunding', 'format']) deps[`./${name}.js`] = await import(`../src/${name}.js`)
  const source = await readFile(new URL('../src/FinameMateriais.jsx', import.meta.url), 'utf8')
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
  const module = { exports: {} }
  runInNewContext(code, { module, exports: module.exports, require: name => deps[name] ?? require(name) })
  const render = hookRenderer(() => module.exports.default({ onBack() {} }))
  t.after(() => render.close())
  await render.settle()
  const field = id => nodes(render.value).find(node => node.props?.id === id)
  const hasResult = () => nodes(render.value).some(node => node.props?.className === 'fm-kpi')
  assert.equal(field('fm-finame-eligible').props.checked, false)
  assert.equal(field('fm-iof-fixo'), undefined)
  assert.equal(field('fm-iof-diario'), undefined)
  assert.equal(hasResult(), false)
  field('fm-finame-eligible').props.onChange({ target: { checked: true } })
  await render.settle()
  assert.equal(hasResult(), true)
  field('fm-custo').props.onChange({ target: { value: 'tlp' } })
  await render.settle()
  assert.equal(field('fm-finame-eligible').props.checked, false)
  assert.equal(hasResult(), false)
})
