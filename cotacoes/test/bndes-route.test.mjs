import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRoute, parseRoute } from '../src/bndesRoute.js'

const ids = { tfb: ['TFB_36_30', 'TFB_60_90'], tlp: ['TLP'], tfc: ['C01', 'C02'], moedas: ['604', '143'] }

test('endereço vazio ou inválido cai no padrão: TFB 60 meses, liberação em 90 dias, 12 meses', () => {
  for (const sub of ['', undefined, 'xyz', 'tfb/NAO?p=zz', '?p=3m&x']) {
    const r = parseRoute(sub, ids)
    assert.equal(r.family, sub === '?p=3m&x' ? 'tfb' : 'tfb'); assert.equal(r.id, 'TFB_60_90'); assert.equal(r.custom, null)
  }
  assert.equal(parseRoute('', ids).preset, 12); assert.equal(parseRoute('tfb/NAO?p=zz', ids).preset, 12)
})

test('família, série e período do endereço; série de outra família ou desconhecida usa a padrão da família', () => {
  assert.deepEqual(parseRoute('tfc/C02?p=3m', ids), { family: 'tfc', id: 'C02', preset: 3, custom: null, compare: [] })
  assert.deepEqual(parseRoute('moedas/604?p=tudo', ids), { family: 'moedas', id: '604', preset: 'all', custom: null, compare: [] })
  assert.deepEqual(parseRoute('tlp/TLP?p=5a', ids), { family: 'tlp', id: 'TLP', preset: 60, custom: null, compare: [] })
  assert.equal(parseRoute('tfc/604?p=3m', ids).id, 'C01', '604 não é série da TFC')
  assert.equal(parseRoute('tfc', ids).id, 'C01')
  assert.deepEqual(parseRoute('tfc/C01?d=2026-01-02..2026-03-04', ids), { family: 'tfc', id: 'C01', preset: 12, custom: { start: '2026-01-02', end: '2026-03-04' }, compare: [] })
  assert.equal(parseRoute('tfc/C01?d=2026-03-04..2026-01-02', ids).custom, null, 'intervalo invertido é ignorado')
  assert.equal(parseRoute('tfc/C01?d=x..y&p=6m', ids).preset, 6)
})

test('buildRoute é completo e volta pelo parse; família nova sem série usa a padrão', () => {
  for (const r of [{ family: 'tfb', id: 'TFB_36_30', preset: 24, custom: null }, { family: 'moedas', id: '143', preset: 'all', custom: null }, { family: 'tfc', id: 'C02', preset: 12, custom: { start: '2026-01-02', end: '2026-03-04' } }]) {
    assert.deepEqual(parseRoute(buildRoute(r), ids), { ...r, compare: [], preset: r.custom ? 12 : r.preset })
  }
  assert.equal(buildRoute({ family: 'tlp', id: undefined, preset: 12, custom: null }), 'tlp/TLP?p=12m')
  assert.equal(buildRoute({ family: 'tfc', id: 'C02', preset: 3, custom: null, compare: [] }), 'tfc/C02?p=3m')
})

test('comparar: c=A,B,C vale com duas ou mais séries conhecidas da família; volta pelo parse', () => {
  assert.deepEqual(parseRoute('tfc/C01?p=12m&c=C01,C02', ids).compare, ['C01', 'C02'])
  assert.deepEqual(parseRoute('tfc/C01?p=12m&c=C01,NAO,C02', ids).compare, ['C01', 'C02'], 'série desconhecida é ignorada')
  assert.deepEqual(parseRoute('tfc/C01?p=12m&c=C01', ids).compare, [], 'uma só não é comparação')
  assert.deepEqual(parseRoute('tfc/C01?p=12m&c=C01,TFB_60_90', ids).compare, ['C01', 'TFB_60_90'], 'a comparação atravessa as famílias (TFC com TFB)')
  assert.deepEqual(parseRoute('tfc/C01?p=12m&c=C01,604,XYZ', ids).compare, ['C01', '604'], 'código de qualquer família vale; desconhecido é ignorado')
  assert.deepEqual(parseRoute('tfc/C01?p=12m&c=C01,C01,C02', ids).compare, ['C01', 'C02'], 'sem repetição')
  const r = { family: 'tfb', id: 'TFB_60_90', preset: 24, custom: null, compare: ['TFB_36_30', 'TFB_60_90'] }
  assert.equal(buildRoute(r), 'tfb/TFB_60_90?p=2a&c=TFB_36_30,TFB_60_90')
  assert.deepEqual(parseRoute(buildRoute(r), ids), r)
  assert.equal(buildRoute({ ...r, compare: ['TFB_36_30'] }), 'tfb/TFB_60_90?p=2a', 'menos de duas não entra no endereço')
})
