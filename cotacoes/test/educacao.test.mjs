import assert from 'node:assert/strict'
import test from 'node:test'
import { CONCEITOS, CONEXAO, cupomCambial, custoMedio, jurosAnuais, jurosDeUmDia, premioCds } from '../src/educacao.js'
import { DESK_TABS, parseCommand } from '../src/terminal.js'

const byId = (id) => CONCEITOS.find((c) => c.id === id)
const text = (c) => JSON.stringify(c)

test('os cinco conceitos pedidos existem, com ids únicos', () => {
  assert.deepEqual(CONCEITOS.map((c) => c.id), ['cupom-cambial', 'sofr', 'euribor', 'custo-de-funding', 'cds'])
  assert.equal(new Set(CONCEITOS.map((c) => c.id)).size, CONCEITOS.length)
})

test('cada conceito traz frase, explicação simples, lacunas, versão precisa, exemplo e teste', () => {
  for (const c of CONCEITOS) {
    assert.ok(c.frase.length > 30, c.id)
    assert.ok(c.crianca.length >= 2 && c.crianca.every((p) => p.length > 40), c.id)
    assert.ok(c.analogia.length > 20, c.id)
    assert.ok(c.lacunas.length >= 2, c.id)
    assert.ok(c.preciso.texto.length > 40 && c.preciso.formula.length > 5, c.id)
    assert.ok(c.exemplo.passos.length >= 2 && c.exemplo.resultado.length > 10, c.id)
    assert.ok(c.noApp.texto.length > 10 && ['juros'].includes(c.noApp.tab), c.id)
    assert.ok(c.teste.pergunta.endsWith('?') && c.teste.resposta.length > 20, c.id)
  }
  assert.equal(CONEXAO.itens.length, 4)
})

test('contas dos exemplos', () => {
  assert.ok(Math.abs(cupomCambial({ spot: 5, futuro: 5.5, di: 0.14 }) - 0.0363636) < 1e-6)
  assert.ok(Math.abs(cupomCambial({ spot: 5, futuro: 5.25, di: 0.14 }) - 0.0857143) < 1e-6)
  assert.ok(Math.abs(jurosDeUmDia(1_000_000, 0.043) - 119.4444) < 1e-3)
  assert.equal(jurosAnuais(200_000, 0.03, 0.01), 8000)
  assert.ok(Math.abs(custoMedio([{ valor: 60, custo: 0.14 }, { valor: 30, custo: 0.13 }, { valor: 10, custo: 0 }]) - 0.123) < 1e-12)
  assert.equal(premioCds(10_000_000, 200), 200_000)
  assert.ok(Number.isNaN(custoMedio([])))
})

test('o texto exibido traz os mesmos números das contas', () => {
  assert.match(text(byId('cupom-cambial').exemplo), /3,64%/)
  assert.match(text(byId('cupom-cambial').exemplo), /8,57%/)
  assert.match(text(byId('sofr').exemplo), /119,44/)
  const eur = text(byId('euribor').exemplo)
  assert.match(eur, /€ 8\.000/)
  assert.match(eur, /€ 10\.000/)
  assert.match(eur, /€ 2\.000/)
  const fund = text(byId('custo-de-funding').exemplo)
  assert.match(fund, /12,3%/)
  assert.match(fund, /5,7 p\.p\./)
  const cds = text(byId('cds').exemplo)
  assert.match(cds, /US\$ 200\.000/)
  assert.match(cds, /2,00%/)
})

test('cupom cambial: dólar futuro maior com o mesmo DI reduz o cupom (resposta do teste)', () => {
  const base = cupomCambial({ spot: 5, futuro: 5.5, di: 0.14 })
  assert.ok(cupomCambial({ spot: 5, futuro: 5.8, di: 0.14 }) < base)
  assert.match(byId('cupom-cambial').teste.resposta, /^Cai\./)
})

test('o app não afirma ter dados que não tem (Euribor e CDS)', () => {
  assert.match(byId('euribor').noApp.texto, /não exibe a Euribor/)
  assert.match(byId('cds').noApp.texto, /não exibe CDS/)
})

test('aba Aprender: comandos levam ao conceito certo e há 8 abas no terminal', () => {
  assert.deepEqual(DESK_TABS.map((t) => t.id), ['resumo', 'juros', 'cenarios', 'noticias', 'calculadora', 'feriados', 'aprender', 'config'])
  assert.deepEqual(parseCommand('cds'), { kind: 'tab', id: 'aprender', sub: 'cds' })
  assert.deepEqual(parseCommand('Cupom Cambial'), { kind: 'tab', id: 'aprender', sub: 'cupom-cambial' })
  assert.deepEqual(parseCommand('euribor'), { kind: 'tab', id: 'aprender', sub: 'euribor' })
  assert.deepEqual(parseCommand('funding'), { kind: 'tab', id: 'aprender', sub: 'custo-de-funding' })
  assert.deepEqual(parseCommand('educação'), { kind: 'tab', id: 'aprender', sub: '' })
  assert.deepEqual(parseCommand('sofr'), { kind: 'tab', id: 'juros', sub: '' })
})
