import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { SECTOR_NEWS_TOPICS, SECTOR_NEWS_SOURCES, SECTOR_NEWS_RULES, SECTOR_NEWS_EDITORIAL_REVIEWS, SECTOR_NEWS_WINDOW_MS, CC_BY_ND_3, normalizeSectorNews, isSectorNewsRelevant, sectorNewsItemMatchesTopic, validIsoTimestamp, validateSectorNewsItem, publicationBounds } from '../src/sectorNews.js'
import { parseGovArticle, extractGovArticleLinks, robotsAllows, fetchPublicText, makeSectorNewsFile, collectSectorNews, mergeSectorSourceStates } from '../scripts/sector-news-lib.mjs'
import { main as revalidateSnapshot } from '../scripts/fetch-sector-news.mjs'

const NOW = Date.parse('2026-11-05T10:00:00Z')
const source = id => SECTOR_NEWS_SOURCES.find(s => s.id === id)
const item = (extra = {}) => ({ title: 'Anvisa suspende equipamento para radioterapia superficial', link: `${source('anvisa').articlePrefix}2026/fixture-radioterapia`, sourceId: 'anvisa', source: 'Anvisa', publishedAt: '2026-11-03T08:00:00Z', collectedAt: '2026-11-05T09:00:00Z', type: 'comunicado', licenseUrl: CC_BY_ND_3, ...extra })
const success = { anvisa: { status: 'ok', checkedAt: '2026-11-05T09:00:00Z', lastSuccessAt: '2026-11-05T09:00:00Z' } }

// Synthetic classification fixtures, never copied to the public news feed.
const relevanceExamples = {
  agricultura: ['Safra agrícola tem nova projeção de produção', 'Ministro cobre despesas de viagem'],
  pecuaria: ['Exportações da pecuária e proteína animal avançam', 'Ator Carneiro lança filme'],
  'alimentos-bebidas': ['Indústria de alimentos e bebidas recebe novas regras', 'Vale-alimentação muda para servidores'],
  industria: ['Produção industrial cresce no Brasil', 'Indústria da fofoca movimenta celebridades'],
  'veiculos-pesados': ['Produção de caminhões e ônibus aumenta', 'Acidente com caminhão deixa feridos'],
  metalmecanica: ['Indústria de máquinas amplia produção', 'Máquina do tempo estreia no cinema'],
  'quimicos-plasticos': ['Anvisa recolhe produtos de limpeza sem registro', 'A química do amor entre os atores'],
  'textil-moveis': ['Indústria têxtil e de móveis aumenta vendas', 'Dispositivos móveis ganham nova rede'],
  comercio: ['Vendas no comércio varejista crescem', 'Acordo de comércio exterior é assinado'],
  'atacado-distribuicao': ['Atacado revê distribuição de mercadorias', 'Distribuição de renda cresce no país'],
  'varejo-essencial': ['Supermercados registram alta nas vendas', 'Curso de farmácia na universidade abre vagas'],
  'varejo-duraveis': ['Comércio eletrônico amplia vendas de eletrodomésticos', 'Cupom de comércio eletrônico é divulgado'],
  'transporte-cargas': ['Frete e transporte de cargas têm novas regras', 'Cargas elétricas são tema de aula'],
  'transporte-passageiros': ['Transporte de passageiros recebe nova regulamentação', 'Acidente no transporte de passageiros deixa feridos'],
  'armazenagem-logistica': ['Operadores logísticos inauguram centros de distribuição', 'Armazenamento de dados ganha ferramenta'],
  'construcao-civil': ['Sinapi aponta custos da construção civil', 'Construção de consenso avança no Senado'],
  infraestrutura: ['Obras de infraestrutura rodoviária avançam', 'Infraestrutura de software é atualizada'],
  'mercado-imobiliario': ['Mercado imobiliário tem novos lançamentos residenciais', 'Imobiliário é alvo de golpe por aplicativo'],
  telecom: ['Anatel muda regras para banda larga', 'Claro que estar vivo é melhor'],
  'software-ti': ['Serviços de TI ampliam mercado de software', 'Download grátis de software para jogos'],
  'comunicacao-midia': ['Regulação da radiodifusão terá consulta pública', 'Fofoca de celebridade domina mídia'],
  'saude-assistencial': ['Hospitais adotam novas regras de serviços de saúde', 'Clínica organiza campeonato de futebol'],
  diagnosticos: ['Laboratórios clínicos ampliam exames laboratoriais', 'Diagnóstico da economia aponta recuperação'],
  'produtos-saude': ['Anvisa regulamenta dispositivos médicos', 'Vacina é tema de boato em rede social'],
  servicos: ['Pesquisa mensal de serviços divulga novo resultado', 'Prefeitura oferece serviços de emissão de documentos'],
  educacao: ['Educação privada debate mensalidades escolares', 'Escola de samba abre inscrições'],
  'servicos-profissionais': ['Escritórios de advocacia adotam nova regra contábil', 'Contabilidade do placar de futebol dá empate'],
  terceirizacao: ['Terceirização e facilities têm convenção coletiva', 'Terceirização da culpa domina debate'],
  'turismo-hospedagem': ['Hotelaria acompanha ocupação de hotéis no feriado', 'Turismo espacial ganha novo foguete'],
  'alimentacao-servicos': ['Restaurantes ampliam alimentação fora do lar', 'Como cozinhar receita caseira de restaurante'],
  'lazer-entretenimento': ['Parques temáticos ampliam operação e investimentos', 'Fofoca de entretenimento sobre celebridade'],
  energia: ['ANEEL divulga tarifa de energia elétrica', 'Energia espiritual positiva para hoje'],
  reciclagem: ['Indústria debate reciclagem de plásticos e papel', 'Curso de reciclagem de motoristas para renovar CNH'],
  saneamento: ['Saneamento básico tem novo marco de esgotamento', 'Saneamento de contas melhora resultado'],
  'servicos-financeiros': ['Cooperativas de crédito ampliam financiamento', 'Banco de sangue amplia atendimento'],
  seguros: ['Susep publica regras para seguradoras', 'Lugares seguros para visitar no verão'],
  mineracao: ['Agência abre consulta para fechamento de minas', 'Academia Nacional de Medicina apresenta prêmio ANM'],
  'oleo-gas': ['Produção de petróleo e gás natural atinge recorde', 'Gás de pimenta é usado em manifestação'],
  cobre: ['Preço do cobre sobe com demanda pelo metal', 'Empresa cobre custos de produção'],
  aluminio: ['Produção de alumínio e bauxita aumenta', 'Papel alumínio na receita caseira'],
  aco: ['Siderurgia aumenta importação de aço', 'Homem de aço estreia nos cinemas'],
  minerio: ['Minério de ferro tem nova projeção de demanda', 'Vale a pena visitar o museu'],
  petroleo: ['Preço de petróleo e diesel recua', 'Perfume inspirado em petróleo é lançado'],
}

