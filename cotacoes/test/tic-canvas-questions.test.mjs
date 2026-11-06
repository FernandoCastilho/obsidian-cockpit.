import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { TIC_CANVAS_QUESTIONS } from '../src/ticCanvasQuestions.js'

const component = readFileSync(new URL('../src/SectorStudy.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/SectorStudy.css', import.meta.url), 'utf8')

test('roteiro Canvas é enxuto e cobre as seis dimensões da integradora', () => {
  assert.equal(TIC_CANVAS_QUESTIONS.length, 6)
  assert.deepEqual(TIC_CANVAS_QUESTIONS.map(item => item.dimension), [
    'Proposta de valor', 'Clientes e canais', 'Receita e recorrência',
    'Entrega e parceiros', 'Custos e riscos', 'Caixa e crescimento',
  ])
  for (const { question } of TIC_CANVAS_QUESTIONS) {
    assert.ok(question.length < 220)
    assert.ok(question.endsWith('?'))
    assert.equal(question.match(/\?/g).length, 1)
  }
  const text = TIC_CANVAS_QUESTIONS.map(item => item.question).join(' ')
  for (const term of ['fabricante', 'clientes', 'licenças', 'implantação', 'serviços gerenciados', 'margem', 'certificação', 'câmbio', 'caixa', 'aceite']) assert.ok(text.includes(term), term)
})

test('callout acessível aparece imediatamente após resumo, antes do podcast e capítulos', () => {
  const summary = component.indexOf('<div className="study-callout">')
  const callout = component.indexOf('<aside className="study-callout study-canvas-callout"')
  const podcast = component.indexOf('<SectorPodcast />')
  assert.ok(summary > 0 && callout > summary && podcast > callout)
  assert.match(component.slice(summary, callout), /<\/div>\s*$/)
  assert.match(component, /aria-labelledby="tic-canvas-title"/)
  assert.match(component, /<ol className="study-canvas-questions">/)
  assert.match(component, /inspirado no Business Model Canvas/)
  assert.match(css, /@media\(max-width:600px\).*study-canvas-questions\{grid-template-columns:minmax\(0,1fr\)/)
})
