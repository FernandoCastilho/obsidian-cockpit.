import test from 'node:test'
import assert from 'node:assert/strict'
import { acessosFile, parseAtivos, parseDias } from '../scripts/acessos-lib.mjs'

test('acessos: lê visitantes ativos nas formas v2 e v3 do Umami', () => {
  assert.equal(parseAtivos({ visitors: 3 }), 3)
  assert.equal(parseAtivos([{ x: 2 }]), 2)
  assert.equal(parseAtivos({ x: '4' }), 4)
  assert.equal(parseAtivos({}), null)
})
test('acessos: por dia, soma de hoje e dos 7 dias, e retenção do anterior em falha', () => {
  const dias = parseDias({ pageviews: [{ x: '2026-11-02 00:00:00', y: 10 }, { x: '2026-11-03 00:00:00', y: 25 }], sessions: [{ x: '2026-11-02 00:00:00', y: 4 }, { x: '2026-11-03 00:00:00', y: 9 }] })
  assert.deepEqual(dias, [{ d: '2026-11-02', visitantes: 4, views: 10 }, { d: '2026-11-03', visitantes: 9, views: 25 }])
  const f = acessosFile({ online: 2, dias, now: Date.parse('2026-11-03T16:00:00Z') })
  assert.equal(f.hoje.visitantes, 9); assert.equal(f.semana.visitantes, 13); assert.equal(f.semana.views, 35); assert.equal(f.stale, false)
  const r = acessosFile({ online: null, dias: [], now: 2, erro: 'HTTP 401', anterior: f })
  assert.equal(r.stale, true); assert.equal(r.online, 2); assert.equal(r.erro, 'HTTP 401')
})
