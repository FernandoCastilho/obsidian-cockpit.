import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/Calculadora.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/Calculadora.css', import.meta.url), 'utf8')

test('validation notice is shared by calculator list and direct calculator routes', () => {
  const start = source.indexOf('<section className="macro calc"')
  const notice = source.indexOf('className="calc-validation-notice" role="status"', start)
  const route = source.indexOf('{!opt ? (', start)
  assert.ok(start >= 0 && notice > start && route > notice)
  assert.match(source, /<strong>Em construção\.<\/strong> Os cálculos estão sendo validados\./)
  assert.equal(source.match(/className="calc-validation-notice"/g).length, 1)
  assert.match(source, /import '\.\/Calculadora\.css'/)
  assert.match(css, /overflow-wrap: anywhere/)
  assert.doesNotMatch(css, /position:\s*(fixed|absolute)|min-width:/)
})

test('information disclaimer is visible outside every section condition', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /<main className="app">\s*<aside className="app-disclaimer"/)
  assert.match(app, /As simulações são hipotéticas/)
  assert.match(app, /observadas as responsabilidades previstas na legislação aplicável/)
  assert.equal(app.match(/className="app-disclaimer"/g).length, 1)
})
