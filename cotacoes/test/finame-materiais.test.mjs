// Calculadoras › BNDES Finame Materiais: regras do produto, composição da taxa, carência com juros, SAC/Price, TLP com saldo
// corrigido pelo IPCA, IOF e invariantes. Cada cenário é conferido por fórmula fechada, independente do código da calculadora.
import test from 'node:test'
import assert from 'node:assert/strict'
import { COMPOSICOES, FONTES, REGRAS, conferir, cronograma, faixaTfb, iofCronograma, ipcaEsperado, simular, spreadSobreCdi, taxaFinal, tlpNominal } from '../src/finameMateriais.js'
import { IOF_PJ } from '../src/emprestimo.js'
import { parseCommand } from '../src/terminal.js'

const perto = (a, b, tol = 0.01, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg}: esperado ${b}, obtido ${a}`)
const mensal = (aa) => (1 + aa / 100) ** (1 / 12) - 1
const SEM_IOF = { fixed: 0, daily: 0 }

test('regras: prazo, carência (menor com TFB), participação de 1% a 100%, tetos, faixa da TFB, comando, fontes e IPCA esperado', () => {
  assert.equal(REGRAS.prazoMaxMeses, 84); assert.equal(REGRAS.carenciaMaxMeses, 24); assert.equal(REGRAS.carenciaMaxTfbMeses, 12)
  assert.deepEqual(conferir({ valor: 1e6, participacao: 100, prazo: 84, carencia: 24, custo: 'tlp' }).erros, [])
  assert.match(conferir({ valor: 1e6, participacao: 100, prazo: 85, carencia: 0, custo: 'tlp' }).erros[0], /acima do máximo do produto: 84/)
  assert.match(conferir({ valor: 1e6, participacao: 100, prazo: 60, carencia: 13, custo: 'tfb' }).erros[0], /12 meses com TFB/)
  assert.deepEqual(conferir({ valor: 1e6, participacao: 100, prazo: 60, carencia: 24, custo: 'tlp' }).erros, [])
  assert.match(conferir({ valor: 1e6, participacao: 100, prazo: 12, carencia: 12, custo: 'tlp' }).erros[0], /menor que o prazo/)
  assert.match(conferir({ valor: 1e6, participacao: 120, prazo: 12, carencia: 0, custo: 'tlp' }).erros[0], /1% a 100%/)
  assert.match(conferir({ valor: 1e6, participacao: 0.5, prazo: 12, carencia: 0, custo: 'tlp' }).erros[0], /1% a 100%/, 'abaixo de 1% é erro, como diz a mensagem')
  assert.deepEqual(conferir({ valor: 1e6, participacao: 1, prazo: 12, carencia: 0, custo: 'tlp' }).erros, [])
  const c = conferir({ valor: 30e6, participacao: 100, prazo: 60, carencia: 6, custo: 'tfb' })
  assert.deepEqual(c.erros, []); assert.equal(c.avisos.length, 1); assert.match(c.avisos[0], /R\$ 20 milhões/)
  assert.equal(conferir({ valor: 200e6, participacao: 100, prazo: 60, carencia: 6, custo: 'tfb' }).avisos.length, 2)
  assert.equal(conferir({ valor: 30e6, participacao: 50, prazo: 60, carencia: 6, custo: 'tfb' }).avisos.length, 0)
  assert.deepEqual([24, 36, 37, 60, 61, 84, 100].map(faixaTfb), [36, 36, 60, 60, 84, 84, 120])
  assert.deepEqual(parseCommand('finame'), { kind: 'tab', id: 'calculadora', sub: 'finame-materiais' })
  assert.ok(FONTES.length >= 6 && FONTES.every((f) => f.regra && f.fonte && /^https:\/\//.test(f.url)))
  assert.deepEqual(COMPOSICOES.map((x) => x.id), ['capitalizada', 'somada'])
  const agora = Date.parse('2026-11-04T12:00:00Z')
  assert.deepEqual(ipcaEsperado({ rows: [{ indicator: 'IPCA', values: { 2026: { median: 5.2 }, 2027: { median: 4.1 } } }] }, agora), { ano: '2027', valor: 4.1 })
  assert.deepEqual(ipcaEsperado({ rows: [{ indicator: 'IPCA', values: { 2026: { median: 5.2 } } }] }, agora), { ano: '2026', valor: 5.2 })
  assert.equal(ipcaEsperado(null, agora), null)
})

test('composição da taxa: capitalizada (exemplo oficial do BNDES: 1,07 × 1,015 × 1,03 − 1 = 11,86%) e somada; TLP nominal; CDI + spread', () => {
  perto(taxaFinal(7, 1.5, 3), 11.86, 0.005, 'exemplo oficial')
  perto(taxaFinal(16, 1.25, 3), 20.9735, 1e-3, '1,16 × 1,0125 × 1,03 − 1')
  perto(taxaFinal(16, 1.25, 3, 'somada'), 20.25, 1e-9, 'somada')
  assert.equal(taxaFinal(0, 0, 0), 0)
  perto(tlpNominal(7.72, 4.52), 12.5889, 1e-3, 'TLP nominal')
  perto(spreadSobreCdi(21, 14.15), 6.0008, 1e-3, 'spread')
  assert.equal(spreadSobreCdi(21, null), null)
})

// Cenário 1 (o auditado): TFB 16,5216% + 1,25% + 3,00%, R$ 500 mil, 60 meses, 12 de carência trimestral, SAC, sem IOF.
test('cenário 1 · TFB, SAC, carência de 12 meses com juros trimestrais (fórmula fechada)', () => {
  const r = simular({ valor: 500_000, participacao: 100, prazo: 60, carencia: 12, custo: 'tfb', custoFinanceiro: 16.5216, taxaBndes: 1.25, taxaAgente: 3, sistema: 'sac', periodicidade: 3, iof: SEM_IOF })
  assert.ok(r.ok)
  const F = 500_000, taxa = (1.165216 * 1.0125 * 1.03 - 1) * 100, i = mensal(taxa), n = 48
  perto(r.taxa, taxa, 1e-9, 'taxa'); perto(r.taxa, 21.5175, 1e-4, 'taxa arredondada')
  perto(r.parcelas[2].parcela, F * ((1 + i) ** 3 - 1), 1e-6, 'juros do 1º trimestre'); perto(r.parcelas[2].parcela, 24_964.19, 0.01, 'trimestre')
  assert.deepEqual(r.parcelas.slice(0, 12).map((p) => p.parcela > 0), [false, false, true, false, false, true, false, false, true, false, false, true])
  perto(r.jurosCarencia, 4 * F * ((1 + i) ** 3 - 1), 1e-6, 'carência'); perto(r.jurosCarencia, 99_856.76, 0.01, 'carência')
  perto(r.primeiraParcela, F / n + F * i, 1e-6, 'P1'); perto(r.primeiraParcela, 18_603.29, 0.01, 'P1')
  perto(r.ultimaParcela, (F / n) * (1 + i), 1e-6, 'Pn'); perto(r.ultimaParcela, 10_587.22, 0.01, 'Pn')
  perto(r.juros, r.jurosCarencia + (i * F * (n + 1)) / 2, 1e-6, 'juros totais = carência + SAC fechado'); perto(r.juros, 300_429.02, 0.01, 'juros')
  perto(r.total, 800_429.02, 0.01, 'total'); assert.equal(r.iof, 0); assert.equal(r.correcao, 0)
})

// Cenário 2: TFB, Price, sem carência, 24 meses, IOF de pessoa jurídica (padrão), participação de 80%.
test('cenário 2 · TFB, Price sem carência, participação de 80% e IOF de pessoa jurídica conferido por fora', () => {
  const r = simular({ valor: 500_000, participacao: 80, prazo: 24, carencia: 0, custo: 'tfb', custoFinanceiro: 15.906, taxaBndes: 1.25, taxaAgente: 2.5, sistema: 'price', periodicidade: 1 })
  assert.ok(r.ok); assert.equal(r.financiado, 400_000); assert.equal(r.recursosProprios, 100_000)
  const i = mensal(taxaFinal(15.906, 1.25, 2.5)), n = 24, pmt = (400_000 * i) / (1 - (1 + i) ** -n)
  perto(r.primeiraParcela, pmt, 1e-6, 'PMT'); perto(r.ultimaParcela, pmt, 1e-6, 'PMT final')
  assert.ok(r.parcelas.every((p) => Math.abs(p.parcela - pmt) < 1e-6), 'Price: todas iguais')
  perto(r.juros, pmt * n - 400_000, 1e-6, 'juros do Price')
  // IOF: 0,38% sobre o financiado + 0,0082% ao dia sobre o principal de cada parcela (dias = k × 365/12, teto 365)
  let saldo = 400_000, base = 0
  for (let k = 1; k <= n; k++) { const amort = pmt - saldo * i; saldo -= amort; base += amort * Math.min(Math.round((k * 365) / 12), 365) }
  perto(r.iofFixo, 400_000 * 0.0038, 1e-6, 'IOF fixo'); perto(r.iofDiario, (base * 0.0082) / 100, 1e-6, 'IOF diário'); perto(r.iof, r.iofFixo + r.iofDiario, 1e-9, 'IOF')
  perto(r.total, 400_000 + r.juros + r.iof, 1e-6, 'total')
  assert.equal(IOF_PJ.fixed, 0.38); assert.equal(IOF_PJ.daily, 0.0082)
})

// Cenário 3: carência de 7 meses com juros trimestrais (paga nos meses 3, 6 e 7) e SAC; carência mensal; semestral.
test('cenário 3 · carência que não é múltiplo da periodicidade; carência mensal; semestral', () => {
  const F = 120_000, taxa = 12.6825, i = mensal(taxa)
  const tri = cronograma({ financiado: F, prazo: 24, carencia: 7, taxaAnual: taxa, sistema: 'sac', periodicidade: 3 })
  const t = +(F * ((1 + i) ** 3 - 1)).toFixed(2)
  assert.deepEqual(tri.slice(0, 7).map((p) => +p.parcela.toFixed(2)), [0, 0, t, 0, 0, t, +(F * i).toFixed(2)])
  assert.ok(tri.slice(0, 7).every((p) => p.carencia && p.amortizacao === 0 && Math.abs(p.saldo - F) < 1e-9))
  const am = tri.slice(7)
  assert.equal(am.length, 17); assert.ok(am.every((p) => Math.abs(p.amortizacao - F / 17) < 1e-6)); perto(am.at(-1).saldo, 0, 1e-6, 'saldo')
  const mes = cronograma({ financiado: 100_000, prazo: 12, carencia: 2, taxaAnual: taxa, sistema: 'sac', periodicidade: 1 })
  assert.deepEqual(mes.slice(0, 2).map((p) => +p.juros.toFixed(2)), [1000, 1000], 'mensal: juros simples todo mês (12,6825% a.a. = 1% a.m.)')
  const sem = cronograma({ financiado: 100_000, prazo: 18, carencia: 6, taxaAnual: taxa, sistema: 'sac', periodicidade: 6 })
  perto(sem[5].parcela, 100_000 * ((1 + i) ** 6 - 1), 1e-6, 'semestral: um pagamento no mês 6'); assert.ok(sem.slice(0, 5).every((p) => p.parcela === 0))
})

// Cenário 4: TLP + IPCA, SAC, carência de 6 meses semestral: saldo corrigido pelo IPCA todo mês, juros reais sobre o saldo corrigido,
// amortização = saldo corrigido ÷ parcelas vincendas (fórmula fechada: amort_k = F(1+c)^(carência+k) / n).
test('cenário 4 · TLP com saldo corrigido pelo IPCA (SAC): parcelas, correção e total pela fórmula fechada', () => {
  const F = 300_000, tlp = 7.72, ipca = 4.5, prazo = 36, car = 6, n = prazo - car
  const r = simular({ valor: F, participacao: 100, prazo, carencia: car, custo: 'tlp', custoFinanceiro: tlp, ipca, taxaBndes: 1.25, taxaAgente: 3, sistema: 'sac', periodicidade: 6, iof: SEM_IOF })
  assert.ok(r.ok)
  const i = mensal(taxaFinal(tlp, 1.25, 3)), c = mensal(ipca)
  let saldo = F, acum = 0
  for (let m = 1; m <= car; m++) { saldo *= 1 + c; acum = (saldo + acum) * i + acum }
  perto(r.parcelas[5].parcela, acum, 1e-6, 'juros do semestre de carência'); perto(r.parcelas[5].saldo, F * (1 + c) ** car, 1e-6, 'saldo corrigido na carência')
  let correcaoTotal = F * ((1 + c) ** car - 1), jurosTotal = acum, somaAmort = 0
  for (let k = 1; k <= n; k++) {
    const p = r.parcelas[car + k - 1]
    const Sk = F * (1 + c) ** (car + k) * ((n - k + 1) / n)
    perto(p.amortizacao, (F * (1 + c) ** (car + k)) / n, 1e-6, `amortização ${k}`)
    perto(p.juros, Sk * i, 1e-6, `juros ${k}`)
    correcaoTotal += F * (1 + c) ** (car + k - 1) * ((n - k + 1) / n) * c
    jurosTotal += Sk * i; somaAmort += p.amortizacao
  }
  perto(r.correcao, correcaoTotal, 1e-4, 'correção total'); perto(r.juros, jurosTotal, 1e-4, 'juros totais')
  perto(somaAmort, F + r.correcao, 1e-4, 'as amortizações devolvem o principal corrigido'); perto(r.parcelas.at(-1).saldo, 0, 1e-6, 'saldo final')
  perto(r.total, F + r.correcao + r.juros, 1e-6, 'total')
  assert.ok(r.ultimaParcela > r.primeiraParcela * 0.8, 'com IPCA as parcelas caem menos que no SAC nominal')
  perto(r.taxaNominal, tlpNominal(r.taxa, ipca), 1e-9, 'nominal')
  const zero = simular({ valor: F, participacao: 100, prazo, carencia: car, custo: 'tlp', custoFinanceiro: tlp, ipca: 0, taxaBndes: 1.25, taxaAgente: 3, sistema: 'sac', periodicidade: 6, iof: SEM_IOF })
  assert.equal(zero.correcao, 0); perto(zero.primeiraParcela, F / n + F * i, 1e-6, 'sem IPCA vira SAC nominal')
})

// Cenário 5: o caso da conferência independente em TLP (R$ 500 mil, 60/12 trimestral, TLP 7,72 + IPCA 5,2166, SAC).
test('cenário 5 · TLP, SAC, carência trimestral: números da conferência independente', () => {
  const r = simular({ valor: 500_000, participacao: 100, prazo: 60, carencia: 12, custo: 'tlp', custoFinanceiro: 7.72, ipca: 5.2166, taxaBndes: 1.25, taxaAgente: 3, sistema: 'sac', periodicidade: 3, iof: SEM_IOF })
  perto(r.primeiraParcela, 16_153.83, 0.01, 'P1'); perto(r.ultimaParcela, 13_563.16, 0.01, 'Pn')
  assert.ok(r.correcao > 80_000 && r.correcao < 90_000, 'correção pelo IPCA em 5 anos'); perto(r.total, 500_000 + r.correcao + r.juros, 1e-6, 'total')
  // IOF na TLP: sobre o principal entregue, não sobre a amortização corrigida; com 12 de carência toda parcela passa de 365 dias,
  // então o diário é o teto: 500.000 × 365 × 0,0082% = 14.965,00; mais 0,38% = 1.900,00 → 16.865,00 (igual ao mesmo prazo em TFB)
  const comIof = simular({ valor: 500_000, participacao: 100, prazo: 60, carencia: 12, custo: 'tlp', custoFinanceiro: 7.72, ipca: 5.2166, taxaBndes: 1.25, taxaAgente: 3, sistema: 'sac', periodicidade: 3 })
  perto(comIof.iofFixo, 1_900, 1e-6, 'IOF fixo'); perto(comIof.iofDiario, 14_965, 1e-6, 'IOF diário no teto'); perto(comIof.iof, 16_865, 1e-6, 'IOF TLP')
  const tfb = simular({ valor: 500_000, participacao: 100, prazo: 60, carencia: 12, custo: 'tfb', custoFinanceiro: 16.5216, taxaBndes: 1.25, taxaAgente: 3, sistema: 'sac', periodicidade: 3 })
  perto(tfb.iof, comIof.iof, 1e-6, 'o IOF não depende do IPCA')
  perto(comIof.total, 500_000 + comIof.correcao + comIof.juros + 16_865, 1e-6, 'total com IOF')
})

// Cenário 6: Price com saldo corrigido (prestação recalculada sobre o saldo corrigido) e composição somada.
test('cenário 6 · TLP com Price: prestação cresce com o IPCA e zera o saldo; composição somada muda a taxa, não a estrutura', () => {
  const r = simular({ valor: 200_000, participacao: 100, prazo: 24, carencia: 0, custo: 'tlp', custoFinanceiro: 7.72, ipca: 4, taxaBndes: 1.25, taxaAgente: 2, sistema: 'price', periodicidade: 1, iof: SEM_IOF })
  const i = mensal(taxaFinal(7.72, 1.25, 2)), c = mensal(4)
  const pmt1 = (200_000 * (1 + c) * i) / (1 - (1 + i) ** -24)
  perto(r.parcelas[0].parcela, pmt1, 1e-6, 'P1'); perto(r.parcelas[1].parcela, pmt1 * (1 + c), 1e-6, 'P2'); perto(r.parcelas.at(-1).parcela, pmt1 * (1 + c) ** 23, 1e-6, 'P24')
  perto(r.parcelas.at(-1).saldo, 0, 1e-6, 'saldo')
  perto(r.parcelas.reduce((a, p) => a + p.principal, 0), 200_000, 1e-6, 'Price corrigido: os principais somam o financiado')
  // IOF sem carência: dias crescem 30, 61, 91… até 365 a partir da 12ª parcela; base = Σ principal_k × dias_k
  const pj = simular({ valor: 200_000, participacao: 100, prazo: 24, carencia: 0, custo: 'tlp', custoFinanceiro: 7.72, ipca: 4, taxaBndes: 1.25, taxaAgente: 2, sistema: 'price', periodicidade: 1 })
  const base = pj.parcelas.reduce((a, p) => a + p.principal * Math.min(Math.round((p.mes * 365) / 12), 365), 0)
  perto(pj.iofDiario, (base * 0.0082) / 100, 1e-6, 'IOF diário sobre o principal'); assert.ok(pj.iof < 200_000 * 0.03373 + 1e-6)
  const somada = simular({ valor: 200_000, participacao: 100, prazo: 24, carencia: 0, custo: 'tlp', custoFinanceiro: 7.72, ipca: 4, taxaBndes: 1.25, taxaAgente: 2, sistema: 'price', periodicidade: 1, composicao: 'somada', iof: SEM_IOF })
  perto(somada.taxa, 10.97, 1e-9, 'somada'); assert.ok(somada.taxa < r.taxa && somada.juros < r.juros)
})

test('invariantes em 72 combinações: saldo zera, amortizações devolvem o principal (corrigido), total fecha, SAC decresce, Price constante quando nominal', () => {
  let casos = 0
  for (const custo of ['tfb', 'tlp']) for (const sistema of ['sac', 'price']) for (const periodicidade of [1, 3, 6]) for (const carencia of [0, 5, 12]) for (const composicao of ['capitalizada', 'somada']) {
    const r = simular({ valor: 750_000, participacao: 90, prazo: 48, carencia, custo, custoFinanceiro: custo === 'tfb' ? 17.01 : 7.72, ipca: 4.52, taxaBndes: 1.25, taxaAgente: 3.5, sistema, periodicidade, composicao })
    assert.ok(r.ok, `${custo} ${sistema} ${periodicidade} ${carencia}`)
    casos++
    const nominal = custo === 'tfb'
    perto(r.parcelas.at(-1).saldo, 0, 1e-6, 'saldo final')
    assert.equal(r.parcelas.length, 48); assert.equal(r.parcelasAmortizacao, 48 - carencia)
    perto(r.parcelas.reduce((a, p) => a + p.amortizacao, 0), r.financiado + r.correcao, 1e-4, 'amortizações = principal corrigido')
    perto(r.total, r.financiado + r.correcao + r.juros + r.iof, 1e-6, 'total')
    assert.ok(r.parcelas.filter((p) => p.carencia).every((p) => p.amortizacao === 0), 'sem amortização na carência')
    const pagas = r.parcelas.filter((p) => p.carencia && p.parcela > 0).map((p) => p.mes)
    assert.deepEqual(pagas, Array.from({ length: carencia }, (_, k) => k + 1).filter((m) => m % periodicidade === 0 || m === carencia), 'juros pagos na periodicidade')
    const am = r.parcelas.filter((p) => !p.carencia)
    if (nominal && sistema === 'sac') assert.ok(am.every((p, k) => k === 0 || p.parcela < am[k - 1].parcela), 'SAC decrescente')
    if (nominal && sistema === 'price') assert.ok(am.every((p) => Math.abs(p.parcela - am[0].parcela) < 1e-6), 'Price constante')
    if (!nominal) assert.ok(r.correcao > 0 && r.taxaNominal > r.taxa)
    assert.ok(r.iof > 0 && r.iof <= (r.financiado * (IOF_PJ.fixed + IOF_PJ.maxDays * IOF_PJ.daily)) / 100 + 1e-6, 'IOF PJ dentro do teto legal (0,38% + 365 × 0,0082% = 3,373% do principal)')
    perto(r.parcelas.reduce((a, p) => a + p.principal, 0), r.financiado, 1e-4, 'os principais (sem correção) devolvem o financiado')
  }
  assert.equal(casos, 72)
  const z = simular({ valor: 100_000, participacao: 100, prazo: 12, carencia: 0, custo: 'tfb', custoFinanceiro: 15.9, taxaBndes: 1.25, taxaAgente: 3, sistema: 'sac', iof: SEM_IOF })
  assert.equal(z.iof, 0); assert.equal(iofCronograma(100_000, z.parcelas, SEM_IOF).total, 0)
  const ruim = simular({ valor: 500_000, participacao: 100, prazo: 90, carencia: 30, custo: 'tlp', custoFinanceiro: 7.72, ipca: 4, taxaBndes: 1.25, taxaAgente: 3 })
  assert.equal(ruim.ok, false); assert.equal(ruim.erros.length, 2)
  assert.match(simular({ valor: 500_000, participacao: 100, prazo: 12, carencia: 0, custo: 'tfb', custoFinanceiro: null, taxaBndes: 1.25, taxaAgente: 3 }).erros[0], /custo financeiro/)
  assert.match(simular({ valor: 500_000, participacao: 100, prazo: 12, carencia: 0, custo: 'tlp', custoFinanceiro: 7.72, ipca: NaN, taxaBndes: 1.25, taxaAgente: 3 }).erros[0], /IPCA/)
  assert.match(simular({ valor: 500_000, participacao: 100, prazo: 12, carencia: 0, custo: 'tfb', custoFinanceiro: 16, taxaBndes: 1.25, taxaAgente: 3, iof: { fixed: NaN, daily: 0 } }).erros[0], /IOF/)
  assert.equal(iofCronograma(1000, [{ mes: 24, amortizacao: 1000, principal: 1000 }], { fixed: 0, daily: 0.01, maxDays: 100 }).diario, 10, 'maxDays do parâmetro é respeitado: 1.000 × 100 dias × 0,01%')
})
