import test from 'node:test'
import assert from 'node:assert/strict'
import { BANKING_GROUPS, BANKING_TOPICS, resolveBankingTopic } from '../src/bankingSectors.js'
import { B3_CLASSIFICATION, B3_SECTORS, b3SectorFromRoute } from '../src/b3Classification.js'
import { SETORES, INSUMOS, parseSetor } from '../src/insumos.js'
import { sectorSection, sectorItems, sectorGroups, rememberSector, rememberedSector, readSectorMemory, writeSectorMemory } from '../src/setoresNavigation.js'

test('proposta bancária preserva todos os temas existentes e não se apresenta como classificação B3',()=>{
  assert.equal(BANKING_GROUPS.length,12)
  assert.equal(new Set(BANKING_TOPICS.map(topic=>topic.id)).size,BANKING_TOPICS.length)
  for(const old of SETORES) assert.ok(BANKING_TOPICS.some(topic=>topic.id===old.id&&topic.available))
  assert.equal(BANKING_TOPICS.filter(topic=>topic.available).length,SETORES.length+1)
  assert.ok(BANKING_TOPICS.some(topic=>topic.id==='reciclagem'&&topic.available))
  assert.ok(!SETORES.some(topic=>topic.id==='reciclagem'), 'novo setor não habilita o coletor legado')
  assert.ok(BANKING_TOPICS.some(topic=>topic.id==='agricultura'&&!topic.available))
  assert.ok(BANKING_TOPICS.every(topic=>topic.editorial))
  assert.equal(resolveBankingTopic('agricultura'),'agricultura')
  assert.equal(resolveBankingTopic('xyz'),null)
})
test('seções e grupos encadeados preservam escolhas sem trocar links antigos',()=>{
  let memory=rememberSector({},'veiculos-pesados')
  memory=rememberSector(memory,'telecom')
  memory=rememberSector(memory,'petroleo')
  assert.equal(sectorSection('petroleo'),'insumos')
  assert.equal(rememberedSector(memory,'setores'),'telecom')
  assert.equal(rememberedSector(memory,'setores','Indústria e transformação'),'veiculos-pesados')
  assert.equal(rememberedSector(memory,'insumos','Energia'),'petroleo')
  assert.ok(sectorGroups('setores').includes('Transportes e logística'))
  assert.deepEqual(sectorItems('insumos'),INSUMOS)
  for(const topic of [...SETORES,...INSUMOS]) assert.equal(parseSetor(topic.id),topic.id)
  assert.equal(rememberedSector({sections:{setores:'xyz'}},'setores'),BANKING_TOPICS[0].id)
})
test('memória de navegação tolera armazenamento bloqueado ou corrompido',()=>{
  assert.deepEqual(readSectorMemory({getItem:()=>'{broken'}),{})
  assert.deepEqual(readSectorMemory({getItem:()=>{throw Error('blocked')}}),{})
  assert.doesNotThrow(()=>writeSectorMemory({setItem:()=>{throw Error('blocked')}},{}))
  let saved;writeSectorMemory({setItem:(_,value)=>saved=value},rememberSector({},'cobre'))
  assert.equal(readSectorMemory({getItem:()=>saved}).active,'cobre')
})
test('B3 registra somente nomes de setores verificados, fonte e lacunas sem coleta automática',()=>{
  assert.equal(B3_SECTORS.length,11)
  assert.equal(new Set(B3_SECTORS.map(sector=>sector.id)).size,11)
  assert.equal(B3_CLASSIFICATION.coverage,'sectors-only')
  assert.equal(B3_CLASSIFICATION.checkedOn,'2026-11-05')
  assert.equal(B3_CLASSIFICATION.automaticRefresh,false)
  assert.ok(B3_CLASSIFICATION.criteriaUrl.startsWith('https://www.b3.com.br/'))
  assert.ok(B3_SECTORS.every(sector=>sector.subsectors.length===0))
  assert.equal(b3SectorFromRoute('b3/financeiro').label,'Financeiro')
  assert.equal(b3SectorFromRoute('b3/nao-validado'),null)
})
