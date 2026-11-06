import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { transform } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { BANKING_TOPICS } from '../src/bankingSectors.js'
import { INSUMOS } from '../src/insumos.js'
import { SECTOR_PROFILES, PORTER_FORCES } from '../src/sectorProfiles.js'

const topics = [...BANKING_TOPICS, ...INSUMOS]
const forceIds = ['rivalry', 'buyers', 'suppliers', 'entrants', 'substitutes']
const require = createRequire(import.meta.url)

test('43 fichas cobrem exatamente 38 setores e cinco insumos, com 215 perguntas próprias', () => {
  assert.equal(BANKING_TOPICS.length, 38)
  assert.equal(INSUMOS.length, 5)
  assert.deepEqual(Object.keys(SECTOR_PROFILES).sort(), topics.map(topic => topic.id).sort())
  const questions = []
  for (const { id } of topics) {
    const profile = SECTOR_PROFILES[id]
    assert.equal(profile.id, id)
    assert.equal(profile.analysisKind, 'hipoteses-editoriais')
    assert.match(profile.reviewedAt, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(profile.scope.length >= 40, `${id}: recorte explícito`)
    assert.equal(profile.questions.length, 5, id)
    assert.equal(new Set(profile.questions).size, 5, id)
    for (const question of profile.questions) {
      assert.match(question, /\?$/, id)
      assert.ok(question.length >= 30, `${id}: pergunta completa`)
      questions.push(question)
    }
  }
  assert.equal(questions.length, 215)
  assert.equal(new Set(questions).size, 215, 'nenhuma pergunta idêntica replicada entre fichas')
})

test('Porter e pontos sensíveis têm mecanismo e validação por ficha, sem pontuação inventada', () => {
  assert.deepEqual(Object.keys(PORTER_FORCES).sort(), [...forceIds].sort())
  for (const [id, profile] of Object.entries(SECTOR_PROFILES)) {
    assert.deepEqual(profile.forces.map(force => force.id).sort(), [...forceIds].sort(), id)
    for (const force of profile.forces) {
      assert.ok(force.mechanism.length >= 35, `${id}/${force.id}: mecanismo`)
      assert.ok(force.validateWith.length >= 20, `${id}/${force.id}: validação`)
      assert.equal(force.score, undefined)
    }
    assert.ok(profile.sensitivePoints.length >= 3 && profile.sensitivePoints.length <= 5, id)
    assert.equal(new Set(profile.sensitivePoints.map(point => point.id)).size, profile.sensitivePoints.length)
    for (const point of profile.sensitivePoints) {
      assert.ok(Number.isInteger(point.questionIndex) && point.questionIndex >= 0 && point.questionIndex < 5, id)
      assert.ok(point.signal.length >= 20, id)
    }
    assert.ok(profile.sources.length > 0, id)
    assert.ok(profile.limitations.length > 0, id)
    for (const source of profile.sources) {
      const url = new URL(source.url)
      assert.equal(url.protocol, 'https:')
      assert.ok(source.label && source.purpose, id)
      assert.ok(!/secovi|investing\.com/.test(url.hostname), id)
    }
  }
})

// These narrow guards preserve audited fixes; they do not certify Porter semantics.
// The accompanying 42-profile review and independent review remain necessary.
test('regressão Porter: equivalentes importados não são substitutos nas três fichas apontadas', () => {
  for (const id of ['industria', 'metalmecanica', 'textil-moveis']) {
    const profile = SECTOR_PROFILES[id]
    const rival = profile.forces.find(force => force.id === 'rivalry')
    const substitute = profile.forces.find(force => force.id === 'substitutes')
    assert.match(rival.mechanism, /importad|estrangeir|equivalent/i, id)
    assert.match(substitute.mechanism, /import.+riva/i, `${id}: ressalva explícita de equivalência importada como rivalidade`)
    assert.match(substitute.mechanism, /fora da família|terceirizar|locação e reparo/i, `${id}: alternativa funcional distinta`)
  }
})

test('regressão Porter: hotelaria descreve barganha do fornecedor, não custo fixo com baixa ocupação', () => {
  const force = SECTOR_PROFILES['turismo-hospedagem'].forces.find(item => item.id === 'suppliers')
  assert.match(force.mechanism, /exclusiv|concentr|troca|alternativ|poucos|negoci|barganh|depend/i)
  assert.doesNotMatch(force.mechanism, /sustentar custos mesmo quando a ocupa[çc][ãa]o cai/i)
  assert.match(force.validateWith, /contrat|cota[çc]|troca|alternativ|forneced|homolog/i)
})

test('regressão de recorte: pecuária delimita terminação para abate, excluindo cria e venda de bezerros', () => {
  const profile = SECTOR_PROFILES.pecuaria
  assert.match(profile.scope, /Terminação.+venda de animais para abate/)
  assert.match(profile.scopeNote, /Cria e venda de bezerros.+análise própria/)
  assert.doesNotMatch(profile.forces.find(force => force.id === 'suppliers').mechanism, /na cria,/)
})

test('regressão de perguntas: quatro condições apontadas na auditoria não pressupõem problema', () => {
  for (const [id, index] of [['pecuaria', 4], ['industria', 4], ['lazer-entretenimento', 4], ['mineracao', 3]]) {
    assert.match(SECTOR_PROFILES[id].questions[index], /^(Há |Existe )/, id)
    assert.doesNotMatch(SECTOR_PROFILES[id].questions[index], /ainda impede|já levou|precisa de providência/, id)
  }
})

test('regressão Porter: fontes de energia, rede escolar e canais equivalentes não são substitutos só pela forma', () => {
  const oldClaims = {
    energia: 'outras fontes, geração própria do consumidor ou eficiência energética podem substituir parte da energia contratada',
    educacao: 'rede pública ou modelos de jornada e proposta diferentes podem substituir a opção privada',
    telecom: 'acesso móvel ou satélite pode substituir internet fixa',
    seguros: 'venda direta ou seguro embutido em outro produto pode substituir o canal de corretagem tradicional',
  }
  for (const [id, oldClaim] of Object.entries(oldClaims)) {
    const mechanism = SECTOR_PROFILES[id].forces.find(force => force.id === 'substitutes').mechanism
    assert.ok(!mechanism.includes(oldClaim), id)
  }
})

async function profileComponent(document = {}) {
  const source = (await readFile(new URL('../src/SectorProfile.jsx', import.meta.url), 'utf8')).replace("import './SectorProfile.css'", '')
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' })
  const module = { exports: {} }
  runInNewContext(code, { module, exports: module.exports, document, require: name => name === './sectorProfiles.js' ? { SECTOR_PROFILES, PORTER_FORCES } : require(name) })
  return module.exports.default
}

test('renderização real das 43 fichas inclui perguntas, cinco forças, fontes e limites', async () => {
  const Component = await profileComponent()
  for (const topic of topics) {
    const html = renderToStaticMarkup(createElement(Component, { id: topic.id, label: topic.label }))
    assert.equal((html.match(/<li id="sector-profile-/g) ?? []).length, 5, topic.id)
    assert.equal((html.match(/<dt>/g) ?? []).length, 5, topic.id)
    assert.ok(html.includes('Hipóteses editoriais para validar'), topic.id)
    assert.ok(html.includes('Fontes de contexto e limites'), topic.id)
    assert.ok(!html.includes('undefined'), topic.id)
    assert.ok(!html.includes('NaN'), topic.id)
    if (topic.id === 'reciclagem') {
      assert.ok(html.includes('Materiais e elos: escolha o recorte'))
      assert.ok(html.includes('Insumos e serviços críticos'))
      for (const input of SECTOR_PROFILES.reciclagem.criticalInputs) {
        assert.ok(html.includes(input.label))
        assert.ok(html.includes(input.metric))
      }
    }
  }
  assert.match(renderToStaticMarkup(createElement(Component, { id: 'desconhecido' })), /ainda indisponível/)
})

test('atalho à pergunta move foco sem alterar rota e funciona repetidamente', async () => {
  const events = []
  const Component = await profileComponent({ getElementById: id => ({ focus: () => events.push(['focus', id]), scrollIntoView: () => events.push(['scroll', id]) }) })
  const tree = Component({ id: 'cobre', label: 'Cobre' })
  const nodes = []
  const walk = node => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) { node.forEach(walk); return } nodes.push(node); walk(node.props?.children) }
  walk(tree)
  const buttons = nodes.filter(node => node.type === 'button')
  assert.equal(buttons.length, SECTOR_PROFILES.cobre.sensitivePoints.length)
  for (const button of buttons) { button.props.onClick(); button.props.onClick() }
  assert.equal(events.length, buttons.length * 4)
  assert.ok(events.every(([, id]) => /^sector-profile-cobre-question-[1-5]$/.test(id)))
})

test('integração mantém navegação e B3, substitui roteiro genérico e feed antigo apenas nesta tela', async () => {
  const source = await readFile(new URL('../src/Setores.jsx', import.meta.url), 'utf8')
  assert.match(source, /<SectorProfile/)
  assert.match(source, /<SectorNews/)
  assert.match(source, /<SetoresB3/)
  assert.match(source, /const route = typeof view==='string' \? view : ''/)
  assert.ok(!source.includes('BANKING_VISIT_QUESTIONS'))
  assert.ok(!source.includes("useDataFile('temas.json')"))
  assert.ok(!source.includes('insumo.visita.map'))
})
