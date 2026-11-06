import test from 'node:test'
import assert from 'node:assert/strict'
import { connectSystemTheme, readSystemTheme, subscribeSystemTheme, THEME_COLORS, THEME_QUERY } from '../src/systemTheme.js'

function system(light, legacy = false) {
  const listeners = new Set()
  const media = { matches: light }
  if (legacy) {
    media.addListener = fn => listeners.add(fn)
    media.removeListener = fn => listeners.delete(fn)
  } else {
    media.addEventListener = (event, fn) => { assert.equal(event, 'change'); listeners.add(fn) }
    media.removeEventListener = (event, fn) => { assert.equal(event, 'change'); listeners.delete(fn) }
  }
  return {
    matchMedia: query => { assert.equal(query, THEME_QUERY); return media },
    change: light => { media.matches = light; for (const listener of listeners) listener() },
    count: () => listeners.size,
  }
}

test('uses the operating system on entry, without a stored preference', () => {
  assert.equal(readSystemTheme(system(true)), 'light')
  assert.equal(readSystemTheme(system(false)), 'dark')
  assert.equal(readSystemTheme({}), 'dark')
})

for (const legacy of [false, true]) test(`live changes and listener cleanup (${legacy ? 'legacy' : 'modern'})`, () => {
  const target = system(false, legacy), seen = []
  const stop = subscribeSystemTheme(() => seen.push(readSystemTheme(target)), target)
  target.change(true); target.change(false)
  assert.deepEqual(seen, ['light', 'dark'])
  assert.equal(target.count(), 1)
  stop()
  assert.equal(target.count(), 0)
  target.change(true)
  assert.deepEqual(seen, ['light', 'dark'])
})

test('browser chrome and document follow live changes and tolerate a missing meta tag', () => {
  const target = system(true), attributes = {}, doc = {
    documentElement: { dataset: {} },
    querySelector: selector => { assert.equal(selector, 'meta[name="theme-color"]'); return { setAttribute: (key, value) => { attributes[key] = value } } },
  }
  const stop = connectSystemTheme(target, doc)
  assert.equal(doc.documentElement.dataset.theme, 'light')
  assert.equal(attributes.content, THEME_COLORS.light)
  target.change(false)
  assert.equal(doc.documentElement.dataset.theme, 'dark')
  assert.equal(attributes.content, THEME_COLORS.dark)
  stop()
  assert.equal(target.count(), 0)
  doc.querySelector = () => null
  assert.doesNotThrow(() => connectSystemTheme({}, doc)())
})
