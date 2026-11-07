import test from 'node:test'
import assert from 'node:assert/strict'
import { connectSystemTheme, readSystemTheme, subscribeSystemTheme, THEME_COLORS, THEME_QUERY, readTheme, readThemePreference, setThemePreference, subscribeTheme, THEME_STORAGE_KEY } from '../src/systemTheme.js'

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

// Event and storage fakes keep preference tests independent from a real browser.
function environment(light, initial) {
  const target = system(light), events = new Map(), values = new Map()
  if (initial !== undefined) values.set(THEME_STORAGE_KEY, initial)
  target.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  target.addEventListener = (name, listener) => { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(listener) }
  target.removeEventListener = (name, listener) => events.get(name)?.delete(listener)
  target.dispatchEvent = event => { for (const listener of events.get(event.type) || []) listener(event) }
  target.listeners = () => [...events.values()].reduce((sum, set) => sum + set.size, 0)
  return target
}

test('manual light/dark override the device, persist and return to automatic', () => {
  const target = environment(false), seen = []
  const stop = subscribeTheme(() => seen.push(readTheme(target)), target)
  assert.equal(readThemePreference(target), 'system')
  setThemePreference('light', target)
  assert.equal(readTheme(target), 'light')
  assert.equal(target.localStorage.getItem(THEME_STORAGE_KEY), 'light')
  target.change(true); target.change(false)
  assert.equal(readTheme(target), 'light', 'OS cannot replace a manual choice')
  setThemePreference('dark', target)
  assert.equal(readTheme(target), 'dark')
  target.change(true)
  assert.equal(readTheme(target), 'dark')
  setThemePreference('system', target)
  assert.equal(readTheme(target), 'light')
  assert.equal(target.localStorage.getItem(THEME_STORAGE_KEY), null)
  target.change(false)
  assert.equal(readTheme(target), 'dark')
  assert.equal(seen.at(-1), 'dark')
  stop()
  assert.equal(target.count(), 0)
  assert.equal(target.listeners(), 0)
})

test('a new visit honors saved choice and invalid data falls back to the OS', () => {
  assert.equal(readTheme(environment(false, 'light')), 'light')
  assert.equal(readTheme(environment(true, 'dark')), 'dark')
  assert.equal(readTheme(environment(true, 'invalid')), 'light')
})

test('storage changes in another tab synchronize preference and browser chrome', () => {
  const target = environment(false), attributes = {}, doc = { documentElement: { dataset: {} }, querySelector: () => ({ setAttribute: (key, value) => { attributes[key] = value } }) }
  const stop = connectSystemTheme(target, doc)
  setThemePreference('dark', target)
  target.localStorage.setItem(THEME_STORAGE_KEY, 'light')
  target.dispatchEvent({ type: 'storage', key: THEME_STORAGE_KEY, storageArea: target.localStorage })
  assert.equal(doc.documentElement.dataset.theme, 'light')
  assert.equal(attributes.content, THEME_COLORS.light)
  target.localStorage.removeItem(THEME_STORAGE_KEY)
  target.dispatchEvent({ type: 'storage', key: null, storageArea: target.localStorage })
  assert.equal(doc.documentElement.dataset.theme, 'dark')
  assert.equal(readThemePreference(target), 'system')
  stop()
})

test('blocked storage keeps manual choices usable during the current visit', () => {
  const target = environment(false)
  Object.defineProperty(target, 'localStorage', { get() { throw new Error('blocked') } })
  assert.equal(readThemePreference(target), 'system')
  assert.doesNotThrow(() => setThemePreference('light', target))
  assert.equal(readTheme(target), 'light')
  setThemePreference('system', target)
  assert.equal(readTheme(target), 'dark')
})
