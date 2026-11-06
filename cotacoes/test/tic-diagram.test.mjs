import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { publicAgencySources } from '../src/sectorSourceVisibility.js'
import { TIC_STUDY } from '../src/ticStudy.js'
const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
test('diagrama preserva cadeia, opcionalidade e sequência de caixa aprovada', () => {
  const jsx = source('TechnologyIntegrationDiagram.jsx')
  for (const label of ['Fabricantes e plataformas', 'Distribuidores', 'quando envolvidos', 'Diagnóstico', 'Desenho', 'Aquisição e configuração', 'Implantação', 'quando contratados', 'Clientes', 'Contratação direta', 'Entrega e aceite', 'Faturamento', 'Recebimento', 'variam conforme o contrato']) assert.ok(jsx.includes(label), label)
  assert.match(jsx, /<figure[^>]+aria-labelledby=/)
  assert.match(jsx, /<figcaption/)
  assert.match(jsx, /<ol>/)
  assert.match(source('SectorStudy.jsx'), /section.id === 'negocio' && <TechnologyIntegrationDiagram/)
  assert.match(source('TechnologyIntegrationDiagram.css'), /@container\(max-width:540px\)/)
})
test('referências visíveis apenas de órgãos públicos sem apagar proveniência', () => {
  assert.deepEqual(publicAgencySources(TIC_STUDY.sources).map(s => new URL(s.url).hostname).sort(), ['www.gov.br', 'www.gov.il', 'www.ibge.gov.br'])
  assert.equal(publicAgencySources([{ url: 'https://gov.br.example.com' }, { url: 'not-url' }]).length, 0)
  assert.equal(publicAgencySources().length, 0)
  assert.ok(TIC_STUDY.charts.every(c => c.source.url))
  assert.ok(TIC_STUDY.sources.some(s => s.url.includes('brasscom')))
  for (const chart of TIC_STUDY.charts) assert.doesNotMatch(chart.method, /Brasscom|IDC|Cetic/i)
  const jsx = source('SectorStudy.jsx')
  assert.match(jsx, /publicAgencySources\(section.sources\)/)
  assert.match(jsx, /publicAgencySources\(study.sources\)/)
  assert.match(jsx, /publicAgencySources\(\[chart.source\]\)/)
})
