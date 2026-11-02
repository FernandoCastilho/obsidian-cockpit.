import { TABLES, JOURNAL_TITLE, JOURNAL_HEADERS } from './journal.js'

export const VIEW_TITLES = Object.freeze({ Lancamentos: 'Caixa_Lancamentos', ContasFixas: 'Caixa_ContasFixas' })
export const VIEW_EXTRA_HEADERS = Object.freeze(['caixa_estado', 'caixa_referencia'])
const integer = (n, name, min = 0) => { if (!Number.isInteger(n) || n < min) throw new TypeError(`${name} inválido.`); return n }
const title = (s) => { if (typeof s !== 'string' || !s.trim() || s.length > 100) throw new TypeError('Nome da aba inválido.'); return s }
const qs = (s) => `'${title(s).replaceAll("'", "''")}'`
const txt = (s) => `"${String(s).replaceAll('"', '""')}"`
const col = (index) => { let n = index, s = ''; while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26) } return s }
function syntax(locale) {
  const normalized = locale.replace('-', '_')
  if (!['pt_BR', 'en_US', 'en_GB'].includes(normalized)) throw new TypeError('Locale de fórmula não homologado.')
  const sep = normalized === 'pt_BR' ? ';' : ','
  return (name, ...args) => `${name}(${args.join(sep)})`
}
const rowRange = (sheetId, row, width) => ({ sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: 0, endColumnIndex: width })
const headerRequest = (sheetId, headers) => ({ updateCells: { range: rowRange(sheetId, 0, headers.length), rows: [{ values: headers.map((value) => ({ userEnteredValue: { stringValue: value } })) }], fields: 'userEnteredValue' } })

