import assert from 'node:assert/strict'
import test from 'node:test'
import { TABLES, JOURNAL_HEADERS } from '../src/journal.js'
import { installRequests, viewFormula, VIEW_TITLES } from '../src/journalSheets.js'

const setup = { journalId: 101, lancamentosViewId: 102, fixasViewId: 103, sourceSheetIds: { Lancamentos: 6, ContasFixas: 15 }, sourceRowCounts: { Lancamentos: 5000, ContasFixas: 200 } }
const writeTarget = (r) => r.addSheet?.properties.sheetId ?? r.updateCells?.range.sheetId ?? r.repeatCell?.range.sheetId ?? r.updateDimensionProperties?.range.sheetId ?? r.addProtectedRange?.protectedRange.range.sheetId ?? r.copyPaste?.destination.sheetId

test('instalação escreve só nas três novas abas e não preenche o corpo do diário', () => {
  const requests = installRequests(setup)
  assert.ok(requests.every((r) => Object.keys(r).length === 1))
  assert.ok(requests.every((r) => [101, 102, 103].includes(writeTarget(r))))
  assert.deepEqual(requests.filter((r) => r.addSheet).map((r) => r.addSheet.properties.sheetId), [101, 102, 103])
  const journal = requests.filter((r) => r.updateCells?.range.sheetId === 101)
  assert.equal(journal.length, 1)
  assert.equal(journal[0].updateCells.range.startRowIndex, 0)
  assert.deepEqual(journal[0].updateCells.rows[0].values.map((v) => v.userEnteredValue.stringValue), JOURNAL_HEADERS)
  assert.ok(journal[0].updateCells.rows[0].values.every((v) => !v.userEnteredValue.formulaValue))
  assert.equal(requests.find((r) => r.addSheet?.properties.sheetId === 101).addSheet.properties.hidden, true)
  assert.equal(requests.find((r) => r.addProtectedRange?.protectedRange.range.sheetId === 101).addProtectedRange.protectedRange.warningOnly, true)
})
test('diário existente é preservado e nenhuma operação o reescreve', () => {
  const requests = installRequests({ ...setup, journalExists: true })
  assert.ok(requests.every((r) => [102, 103].includes(writeTarget(r))))
  assert.equal(requests.filter((r) => r.addSheet).length, 2)
})
test('visões mantêm cabeçalhos, status, referência e meta separada em P6', () => {
  const requests = installRequests(setup)
  for (const [aba, id] of [['Lancamentos', 102], ['ContasFixas', 103]]) {
    const sheet = requests.find((r) => r.addSheet?.properties.sheetId === id).addSheet.properties
    assert.equal(sheet.title, VIEW_TITLES[aba])
    assert.equal(sheet.gridProperties.frozenRowCount, 1)
    const header = requests.find((r) => r.updateCells?.range.sheetId === id && r.updateCells.range.startRowIndex === 0).updateCells
    assert.deepEqual(header.rows[0].values.map((v) => v.userEnteredValue.stringValue), [...TABLES[aba].headers, 'caixa_estado', 'caixa_referencia'])
    const formula = requests.find((r) => r.updateCells?.range.sheetId === id && r.updateCells.range.startRowIndex === 1).updateCells
    assert.equal(formula.rows.length, 1)
    assert.equal(formula.rows[0].values.length, 1)
    assert.ok(formula.rows[0].values[0].userEnteredValue.formulaValue.startsWith('=LET('))
  }
  const meta = requests.find((r) => r.updateCells?.range.sheetId === 103 && r.updateCells.range.startColumnIndex === 15).updateCells
  assert.equal(meta.range.startRowIndex, 5)
  assert.equal(meta.rows[0].values[0].userEnteredValue.formulaValue, "='ContasFixas'!P6")
})
test('fórmulas usam IDs exatos, contexto vetorial completo e referências abertas', () => {
  for (const aba of ['Lancamentos', 'ContasFixas']) {
    const formula = viewFormula(aba, { period: '2026-11' })
    assert.ok(formula.includes('LOOKUP(2;ARRAYFORMULA(1/(scope*'))
    assert.ok(formula.includes('LET(scope;ARRAYFORMULA('))
    assert.ok(!formula.includes('TO_TEXT('), 'comparação numérica não depende da formatação da origem')
    assert.ok(formula.includes("EXACT('Caixa_Operacoes'!C2:C;identity)"))
    assert.ok(formula.includes("EXACT('Caixa_Operacoes'!B2:B;"))
    assert.ok(formula.includes("EXACT('Caixa_Operacoes'!D2:D;"))
    assert.ok(formula.includes("'Caixa_Operacoes'!A2:AX"))
    assert.ok(formula.includes(aba === 'Lancamentos' ? "'Lancamentos'!A2:S" : "'ContasFixas'!A2:M"))
    assert.ok(formula.includes('REDUCE(') && formula.includes('VSTACK('))
    assert.ok(formula.includes('FONTE_AUSENTE') && formula.includes('CONFLITO EXTERNO'))
    assert.ok(formula.includes('COUNTBLANK(INDEX(') && formula.includes('TYPE(INDEX('))
  }
})
test('aliases de ensaio alteram só referências de origem e escapam apóstrofos', () => {
  const formula = viewFormula('ContasFixas', { sourceTitles: { ContasFixas: "_Teste'Fixas" } })
  assert.ok(formula.includes("'_Teste''Fixas'!A2:M"))
  assert.ok(formula.includes('"ContasFixas"'))
  const requests = installRequests({ ...setup, sourceTitles: { ContasFixas: '_Teste_ContasFixas' } })
  const meta = requests.find((r) => r.updateCells?.range.sheetId === 103 && r.updateCells.range.startColumnIndex === 15)
  assert.equal(meta.updateCells.rows[0].values[0].userEnteredValue.formulaValue, "='_Teste_ContasFixas'!P6")
})
test('parâmetros inválidos não podem gerar pedido que atinja a origem', () => {
  assert.throws(() => installRequests({ ...setup, journalId: 6 }), /origem/)
  assert.throws(() => installRequests({ ...setup, fixasViewId: 102 }), /repetidos/)
  assert.throws(() => installRequests({ ...setup, journalRows: 0 }), /inválido/)
  assert.throws(() => viewFormula('Outras'), /permitida/)
  assert.throws(() => viewFormula('ContasFixas', { period: '2026-13' }), /Período/)
  assert.throws(() => viewFormula('Lancamentos', { locale: 'xx_YY' }), /Locale/)
  assert.throws(() => viewFormula('Lancamentos', { sourceTitles: { Lancamentos: 'Caixa_Operacoes' } }), /circular/)
})
