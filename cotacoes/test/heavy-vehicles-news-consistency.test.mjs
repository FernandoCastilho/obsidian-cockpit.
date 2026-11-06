import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = name => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8')
const resumo = await source('Resumo.jsx')
const setores = await source('SetoresLegado.jsx')

// Static wiring checks complement SectorNews's rendered state/window tests.
test('Veículos pesados usa SectorNews nas duas telas, sem manchetes legadas no resumo', () => {
  for (const page of [resumo, setores]) assert.match(page, /import SectorNews from '\.\/SectorNews\.jsx'/)
  assert.match(resumo, /newsTab === 'veiculos-pesados' \? <>\s*<HeavyVehicles compact\s*\/>\s*<SectorNews id="veiculos-pesados" label="Veículos pesados"\s*\/>/)
  assert.doesNotMatch(resumo, /<TemaNoticias\s+id="veiculos-pesados"/)
  assert.match(setores, /<SectorNews key=\{`news-\$\{id\}`\} id=\{id\}/)
})

test('As duas telas atualizam a mesma fonte de manchetes e os mesmos indicadores', () => {
  assert.match(resumo, /id: 'veiculos-pesados', label: 'Veículos pesados', refresh: \['sector-news.json','heavy-vehicles.json'\]/)
  assert.match(setores, /id==='veiculos-pesados' \? \['sector-news.json','heavy-vehicles.json'\]/)
  for (const page of [resumo, setores]) assert.match(page, /import HeavyVehicles from '\.\/HeavyVehicles\.jsx'/)
})

test('A troca não remove notícias temáticas nem refresh das demais abas', () => {
  assert.match(resumo, /<TemaNoticias id="eleicoes-eua" simples\s*\/>/)
  assert.match(resumo, /id: 'eleicoes', label: 'Eleições EUA', refresh: \['temas.json'\]/)
  assert.match(resumo, /id: 'moedas', label: 'Moedas', refresh: \['temas.json'\]/)
})