// A visão não grava na origem. As referências abertas acompanham o crescimento das fontes e do diário.
export function viewFormula(aba, options = {}) {
  const table = TABLES[aba]
  if (!table) throw new TypeError('Aba-base não permitida.')
  const { locale = 'pt_BR', sourceTitles = {}, journalTitle = JOURNAL_TITLE, period } = options
  const sourceTitle = sourceTitles[aba] ?? aba
  if (sourceTitle === journalTitle || Object.values(VIEW_TITLES).includes(sourceTitle)) throw new TypeError('Fonte circular ou reservada.')
  if (period !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new TypeError('Período inválido.')
  const f = syntax(locale), width = table.headers.length
  const src = `${qs(sourceTitle)}!A2:${col(width)}`, srcHeader = `${qs(sourceTitle)}!A1:${col(width)}1`
  const jq = qs(journalTitle), jtab = `${jq}!A2:AX`, jheader = `${jq}!A1:AX1`
  const jop = `${jq}!A2:A`, jaba = `${jq}!B2:B`, jid = `${jq}!C2:C`, jperiod = `${jq}!D2:D`, jaccepted = `${jq}!L2:L`
  const jafter = `${jq}!M2:AE`, jbase = `${jq}!AF2:AX`
  const targetPeriod = aba === 'Lancamentos' ? txt('*') : period ? txt(period) : f('TEXT', f('TODAY'), txt('yyyy-mm'))
  const index = (range, row, column) => f('INDEX', range, row, column)
  const value = (range, row, column) => { const ref = index(range, row, column); return f('IF', `${f('COUNTBLANK', ref)}>0`, txt(''), ref) }
  const validId = (id) => f('IFERROR', f('AND', `${f('TYPE', id)}=2`, `${f('LEN', f('TRIM', id))}>0`, f('EXACT', id, f('TRIM', id))), 'FALSE')
  const matches = (a, b) => f('ARRAYFORMULA', f('N', f('EXACT', a, b)))
  const invalid = f('MAKEARRAY', '1', String(width + 2), f('LAMBDA', 'invalidrow', 'invalidcol', f('IF', `invalidcol=${width + 1}`, txt('ESTRUTURA INVÁLIDA'), f('NA'))))
  const occupied = (range, size) => f('MAP', f('SEQUENCE', f('ROWS', range)), f('LAMBDA', 'position', `${f('COUNTBLANK', index(range, 'position', '0'))}<${size}`))
  const srcMask = occupied(src, width), jMask = occupied(jtab, 50)
  const srcCount = f('SUM', f('ARRAYFORMULA', f('N', 'srcmask'))), jCount = f('SUM', f('ARRAYFORMULA', f('N', 'jmask')))
  const srcPositions = f('IF', 'srccount>0', f('FILTER', f('SEQUENCE', f('ROWS', src)), 'srcmask'), '0')
  const jPositions = f('IF', 'jcount>0', f('FILTER', f('SEQUENCE', f('ROWS', jtab)), 'jmask'), '0')
  const sourceIds = f('IF', 'srccount>0', f('MAP', 'srcpositions', f('LAMBDA', 'position', value(src, 'position', '1'))), txt(''))
  const sourceBad = f('IF', 'srccount=0', 'FALSE', f('IFERROR', f('OR',
    `${f('SUM', f('MAP', 'sourceids', f('LAMBDA', 'identity', f('IF', validId('identity'), '0', '1'))))}>0`,
    `${f('MAX', f('MAP', 'sourceids', f('LAMBDA', 'identity', f('SUM', matches('sourceids', 'identity')))))}>1`,
  ), 'TRUE'))
  const validJournalRow = f('IFERROR', f('AND',
    validId(index(jtab, 'position', '1')),
    f('OR', f('EXACT', index(jtab, 'position', '2'), txt('Lancamentos')), f('EXACT', index(jtab, 'position', '2'), txt('ContasFixas'))),
    validId(index(jtab, 'position', '3')),
    `${f('TYPE', index(jtab, 'position', '4'))}=2`,
    f('OR', `${f('COUNTBLANK', index(jtab, 'position', '5'))}>0`, `${f('TYPE', index(jtab, 'position', '5'))}=2`),
    ...[6, 7, 8, 9, 10].map((c) => `${f('TYPE', index(jtab, 'position', String(c)))}=2`),
    `${f('TYPE', index(jtab, 'position', '11'))}=1`,
    `${index(jtab, 'position', '11')}=1`,
    `${f('TYPE', index(jtab, 'position', '12'))}=4`,
  ), 'FALSE')
  const journalBad = f('IF', 'jcount=0', 'FALSE', f('OR', `${f('MAX', 'jpositions')}<>jcount`,
    `${f('SUM', f('MAP', 'jpositions', f('LAMBDA', 'position', f('IF', validJournalRow, '0', '1'))))}>0`))
  const headersOkay = f('AND',
    f('IFERROR', f('EXACT', f('TEXTJOIN', txt('|'), 'FALSE', srcHeader), txt(table.headers.join('|'))), 'FALSE'),
    f('IFERROR', f('EXACT', f('TEXTJOIN', txt('|'), 'FALSE', jheader), txt(JOURNAL_HEADERS.join('|'))), 'FALSE'))
  const scope = f('ARRAYFORMULA', `${matches(jaba, txt(aba))}*${matches(jperiod, targetPeriod)}*${f('ARRAYFORMULA', f('N', `${jaccepted}=TRUE`))}`)
  const historicalIds = f('IF', 'historycount>0', f('FILTER', jid, 'scope'), txt(''))
  const unionIds = f('REDUCE', 'sourceids', 'historyids', f('LAMBDA', 'accumulator', 'identity',
    f('IF', f('OR', `${f('LEN', 'identity')}=0`, `${f('SUM', matches('accumulator', 'identity'))}>0`), 'accumulator', f('VSTACK', 'accumulator', 'identity'))))
  const allIds = f('FILTER', 'unionids', `${f('LEN', 'unionids')}>0`)
  const sourceIndexes = f('MAP', 'identities', f('LAMBDA', 'identity', f('IFNA', f('MATCH', 'TRUE', f('ARRAYFORMULA', f('EXACT', 'sourceids', 'identity')), '0'), '0')))
  // O ARRAYFORMULA envolve o quociente inteiro; sem isso LOOKUP pode avaliar só o primeiro elemento.
  const latestIndexes = f('MAP', 'identities', f('LAMBDA', 'identity', f('IFNA',
    f('LOOKUP', '2', f('ARRAYFORMULA', `1/(scope*${matches(jid, 'identity')})`), f('SEQUENCE', f('ROWS', jop))), '0')))
  const sourceIndexFor = (row) => f('IF', `${index('sourceindexes', row, '1')}>0`, index('srcpositions', index('sourceindexes', row, '1'), '1'), '0')
  const sameSourceCell = (sourceRow, journalRow, column) => {
    const a = index(src, sourceRow, column), b = index(jbase, journalRow, column)
    return f('OR', f('AND', `${f('COUNTBLANK', a)}>0`, `${f('COUNTBLANK', b)}>0`),
      f('AND', `${f('COUNTBLANK', a)}=0`, `${f('COUNTBLANK', b)}=0`, `${f('TYPE', a)}=${f('TYPE', b)}`, f('IF', f('TYPE', a) + '=2', f('EXACT', a, b), a + '=' + b)))
  }
  const states = f('MAP', f('SEQUENCE', f('ROWS', 'identities')), f('LAMBDA', 'recordindex', f('LET',
    'sourceindex', sourceIndexFor('recordindex'),
    'lastindex', index('latestindexes', 'recordindex', '1'),
    f('IF', 'sourceindex=0', txt('FONTE_AUSENTE'), f('IF', 'lastindex=0', txt('ORIGEM'),
      f('IF', `${f('SUM', f('MAP', f('SEQUENCE', String(width)), f('LAMBDA', 'fieldindex', f('N', sameSourceCell('sourceindex', 'lastindex', 'fieldindex')))))}=${width}`, txt('CONFIRMADO'), txt('CONFLITO EXTERNO')))),
  )))
  const output = f('MAKEARRAY', f('ROWS', 'identities'), String(width + 2), f('LAMBDA', 'recordindex', 'fieldindex', f('LET',
    'lastindex', index('latestindexes', 'recordindex', '1'),
    'sourceindex', sourceIndexFor('recordindex'),
    f('IF', `fieldindex<=${width}`,
      f('IF', 'lastindex>0', value(jafter, 'lastindex', 'fieldindex'), value(src, 'sourceindex', 'fieldindex')),
      f('IF', `fieldindex=${width + 1}`, index('states', 'recordindex', '1'), f('IF', 'lastindex>0', index(jop, 'lastindex', '1'), txt('')))),
  )))
  const goodOutput = f('LET',
    'scope', scope,
    'historycount', f('SUM', 'scope'),
    f('IF', 'srccount+historycount=0', txt(''), f('LET',
      'historyids', historicalIds,
      'unionids', unionIds,
      'identities', allIds,
      'sourceindexes', sourceIndexes,
      'latestindexes', latestIndexes,
      'states', states,
      output,
    )))
  return `=${f('LET',
    'srcmask', srcMask, 'srccount', srcCount, 'srcpositions', srcPositions, 'sourceids', sourceIds,
    'jmask', jMask, 'jcount', jCount, 'jpositions', jPositions,
    'sourcebad', sourceBad, 'journalbad', journalBad, 'headersok', headersOkay,
    f('IF', f('OR', f('NOT', 'headersok'), 'sourcebad', 'journalbad'), invalid, goodOutput),
  )}`
}

// Inicialização não apaga dados: só cria abas novas. journalExists preserva o diário já existente.
export function installRequests(options = {}) {
  const { journalId, lancamentosViewId, fixasViewId, sourceRowCounts = {}, sourceTitles = {},
    sourceSheetIds = {}, journalRows = 1000, journalExists = false, locale = 'pt_BR' } = options
  const ids = [integer(journalId, 'journalId'), integer(lancamentosViewId, 'lancamentosViewId'), integer(fixasViewId, 'fixasViewId')]
  if (new Set(ids).size !== ids.length) throw new TypeError('IDs de instalação repetidos.')
  syntax(locale)
  for (const sourceId of Object.values(sourceSheetIds)) { integer(sourceId, 'ID da origem'); if (ids.includes(sourceId)) throw new TypeError('Destino coincide com a origem.') }
  integer(journalRows, 'journalRows', 2)
  const requests = [], viewIds = { Lancamentos: lancamentosViewId, ContasFixas: fixasViewId }
  if (!journalExists) requests.push(
    { addSheet: { properties: { sheetId: journalId, title: JOURNAL_TITLE, hidden: true, gridProperties: { rowCount: journalRows, columnCount: 50, frozenRowCount: 1 } } } },
    headerRequest(journalId, JOURNAL_HEADERS),
    { addProtectedRange: { protectedRange: {
      range: { sheetId: journalId }, description: 'Área reservada do Caixa. Não ordenar, apagar ou editar manualmente.',
      warningOnly: true,
    } } },
  )
  for (const aba of ['Lancamentos', 'ContasFixas']) {
    const headers = [...TABLES[aba].headers, ...VIEW_EXTRA_HEADERS]
    const sourceRows = integer(sourceRowCounts[aba] ?? (aba === 'Lancamentos' ? 5000 : 200), `Linhas de ${aba}`, 2)
    const rowCount = sourceRows + journalRows + 1, columnCount = Math.max(headers.length, aba === 'ContasFixas' ? 16 : headers.length)
    const sheetId = viewIds[aba]
    requests.push({ addSheet: { properties: { sheetId, title: VIEW_TITLES[aba], gridProperties: { rowCount, columnCount, frozenRowCount: 1 } } } })
    if (sourceSheetIds[aba] !== undefined) requests.push({ copyPaste: {
      source: { sheetId: sourceSheetIds[aba], startRowIndex: 0, endRowIndex: sourceRows, startColumnIndex: 0, endColumnIndex: TABLES[aba].headers.length },
      destination: { sheetId, startRowIndex: 0, endRowIndex: sourceRows, startColumnIndex: 0, endColumnIndex: TABLES[aba].headers.length },
      pasteType: 'PASTE_FORMAT', pasteOrientation: 'NORMAL',
    } })
    requests.push(
      headerRequest(sheetId, headers),
      { updateCells: { range: rowRange(sheetId, 1, 1), rows: [{ values: [{ userEnteredValue: { formulaValue: viewFormula(aba, { sourceTitles, locale }) } }] }], fields: 'userEnteredValue' } },
      { repeatCell: { range: { ...rowRange(sheetId, 0, headers.length), startColumnIndex: sourceSheetIds[aba] === undefined ? 0 : TABLES[aba].headers.length }, cell: { userEnteredFormat: {
        backgroundColor: { red: 0.92, green: 0.92, blue: 0.92 },
        textFormat: { bold: true, foregroundColor: { red: 0, green: 0, blue: 0 } }, wrapStrategy: 'WRAP',
      } }, fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy)' } },
      { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length }, properties: { pixelSize: 150 }, fields: 'pixelSize' } },
      { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: TABLES[aba].headers.length + 1, endIndex: headers.length }, properties: { pixelSize: 300 }, fields: 'pixelSize' } },
      { addProtectedRange: { protectedRange: { range: { sheetId }, description: 'Visão consolidada. Faça alterações pelo Caixa; revise conflitos na interface.', warningOnly: false } } },
    )
    const numberFormat = (startColumnIndex, endColumnIndex, type, pattern) => ({ repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex, endColumnIndex }, cell: { userEnteredFormat: { numberFormat: { type, pattern } } }, fields: 'userEnteredFormat.numberFormat' } })
    if (aba === 'Lancamentos') requests.push(numberFormat(3, 5, 'DATE', 'dd/mm/yyyy'), numberFormat(5, 6, 'NUMBER', '#,##0.00'))
    else requests.push(numberFormat(6, 8, 'NUMBER', '#,##0.00'))
    if (aba === 'ContasFixas') requests.push({ updateCells: {
      range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 15, endColumnIndex: 16 },
      rows: [{ values: [{ userEnteredValue: { formulaValue: `=${qs(sourceTitles[aba] ?? aba)}!P6` }, note: 'Meta da aba-base; não pertence ao diário.' }] }],
      fields: 'userEnteredValue,note',
    } })
  }
  return requests
}
