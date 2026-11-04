// Histórico do Focus: um ponto por semana, anos da tabela, mesclagem com o publicado e janela de 52 semanas.
import test from 'node:test'
import assert from 'node:assert/strict'
import { anosDe, arquivoHistorico, mesclar, semanaDe, semanal, ultimaData } from '../scripts/focus-history-lib.mjs'

const now = Date.parse('2026-11-04T12:00:00Z')
const row = (Indicador, Data, DataReferencia, Mediana) => ({ Indicador, Data, DataReferencia, Mediana, baseCalculo: 0 })

test('semana a semana: fica o último dia de cada semana; só os anos da tabela e os indicadores conhecidos', () => {
  assert.deepEqual(anosDe(now), ['2026', '2027'])
  assert.equal(semanaDe('2026-11-04'), '2026-11-02') // quarta -> segunda da semana
  assert.equal(semanaDe('2026-11-01'), '2026-10-26') // domingo -> segunda anterior
  const rows = [row('Selic', '2026-10-26', 2026, 12.6), row('Selic', '2026-10-30', 2026, 12.5), row('Selic', '2026-10-28', 2026, 12.55), row('Selic', '2026-11-03', 2026, 12.5),
    row('Selic', '2026-10-30', 2027, 10.5), row('Selic', '2026-10-30', 2028, 9.5), row('PIB Total', '2026-10-30', 2026, 1.7), row('IGP-M', '2026-10-30', 2026, 4), row('Câmbio', '2026-10-30', 2026, 'x')]
  const s = semanal(rows, anosDe(now))
  assert.deepEqual(s.Selic['2026'], [{ d: '2026-10-30', v: 12.5 }, { d: '2026-11-03', v: 12.5 }])
  assert.deepEqual(s.Selic['2027'], [{ d: '2026-10-30', v: 10.5 }])
  assert.equal(s.Selic['2028'], undefined)
  assert.deepEqual(s.PIB['2026'], [{ d: '2026-10-30', v: 1.7 }])
  assert.equal(s['IGP-M'], undefined)
  assert.equal(s['Câmbio'], undefined)
})

test('mesclagem: semana nova substitui a antiga, pontos velhos saem da janela, anos fora da tabela caem', () => {
  const previous = { series: { Selic: { 2026: [{ d: '2025-10-24', v: 15 }, { d: '2026-10-23', v: 12.6 }, { d: '2026-10-29', v: 12.55 }], 2025: [{ d: '2026-10-23', v: 15 }] } } }
  const novos = { Selic: { 2026: [{ d: '2026-10-30', v: 12.5 }, { d: '2026-11-03', v: 12.5 }] }, IPCA: { 2027: [{ d: '2026-11-03', v: 4.1 }] } }
  const m = mesclar(previous, novos, now)
  assert.deepEqual(m.Selic['2026'], [{ d: '2026-10-23', v: 12.6 }, { d: '2026-10-30', v: 12.5 }, { d: '2026-11-03', v: 12.5 }])
  assert.equal(m.Selic['2025'], undefined)
  assert.deepEqual(m.IPCA['2027'], [{ d: '2026-11-03', v: 4.1 }])
  assert.equal(ultimaData(m), '2026-11-03')
  assert.equal(ultimaData({}), null)
  const f = arquivoHistorico(m, now)
  assert.equal(f.semanas, 52); assert.deepEqual(f.anos, ['2026', '2027']); assert.equal(f.stale, false); assert.equal(f.series, m)
  assert.deepEqual(mesclar(null, {}, now), {})
})
