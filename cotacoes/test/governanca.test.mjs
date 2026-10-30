import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { ATRASO_H, CRONS, FONTES, NAVEGADOR, REGRAS, RESUMO } from '../src/governanca.js'

const yml = (f) => readFileSync(new URL(`../../.github/workflows/${f}`, import.meta.url), 'utf8')
const config = readFileSync(new URL('../src/Config.jsx', import.meta.url), 'utf8')

test('os horários descritos na governança existem nos workflows (e vice-versa)', () => {
  for (const [file, key] of [['pages.yml', 'pages'], ['quotes.yml', 'quotes']]) {
    const found = [...yml(file).matchAll(/- cron: '([^']+)'/g)].map((m) => m[1])
    assert.deepEqual([...found].sort(), [...CRONS[key]].sort(), `${file}: agendamentos mudaram; atualize CRONS e os textos de src/governanca.js`)
  }
})
test('cada prazo de atraso vem de ATRASO_H e a tela de Configurações usa só ele', () => {
  for (const k of Object.keys(ATRASO_H)) assert.ok(config.includes(k.includes('-') ? `ATRASO_H['${k}']` : `ATRASO_H.${k}`), `Config.jsx não usa ATRASO_H de ${k}`)
  const fixos = [...config.matchAll(/maxAge: (\d+) \* H/g)]
  assert.equal(fixos.length, 0, 'prazo fixo em Configurações: mova para ATRASO_H')
})
test('a tabela de governança cobre todas as fontes de "Estado dos dados", sem repetir', () => {
  const chaves = FONTES.flatMap((f) => f.chaves)
  assert.equal(new Set(chaves).size, chaves.length, 'fonte em duas linhas')
  assert.deepEqual([...chaves].sort(), ['quotes', ...Object.keys(ATRASO_H)].sort())
  assert.equal(new Set(FONTES.map((f) => f.id)).size, FONTES.length)
  for (const f of FONTES) {
    assert.ok(f.nome && f.origem && f.coleta.length > 5 && f.muda.length > 5 && f.atraso, f.id)
    const horas = f.chaves.filter((k) => k !== 'quotes').map((k) => ATRASO_H[k])
    assert.ok(horas.every((h) => h === horas[0]), `${f.id}: fontes da mesma linha com prazos diferentes`)
    if (horas.length) assert.equal(f.atraso, `${horas[0]} h`)
  }
})
test('texto do navegador e regras usam as constantes do código', () => {
  assert.match(NAVEGADOR[0], /a cada 1 min/)
  assert.match(NAVEGADOR[1], /a cada 10 min/)
  assert.match(NAVEGADOR[2], /1 a cada 60 s e 30 por dia/)
  assert.ok(REGRAS.length >= 4 && REGRAS.every((r) => r.length > 30))
})

test('resumo: o câmbio é o único de 5 em 5 minutos e coletar não é o dado mudar', () => {
  assert.equal(RESUMO.length, 3)
  assert.match(RESUMO[0], /Só o câmbio[\s\S]*5 em 5 minutos[\s\S]*pregão/)
  assert.match(RESUMO[1], /de hora em hora/)
  assert.match(RESUMO[2], /Coletar não é o mesmo que o número mudar/)
  // o resumo cita o que a tabela diz: o câmbio é a única fonte de 5 em 5 minutos
  assert.deepEqual(FONTES.filter((f) => /5 min/.test(f.coleta)).map((f) => f.id), ['cambio'])
})