test('38 setores + 5 insumos têm regras e casos positivos/negativos individuais', () => {
  assert.equal(SECTOR_NEWS_TOPICS.length, 43)
  assert.deepEqual(Object.keys(SECTOR_NEWS_RULES).sort(), SECTOR_NEWS_TOPICS.map(t => t.id).sort())
  assert.deepEqual(Object.keys(relevanceExamples).sort(), SECTOR_NEWS_TOPICS.map(t => t.id).sort())
  for (const [id, [positive, negative]] of Object.entries(relevanceExamples)) {
    assert.equal(isSectorNewsRelevant(id, positive), true, `${id}: ${positive}`)
    assert.equal(isSectorNewsRelevant(id, negative), false, `${id}: ${negative}`)
  }
})
test('datas ISO estritas, Brasília e UTC representam o mesmo instante', () => {
  assert.equal(validIsoTimestamp('2026-11-03T05:00:00-03:00'), validIsoTimestamp('2026-11-03T08:00:00Z'))
  for (const date of ['2026-02-30T12:00:00Z', '2026-11-03', '2026-11-03T08:00:00', '2026-13-02T01:00:00Z', '2026-11-03T24:00:00Z']) assert.equal(validIsoTimestamp(date), null)
})
test('janela exata de 120 horas e nenhuma tolerância de data futura', () => {
  assert.ok(validateSectorNewsItem(item({ publishedAt: new Date(NOW - SECTOR_NEWS_WINDOW_MS).toISOString() }), NOW).item)
  assert.equal(validateSectorNewsItem(item({ publishedAt: new Date(NOW - SECTOR_NEWS_WINDOW_MS - 1).toISOString() }), NOW).reason, 'outside_120h_or_uncertain_boundary')
  assert.equal(validateSectorNewsItem(item({ publishedAt: new Date(NOW + 1).toISOString() }), NOW).reason, 'future_or_uncertain_publication')
})
test('data sem hora só entra se todo intervalo plausível cabe na janela', () => {
  assert.ok(validateSectorNewsItem(item({ publishedAt: '2026-11-03', datePrecision: 'day' }), NOW).item)
  assert.equal(validateSectorNewsItem(item({ publishedAt: '2026-10-29', datePrecision: 'day' }), NOW).reason, 'outside_120h_or_uncertain_boundary')
  assert.equal(validateSectorNewsItem(item({ publishedAt: '2026-11-05', datePrecision: 'day' }), NOW).reason, 'future_or_uncertain_publication')
  assert.equal(publicationBounds({ publishedAt: '2026-02-30', datePrecision: 'day' }), null)
})
test('cliente revalida janela, não conserva manchetes envelhecidas nem renova sucesso', () => {
  const feed = makeSectorNewsFile({ items: [item()], sourceStates: success, now: NOW })
  assert.equal(feed.topics['produtos-saude'].items.length, 1)
  const later = normalizeSectorNews(feed, NOW + SECTOR_NEWS_WINDOW_MS + 1)
  assert.equal(later.topics['produtos-saude'].items.length, 0)
  assert.equal(later.topics['produtos-saude'].status, 'failed')
  assert.equal(later.topics['produtos-saude'].lastSuccessAt, success.anvisa.lastSuccessAt)
})
test('fonte institucional não pode se passar por imprensa independente', () => {
  assert.equal(validateSectorNewsItem(item({ type: 'imprensa' }), NOW).reason, 'wrong_source_type')
  assert.equal(validateSectorNewsItem(item({ source: 'Reuters' }), NOW).item.source, 'Anvisa')
})
test('URL direta, licença e cadastro são verificados sem confiar no JSON', () => {
  for (const link of ['javascript:alert(1)', 'data:text/plain,test', 'https://www.gov.br.evil.test/anvisa/noticia', 'https://user:pass@www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/x', 'https://www.gov.br/mdic/pt-br/assuntos/noticias/x']) assert.equal(validateSectorNewsItem(item({ link }), NOW).reason, 'invalid_direct_url')
  assert.equal(validateSectorNewsItem(item({ licenseUrl: 'javascript:alert(1)' }), NOW).reason, 'missing_or_wrong_license')
  assert.equal(validateSectorNewsItem(item({ sourceId: 'ibge' }), NOW).reason, 'source_not_approved')
  const feed = normalizeSectorNews({ schemaVersion: 1, topics: {}, sourceStates: { anvisa: { ...success.anvisa, url: 'javascript:bad', label: 'Falsa' } } }, NOW)
  assert.equal(feed.sourceStates.anvisa.url, source('anvisa').url)
  assert.equal(feed.sourceStates.anvisa.label, 'Anvisa')
})
test('deduplica URL rastreada, manchete igual e mesmo evento explícito', () => {
  const items = [item(), item({ link: item().link + '?utm_source=test' }), item({ link: item().link + '-other' }), item({ title: 'Anvisa suspende dispositivo médico', link: item().link + '-event1', eventId: 'official-event-1' }), item({ title: 'Dispositivo médico é suspenso pela Anvisa', link: item().link + '-event2', eventId: 'official-event-1' })]
  const feed = makeSectorNewsFile({ items, sourceStates: success, now: NOW })
  assert.equal(feed.topics['produtos-saude'].items.length, 2)
})
test('sem cotas: zero, uma e sete notícias não alteram critérios nem fontes', () => {
  const empty = makeSectorNewsFile({ sourceStates: { ...success, ipen: success.anvisa }, now: NOW })
  assert.equal(empty.topics['produtos-saude'].status, 'empty')
  assert.equal(empty.topics['produtos-saude'].items.length, 0)
  const seven = Array.from({ length: 7 }, (_, i) => item({ title: `Anvisa publica regra ${i} para dispositivos médicos`, link: item().link + `-${i}` }))
  assert.equal(makeSectorNewsFile({ items: seven, sourceStates: success, now: NOW }).topics['produtos-saude'].items.length, 7)
})
test('distingue tema pendente, falha, vazio e parcial', () => {
  const feed = makeSectorNewsFile({ sourceStates: { anvisa: { ...success.anvisa, status: 'failed', reason: 'HTTP 403' }, mapa: { ...success.anvisa, status: 'partial', reason: 'Amostra verificada' } }, now: NOW })
  assert.equal(feed.topics.telecom.status, 'unavailable')
  assert.equal(feed.topics['produtos-saude'].status, 'failed')
  assert.equal(feed.topics.pecuaria.status, 'partial')
  assert.ok(feed.topics.telecom.sources.every(s => s.reason && s.url))
})
test('empresa isolada continua comunicado, não prova desempenho setorial; patrocinado é rejeitado', () => {
  const isolated = item({ title: 'Anvisa suspende equipamento para radioterapia da empresa Exemplo' })
  const feed = makeSectorNewsFile({ items: [isolated, item({ title: 'Conteúdo patrocinado: equipamentos para radioterapia', link: item().link + '-ad' })], sourceStates: success, now: NOW })
  assert.equal(feed.topics['produtos-saude'].items.length, 1)
  assert.equal(feed.topics['produtos-saude'].items[0].type, 'comunicado')
})
test('parser usa publicação original, nunca atualização nem data do evento', () => {
  const html = `<h1>Vacinas e dispositivos médicos &amp; regulação</h1><meta property="article:published_time" content="2026-11-03T05:00:00-03:00"><meta property="article:modified_time" content="2026-11-05T10:00:00Z"><footer><a href="${CC_BY_ND_3}">Licença</a></footer>`
  const parsed = parseGovArticle(html, source('anvisa'), item().link, item().collectedAt)
  assert.equal(parsed.publishedAt, '2026-11-03T05:00:00-03:00')
  assert.equal(parsed.title, 'Vacinas e dispositivos médicos & regulação')
  const local = parseGovArticle(`<h1>Vacinas contra a gripe</h1><div>Publicado em 03/11/2026 08h00 Atualizado em 05/11/2026 10h00</div>${CC_BY_ND_3}`, source('anvisa'), item().link, item().collectedAt)
  assert.equal(local.publishedAt, '2026-11-03')
  assert.equal(local.datePrecision, 'day')
  assert.throws(() => parseGovArticle(`<h1>Vacinas</h1><div>Atualizado em 05/11/2026 10h00</div>${CC_BY_ND_3}`, source('anvisa'), item().link, item().collectedAt), /parse_error/)
})
test('parser para em desafio humano e mudança de licença', () => {
  assert.throws(() => parseGovArticle('Your support ID is 42; testing whether you are a human', source('anvisa'), item().link, item().collectedAt), /access_challenge/)
  assert.throws(() => parseGovArticle('<h1>Vacina</h1>', source('anvisa'), item().link, item().collectedAt), /license_not_confirmed/)
})
test('JSON-LD usa datePublished original e rejeita metadados conflitantes', () => {
  const base = `<h1>Vacinas contra a gripe</h1><a href="${CC_BY_ND_3}">Licença</a>`
  const json = '<script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-11-03T08:00:00-03:00","dateModified":"2026-11-05T09:00:00-03:00"}</script>'
  assert.equal(parseGovArticle(base + json, source('anvisa'), item().link, item().collectedAt).publishedAt, '2026-11-03T08:00:00-03:00')
  assert.throws(() => parseGovArticle(base + json + '<meta property="article:published_time" content="2026-11-02T08:00:00Z">', source('anvisa'), item().link, item().collectedAt), /conflicting_publication_dates/)
  assert.throws(() => parseGovArticle(base + '<script type="application/ld+json">{"@type":"WebSite","datePublished":"2026-11-03T08:00:00Z"}</script>', source('anvisa'), item().link, item().collectedAt), /parse_error/)
})
test('classificação pelo corpo exige revisão fixada à URL e manchete originais', () => {
  const review = SECTOR_NEWS_EDITORIAL_REVIEWS.find(r => r.topics['textil-moveis'])
  const original = { link: review.link, title: review.title }
  assert.equal(isSectorNewsRelevant('textil-moveis', original.title), false)
  assert.equal(sectorNewsItemMatchesTopic('textil-moveis', original), true)
  assert.equal(sectorNewsItemMatchesTopic('comercio', original), false, 'Não transformar comércio exterior em varejo interno')
  assert.equal(sectorNewsItemMatchesTopic('textil-moveis', { ...original, link: original.link + '-other' }), false)
  assert.equal(sectorNewsItemMatchesTopic('textil-moveis', { ...original, title: original.title + '!' }), false)
})
test('referência a captcha em script não prova desafio humano no conteúdo', () => {
  const html = `<h1>Vacinas contra a gripe</h1><div>Publicado em 03/11/2026 08h00</div><script src="captcha-library.js"></script>${CC_BY_ND_3}`
  assert.ok(parseGovArticle(html, source('anvisa'), item().link, item().collectedAt))
})
test('coletor não tenta novamente fonte suspensa por acesso', async () => {
  let calls = 0
  const previous = makeSectorNewsFile({ sourceStates: { mapa: { status: 'failed', checkedAt: new Date(NOW - 1000).toISOString(), accessSuspended: true, reason: 'http_403' } }, now: NOW })
  const result = await collectSectorNews({ previous, sourceIds: ['mapa'], now: NOW, fetchImpl: async () => { calls++; throw new Error('must not run') } })
  assert.equal(calls, 0)
  assert.equal(result.sourceStates.mapa.accessSuspended, true)
})
test('mescla suspensões por OR e não perde sucesso ou tentativa mais recentes', () => {
  const result = mergeSectorSourceStates({ mapa: { status: 'failed', checkedAt: '2026-11-05T09:00:00Z', lastSuccessAt: '2026-11-04T09:00:00Z', accessSuspended: true } }, { mapa: { status: 'ok', checkedAt: '2026-11-03T09:00:00Z', lastSuccessAt: '2026-11-03T09:00:00Z', accessSuspended: false } })
  assert.equal(result.mapa.accessSuspended, true)
  assert.equal(result.mapa.status, 'failed')
  assert.equal(result.mapa.lastSuccessAt, '2026-11-04T09:00:00Z')
})
test('CLI recusa live local e CI antes de ler estado, inclusive com --offline junto', async () => {
  const snapshot = new URL('../public/sector-news.json', import.meta.url)
  const before = await readFile(snapshot, 'utf8')
  for (const ci of [undefined, 'true', 'false']) for (const extra of [[], ['--offline']]) {
    const env = { ...process.env }
    if (ci === undefined) delete env.CI; else env.CI = ci
    const child = spawnSync(process.execPath, [new URL('../scripts/fetch-sector-news.mjs', import.meta.url).pathname, '--live', ...extra, '--input', '/definitely-missing-sector-state.json'], { env, encoding: 'utf8' })
    assert.equal(child.status, 1)
    assert.match(child.stderr, /Coleta externa desativada em todos os ambientes/)
    assert.doesNotMatch(child.stderr, /ENOENT/)
  }
  assert.equal(await readFile(snapshot, 'utf8'), before, 'nenhuma tentativa live altera o snapshot')
})
test('helpers não têm transporte real implícito e recusam fetch global explícito', async () => {
  await assert.rejects(collectSectorNews(), /live_collection_disabled/)
  await assert.rejects(collectSectorNews({ fetchImpl: globalThis.fetch }), /live_collection_disabled/)
  await assert.rejects(fetchPublicText(item().link, { allowedPrefix: source('anvisa').articlePrefix }), /live_collection_disabled/)
  await assert.rejects(fetchPublicText(item().link, { allowedPrefix: source('anvisa').articlePrefix, fetchImpl: globalThis.fetch }), /live_collection_disabled/)
})
test('robots inválido ou desconhecido falha fechado, inclusive Crawl-delay não numérico', () => {
  for (const invalid of ['User-agent: *\nCrawl-delay: unknown', 'User-agent: *\nCrawl-delay: -1', 'User-agent: *\nCrawl-delay: Infinity', 'User-agent: *\nRequest-rate: 1/10', 'User-agent: *\nlinha sem sintaxe', 'Disallow: /', '# apenas comentário', 'User-agent:\nDisallow: /', '<html>captcha</html>']) {
    assert.throws(() => robotsAllows(invalid, item().link), /robots_/)
  }
  assert.equal(robotsAllows('User-agent: *\nCrawl-delay: 1\nDisallow:\nSitemap: https://www.gov.br/sitemap.xml', item().link), true)
  assert.throws(() => robotsAllows('User-agent: *\nCrawl-delay: 10', item().link), /requires_review/)
})
test('offline falha fechado com estado ausente, corrompido ou incompatível sem apagar saída', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'sector-state-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const input = join(directory, 'input.json'), output = join(directory, 'output.json')
  await writeFile(output, 'sentinela preservada')
  await assert.rejects(revalidateSnapshot(['--offline', '--input', input, '--output', output]), /ENOENT/)
  for (const contents of ['{broken', '{}', '{"schemaVersion":2,"topics":{},"sourceStates":{}}']) {
    await writeFile(input, contents)
    await assert.rejects(revalidateSnapshot(['--offline', '--input', input, '--output', output]))
    assert.equal(await readFile(output, 'utf8'), 'sentinela preservada')
  }
})
test('descoberta aceita artigo sem /2026/, mas não menu, terceiros ou busca', () => {
  const s = source('anvisa')
  const html = `<a href="${s.articlePrefix}anvisa-define-vacinas-para-2027">Anvisa define vacinas para 2027</a><a href="https://other.test/health">Dispositivos médicos em alta</a><a href="${s.articlePrefix}2026">Notícias sobre vacinas</a><a href="${s.articlePrefix}search?query=vacinas">Pesquisa de vacinas</a>`
  assert.equal(extractGovArticleLinks(html, s).length, 1)
})
test('robots é respeitado; 403 e redirecionamento não são repetidos', async () => {
  assert.equal(robotsAllows('User-agent: *\nDisallow: /anvisa/', item().link), false)
  assert.equal(robotsAllows('User-agent: *\nUser-agent: AnotherBot\nDisallow: /anvisa/', item().link), false)
  assert.equal(robotsAllows('User-agent: *\nDisallow: /ebserh/*?\nDisallow: /*sendto_form$', item().link), true)
  assert.equal(robotsAllows('User-agent: *\nDisallow: /*sendto_form$', item().link + '/sendto_form'), false)
  for (const status of [403, 429, 302]) {
    let calls = 0
    await assert.rejects(fetchPublicText(item().link, { allowedPrefix: source('anvisa').articlePrefix, fetchImpl: async () => { calls++; return { status, ok: false } } }))
    assert.equal(calls, 1)
  }
})
test('cliente rejeita esquema ou estruturas inválidos', () => {
  for (const data of [null, {}, { schemaVersion: 2, topics: {}, sourceStates: {} }, { schemaVersion: 1, topics: [], sourceStates: {} }, { schemaVersion: 1, topics: {} }]) assert.throws(() => normalizeSectorNews(data, NOW), /inválido/)
})
test('falha de coleta preserva último sucesso e não consulta fonte desativada', async () => {
  const previous = makeSectorNewsFile({ items: [item()], sourceStates: { ...success, mapa: success.anvisa }, now: NOW - 1000 })
  let calls = 0
  const result = await collectSectorNews({ previous, sourceIds: ['mapa', 'anvisa', 'anatel'], now: NOW, fetchImpl: async () => { calls++; throw new Error('network blocked') }, pause: async () => {} })
  assert.equal(calls, 1)
  assert.equal(result.sourceStates.mapa.status, 'failed')
  assert.equal(result.sourceStates.mapa.lastSuccessAt, success.anvisa.lastSuccessAt)
  assert.equal(result.sourceStates.anvisa.automaticCollection, false)
  assert.equal(result.sourceStates.anatel.status, 'unavailable')
  assert.equal(result.topics['produtos-saude'].items.length, 1)
})
test('produto não contém fixtures e todo item salvo tem origem/licença válida', async () => {
  const json = JSON.parse(await readFile(new URL('../public/sector-news.json', import.meta.url), 'utf8'))
  assert.equal(Object.keys(json.topics).length, 43)
  const rawItems = Object.values(json.topics).flatMap(t => t.items)
  // Zero is legitimate after the moving window expires. Initial real collection
  // is documented separately; never make the build depend on a news quota.
  for (const raw of rawItems) {
    assert.doesNotMatch(JSON.stringify(raw), /fixture|example\.com|Exemplo/)
    const validation = validateSectorNewsItem(raw, Date.parse(json.generatedAt))
    // The original 7-day evidence snapshot is immutable. The new policy may
    // expire its oldest items, but cannot admit any other invalid metadata.
    assert.ok(validation.item || validation.reason === 'outside_120h_or_uncertain_boundary', raw.link)
  }
  const current = normalizeSectorNews(json)
  for (const topic of Object.values(current.topics)) for (const raw of topic.items) assert.ok(validateSectorNewsItem(raw).item)
})
