/* Dados fictícios; sem acesso a uma planilha real. */
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { randomUUID } = require('node:crypto')
const { chromium } = require('playwright')

const BASE = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8768').replace(/\/$/, '') + '/caixa/'
const OUT = process.env.CAIXA_QA_OUTPUT || process.env.TABLE_QA_OUTPUT || path.resolve('qa-caixa')
const failures = []
const wait = async (predicate, label, timeout = 12000) => {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    if (await predicate()) return
    await new Promise(r => setTimeout(r, 40))
  }
  throw new Error('Tempo excedido: ' + label)
}
async function main() {
  const { TABLES, JOURNAL_HEADERS } = await import(pathToFileURL(path.resolve(__dirname, '../../caixa/src/journal.js')).href)
  await fs.mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: process.env.SMOKE_CHANNEL || 'chromium' })
  const row = (aba, values) => TABLES[aba].headers.map(h => values[h] ?? '')
  const makeService = (configured = true) => ({
    configured, journal: [JOURNAL_HEADERS], posts: [], writeErrors: [], race: false, loseResponse: false, hold: null,
    raw: {
      Pessoas: [['pessoa_id', 'nome', 'tipo', 'ativa'], ['P-TESTE', 'Pessoa exemplo', 'pessoa', 'Sim']],
      Contas: [['conta_id', 'banco_id', 'pessoa_id', 'nome', 'apelido', 'tipo', 'ativa'], ['C-TESTE', 'B-TESTE', 'P-TESTE', 'Conta exemplo', 'Conta exemplo', 'corrente', 'Sim']],
      Categorias: [['categoria_id', 'nome', 'tipo', 'ativa', 'ordem'], ['CAT-TESTE', 'Moradia', 'despesa', 'Sim', 1]],
      Subcategorias: [['subcategoria_id', 'categoria_id', 'nome', 'ativa'], ['SUB-TESTE', 'CAT-TESTE', 'Energia', 'Sim']],
      Lancamentos: [TABLES.Lancamentos.headers, row('Lancamentos', { lancamento_id: 'L-ENERGIA', conta_id: 'C-TESTE', pessoa_id: 'P-TESTE', data: new Date().toISOString().slice(0, 10), data_caixa: new Date().toISOString().slice(0, 10), valor: -180, descricao_original: 'Energia teste', descricao_limpa: 'Energia teste', subcategoria_id: 'SUB-TESTE', tipo: 'despesa', status: 'confirmado', revisado: 'Não' })],
      ContasFixas: [TABLES.ContasFixas.headers,
        row('ContasFixas', { conta_fixa_id: 'F-ENERGIA', descricao: 'Energia teste', subcategoria_id: 'SUB-TESTE', pessoa_id: 'P-TESTE', pagador: 'Pessoa exemplo', forma_pagamento: 'boleto', valor_padrao: 180, valor_mes: 180, dia_vencimento: 10, pago: 'Não', ativa: 'Sim' }),
        row('ContasFixas', { conta_fixa_id: 'F-INTERNET', descricao: 'Internet teste', subcategoria_id: 'SUB-TESTE', pessoa_id: 'P-TESTE', pagador: 'Pessoa exemplo', forma_pagamento: 'pix', valor_padrao: 120, valor_mes: 120, dia_vencimento: 20, pago: 'Não', ativa: 'Sim' })],
    },
    append(values) {
      const before = this.journal.slice(1)
      const duplicate = before.some(r => r[0] === values[0])
      const prior = before.filter(r => r[1] === values[1] && r[2] === values[2] && r[3] === values[3] && r[11] === true).at(-1)
      const stored = values.slice()
      stored[11] = !duplicate && values[4] === (prior?.[0] || '')
      this.journal.push(stored)
      return stored
    },
  })
  async function session(service, { auth = true, width = 390 } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
    if (auth) await context.addInitScript(() => sessionStorage.setItem('caixa:token', JSON.stringify({ value: 'TOKEN_FICTICIO', exp: Date.now() + 3600000 })))
    await context.route('https://accounts.google.com/gsi/client', route => route.fulfill({ contentType: 'application/javascript', body: 'window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken(){}}),revoke(){}}}};' }))
    await context.route('https://sheets.googleapis.com/v4/spreadsheets/**', async route => {
      try {
        const request = route.request(), url = new URL(request.url())
        const sheetId = url.pathname.split('/')[3].split(':')[0]
        const reply = value => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) })
        if (request.method() === 'GET' && url.pathname.endsWith('/values:batchGet')) {
          const valueRanges = url.searchParams.getAll('ranges').map(range => {
            const name = range.split('!')[0].replace(/^'|'$/g, '')
            const values = name === 'Caixa_Operacoes' ? service.journal : name === 'ContasFixas' && range.includes('P6') ? [[2000]] : service.raw[name]
            assert.ok(values, 'Range inesperado: ' + range)
            return { range, values }
          })
          return reply({ spreadsheetId: sheetId, valueRanges })
        }
        if (request.method() === 'GET') return reply({ spreadsheetId: sheetId, sheets: service.configured ? [{ properties: { title: 'Caixa_Operacoes', sheetId: 900, gridProperties: { rowCount: 1000, columnCount: 50 } } }] : [] })
        assert.ok(url.pathname.endsWith(':batchUpdate'), 'Escrita fora de spreadsheets:batchUpdate')
        const body = request.postDataJSON()
        assert.equal(body.requests.length, 1)
        const append = body.requests[0].appendCells
        assert.ok(append, 'A escrita deve usar appendCells')
        assert.equal(append.sheetId, 900, 'Destino deve ser o diário, nunca a fonte')
        assert.equal(append.fields, 'userEnteredValue')
        assert.equal(append.rows.length, 1)
        const cells = append.rows[0].values
        assert.equal(cells.length, 50)
        assert.ok(cells[11].userEnteredValue.formulaValue, 'Aceitação deve ser fórmula nativa')
        const values = cells.map((c, i) => i === 11 ? null : Object.values(c.userEnteredValue)[0])
        service.posts.push(values)
        if (service.hold) await service.hold
        if (service.race) {
          service.race = false
          const rival = values.slice(); rival[0] = randomUUID()
          service.append(rival)
        }
        service.append(values)
        if (service.loseResponse) { service.loseResponse = false; return route.abort('failed') }
        return reply({ spreadsheetId: sheetId, replies: [{}] })
      } catch (error) {
        service.writeErrors.push(error.message)
        await route.abort('failed').catch(() => {})
      }
    })
    const page = await context.newPage()
    page.on('pageerror', e => failures.push(e.message))
    await page.goto(BASE)
    return { page, context, service }
  }
  const fixed = page => page.locator('li.linha.fixa').filter({ hasText: 'Energia teste' })
  const openFixed = async page => {
    await page.getByRole('button', { name: 'Contas fixas', exact: true }).click()
    await fixed(page).waitFor()
  }
  const refresh = page => page.getByRole('button', { name: 'Atualizar dados', exact: true })
  const paid = page => fixed(page).getByRole('button', { name: 'Marcar como paga', exact: true })
  const assertSafe = service => {
    assert.deepEqual(service.writeErrors, [])
    for (const op of service.posts) assert.equal(op[2], 'F-ENERGIA', 'Outra identidade não pode ser alterada')
    assert.equal(service.raw.ContasFixas.find(r => r[0] === 'F-INTERNET')[9], 'Não')
  }
  try {
    const demo = await session(makeService(), { auth: false })
    await demo.page.getByRole('button', { name: 'Ver com dados de exemplo', exact: true }).click()
    await demo.page.getByRole('button', { name: 'Contas fixas', exact: true }).waitFor()
    assert.equal(demo.service.posts.length, 0)
    await demo.context.close()

    const missing = await session(makeService(false))
    await openFixed(missing.page)
    assert.equal(await paid(missing.page).isDisabled(), true)
    await missing.page.screenshot({ path: path.join(OUT, 'caixa-sem-diario-390.png'), fullPage: true })
    assert.equal(missing.service.posts.length, 0)
    await missing.context.close()

    const normal = await session(makeService())
    await openFixed(normal.page)
    normal.service.raw.ContasFixas.splice(1, 2, normal.service.raw.ContasFixas[2], normal.service.raw.ContasFixas[1])
    await paid(normal.page).click()
    await fixed(normal.page).getByRole('button', { name: 'Marcar como não paga', exact: true }).waitFor()
    assert.equal(normal.service.posts.length, 1)
    assert.equal(normal.service.journal[1][11], true)
    assertSafe(normal.service)
    for (const width of [390, 820, 1280]) {
      await normal.page.setViewportSize({ width, height: 900 })
      await normal.page.screenshot({ path: path.join(OUT, 'caixa-fixas-' + width + '.png'), fullPage: true })
      assert.equal(await normal.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Rolagem horizontal em ' + width)
    }

    const source = normal.service.raw.ContasFixas.find(r => r[0] === 'F-ENERGIA')
    source[6] = 225
    await refresh(normal.page).click()
    const review = normal.page.getByRole('button', { name: 'Revisar', exact: true })
    await review.click()
    const dialog = normal.page.getByRole('dialog', { name: 'Revisar alteração' })
    await dialog.waitFor()
    assert.equal(await normal.page.evaluate(() => document.activeElement?.id), 'recon-titulo')
    assert.equal(await dialog.getByText('O que mudou na planilha', { exact: true }).count(), 1)
    for (const width of [390, 820, 1280]) {
      await normal.page.setViewportSize({ width, height: 900 })
      await normal.page.screenshot({ path: path.join(OUT, 'caixa-revisao-' + width + '.png'), fullPage: true })
      assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Modal com rolagem horizontal')
    }
    assert.equal(await dialog.getByRole('button').evaluateAll(items => items.every(el => el.getBoundingClientRect().height >= 44 && el.getBoundingClientRect().width >= 44)), true, 'Controles do modal devem ter 44 px')
    await normal.page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await normal.page.evaluate(() => document.activeElement?.textContent?.trim()), 'Revisar')
    assert.equal(normal.service.posts.length, 1, 'Fechar a revisão não pode gravar')
    await review.click()
    await dialog.getByRole('button', { name: 'Manter valores do Caixa', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(normal.service.posts.length, 2)
    assert.equal(JSON.parse(normal.service.posts[1][7]).mode, 'keep_app')
    assert.equal(normal.service.journal[2][11], true)
    assertSafe(normal.service)
    source[7] = 230
    await refresh(normal.page).click()
    await review.click()
    await dialog.getByRole('button', { name: 'Usar valores da planilha', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await paid(normal.page).waitFor()
    assert.equal(normal.service.posts.length, 3)
    assert.equal(JSON.parse(normal.service.posts[2][7]).mode, 'use_source')
    assertSafe(normal.service)
    await normal.context.close()

    const draft = await session(makeService())
    await openFixed(draft.page)
    await fixed(draft.page).locator('.valor-btn').click()
    const input = draft.page.getByRole('textbox', { name: 'Valor do mês de Energia teste', exact: true })
    await input.fill('235,45')
    let release
    draft.service.hold = new Promise(resolve => { release = resolve })
    draft.service.loseResponse = true
    await input.press('Enter')
    await wait(() => draft.service.posts.length === 1, 'envio do valor em andamento')
    assert.equal(await input.isDisabled(), true, 'Entrada deve bloquear durante salvamento')
    assert.equal(await input.inputValue(), '235,45', 'Rascunho deve permanecer visível')
    assert.equal(await paid(draft.page).isDisabled(), true, 'Segundo comando deve bloquear durante salvamento')
    release()
    draft.service.hold = null
    await wait(async () => !(await refresh(draft.page).isDisabled()), 'fim da resposta incerta')
    assert.equal(await input.isDisabled(), true, 'Resultado incerto mantém edição bloqueada até releitura')
    assert.equal(await input.inputValue(), '235,45', 'Falha de confirmação deve preservar rascunho')
    assert.equal(draft.service.posts.length, 1)
    assert.equal(JSON.parse(draft.service.posts[0][7]).changes.valor_mes, 235.45)
    assertSafe(draft.service)
    await refresh(draft.page).click()
    await draft.page.getByRole('button', { name: 'Fechar edição do valor de Energia teste', exact: true }).click()
    await input.waitFor({ state: 'hidden' })
    await fixed(draft.page).locator('.valor-btn').click()
    await input.fill('999,00')
    await draft.page.getByRole('button', { name: 'Fechar edição do valor de Energia teste', exact: true }).click()
    await input.waitFor({ state: 'hidden' })
    assert.equal(draft.service.posts.length, 1, 'Fechar um rascunho não salva o valor')
    await fixed(draft.page).locator('.valor-btn').click()
    await input.fill('777,00')
    await input.press('Tab')
    await draft.page.keyboard.press('Enter')
    await input.waitFor({ state: 'hidden' })
    assert.equal(draft.service.posts.length, 1, 'Fechar pelo teclado não salva o valor')
    await draft.context.close()

    const race = await session(makeService())
    await openFixed(race.page)
    race.service.race = true
    await paid(race.page).click()
    await wait(() => race.service.journal.length === 3, 'duas operações concorrentes')
    assert.equal(race.service.journal[1][11], true)
    assert.equal(race.service.journal[2][11], false)
    await refresh(race.page).click()
    assert.equal(race.service.posts.length, 1, 'Conflito não pode reenviar automaticamente')
    assertSafe(race.service)
    await race.context.close()

    const uncertain = await session(makeService())
    await openFixed(uncertain.page)
    uncertain.service.loseResponse = true
    await paid(uncertain.page).click()
    await wait(() => uncertain.service.posts.length === 1, 'envio com resposta perdida')
    await refresh(uncertain.page).click()
    await fixed(uncertain.page).getByRole('button', { name: 'Marcar como não paga', exact: true }).waitFor()
    assert.equal(uncertain.service.posts.length, 1)
    assert.equal(uncertain.service.journal.length, 2)
    assert.equal(await uncertain.page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('caixa:pending:')).length), 0)
    assertSafe(uncertain.service)
    await uncertain.context.close()
    assert.deepEqual(failures, [], 'Erros JavaScript na interface')
    console.log('Caixa smoke: demo, configuração, identidade, concorrência, reconciliação, recuperação, rascunhos e layouts OK')
  } finally {
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
