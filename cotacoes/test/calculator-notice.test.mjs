import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/Calculadora.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/Calculadora.css', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

test('aviso de validação das calculadoras fica na central de avisos, marcado como importante', () => {
  const start = source.indexOf('<section className="macro calc"')
  const notice = source.indexOf('className="calc-validation-notice" role="status"', start)
  const route = source.indexOf('{!opt ? (', start)
  assert.ok(start >= 0 && notice > start && route > notice, 'o aviso vale para a lista e para as rotas diretas')
  assert.match(source, /<Aviso title="Calculadoras · em validação" important>/)
  assert.match(source, /<strong>Em construção\.<\/strong> Os cálculos estão sendo validados\./)
  assert.equal(source.match(/className="calc-validation-notice"/g).length, 1)
  assert.match(source, /import '\.\/Calculadora\.css'/)
  assert.match(css, /overflow-wrap: anywhere/)
  assert.doesNotMatch(css, /position:\s*(fixed|absolute)|min-width:/)
})

test('aviso geral completo está na central de avisos, acessível por um botão discreto e não no rodapé', () => {
  assert.match(app, /<AvisosProvider general=\{/)
  assert.doesNotMatch(app, /general-notice-footer|<InfoNotice>/)
  for (const text of ['As simulações são hipotéticas', 'observadas as responsabilidades previstas na legislação aplicável', 'baseado em fontes públicas', 'O uso é de responsabilidade do usuário']) assert.ok(app.includes(text))
  assert.ok(app.includes('<p><i>{DISCLAIMER}</i></p>'))
  assert.match(readFileSync(new URL('../src/TopBar.jsx', import.meta.url), 'utf8'), /<AvisosButton className="topbar-info" \/>/)
})
