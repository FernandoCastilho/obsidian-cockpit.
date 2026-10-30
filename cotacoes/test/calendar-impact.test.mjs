import test from 'node:test'
import assert from 'node:assert/strict'
import { explicarEvento, CATEGORIAS, LIGACAO_PAIS, NIVEL } from '../src/calendarImpact.js'
import { COUNTRIES } from '../src/calendar.js'
import { readFileSync } from 'node:fs'

const ev = (title, country = 'US', impact = 'high') => ({ title, country, impact })
test('classifica títulos em inglês (Forex Factory) e em português (fontes oficiais)', () => {
  const casos = [
    ['CPI m/m', 'Inflação ao consumidor'], ['Core CPI y/y', 'Inflação ao consumidor'], ['CPI: inflação ao consumidor (EUA)', 'Inflação ao consumidor'], ['IPCA (previsto)', 'Inflação ao consumidor'],
    ['PPI: inflação ao produtor (EUA)', 'Preços ao produtor e importação'], ['Non-Farm Employment Change', 'Emprego e salários'], ['Payroll e taxa de desemprego (EUA)', 'Emprego e salários'], ['Unemployment Claims', 'Emprego e salários'],
    ['Main Refinancing Rate', 'Decisão de juros'], ['FOMC: decisão de juros do Fed', 'Decisão de juros'], ['Copom: decisão da Selic', 'Decisão de juros'], ['FOMC Press Conference', 'Decisão de juros'],
    ['FOMC Meeting Minutes', 'Ata ou discurso de autoridade'], ['Fed Chair Powell Speaks', 'Ata ou discurso de autoridade'],
    ['GDP q/q', 'PIB'], ['PIB do trimestre, 1ª estimativa (EUA)', 'PIB'], ['ISM Manufacturing PMI', 'Atividade e confiança (PMI, sondagens)'], ['Caixin Manufacturing PMI', 'Atividade e confiança (PMI, sondagens)'],
    ['Retail Sales m/m', 'Consumo e produção'], ['Trade Balance', 'Comércio exterior'], ['Crude Oil Inventories', 'Petróleo e energia'], ['Building Permits', 'Mercado imobiliário'], ['30-y Bond Auction', 'Leilão de títulos'], ['Boletim Focus', 'Boletim Focus'],
  ]
  for (const [t, nome] of casos) assert.equal(explicarEvento(ev(t)).nome, nome, t)
})
test('feriado vira aviso de liquidez menor, qualquer que seja o título', () => {
  const x = explicarEvento(ev('Bank Holiday', 'US', 'holiday'))
  assert.equal(x.nome, 'Feriado bancário'); assert.match(x.economia, /liquidez/i)
  assert.equal(explicarEvento(ev('Qualquer coisa', 'JP', 'holiday')).nome, 'Feriado bancário')
})
test('evento sem categoria mapeada: impacto baixo, sem explicação inventada', () => {
  const x = explicarEvento(ev('Evento exótico sem categoria', 'AU', 'low'))
  assert.equal(x.mapeado, false); assert.equal(x.nivel, 'low'); assert.equal(x.nome, null); assert.equal(x.oque, null)
  assert.match(x.economia, /Impacto baixo/); assert.match(x.brasil, /Impacto baixo/)
  assert.equal(explicarEvento(ev('Evento exótico', 'CN', 'high')).nivelFonte, 'high', 'guarda a classificação da fonte para avisar da diferença')
})
test('todo evento mapeado traz o que é, efeito na economia e ligação com o Brasil, por país', () => {
  for (const c of CATEGORIAS) { assert.ok(c.nome.length >= 3, c.id); for (const k of ['oque', 'economia', 'brasil']) assert.ok(c[k].length > 25, `${c.id}.${k}`) }
  for (const { id } of COUNTRIES) assert.ok(LIGACAO_PAIS[id].length > 25, `país ${id} sem ligação com o Brasil`)
  const us = explicarEvento(ev('CPI m/m', 'US')), br = explicarEvento(ev('IPCA (previsto)', 'BR')), cn = explicarEvento(ev('Caixin Manufacturing PMI', 'CN', 'medium'))
  assert.match(us.brasil, /EUA/); assert.match(cn.brasil, /China/); assert.match(br.brasil, /DI/); assert.doesNotMatch(br.brasil, /EUA/)
  assert.equal(us.nivel, 'high'); assert.equal(NIVEL.medium, 'Médio')
})
test('a tela do calendário mostra o balão em cada evento', () => {
  const src = readFileSync(new URL('../src/Calendario.jsx', import.meta.url), 'utf8')
  assert.ok(src.includes('<EventHelp e={e} />') && src.includes('explicarEvento'))
})
