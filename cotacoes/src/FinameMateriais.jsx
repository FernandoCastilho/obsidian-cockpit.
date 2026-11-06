import { useState } from 'react'
import MoneyInput from './MoneyInput.jsx'
import { parseMoneyInput } from './moneyInput.js'
import { parseDecimal } from './emprestimo.js'
import { useDataFile } from './useDataFile.js'
import { useMacro } from './useMacro.js'
import { keyOf, pointsOf, tlpView } from './bndes.js'
import { COMPOSICOES, CUSTOS, CUSTOS_FIXOS, FONTES, PERIODICIDADES, PORTES, REGRAS, SISTEMAS, TFC_NOMES, codigoTfc, faixaTfb, faixaTfc, ipcaEsperado, parseIpcaProjection, simular, spreadSobreCdi, tlpNominal, validIpcaProjection, vencimento } from './finameMateriais.js'
import { nf } from './format.js'
import Estado from './Estado.jsx'
import Help from './Help.jsx'

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v, d = 2) => `${nf(v, d)}%`
const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')
const data = (d) => d.toLocaleDateString('pt-BR')

// Ícone: caixa de materiais com a marca do BNDES (barras) ao lado.
export function FinameIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8l9-4 9 4-9 4-9-4z" /><path d="M3 8v8l9 4 9-4V8" /><path d="M12 12v8" />
    </svg>
  )
}

// Calculadoras › BNDES Finame Materiais: condições do produto (prazo, carência, custo financeiro, taxas), resultado e fluxo
// parcela a parcela. O custo financeiro vem do painel: TFC ou TFB da faixa de prazo (aba BNDES) ou TLP + IPCA esperado (Focus).
// As explicações ficam no "?" ao lado de cada rótulo; na tela só os valores.
export default function FinameMateriais({ onBack }) {
  const bndes = useDataFile('bndes.json')
  const moedas = useDataFile('moedas.json')
  const macro = useMacro()
  const [valorText, setValorText] = useState('500.000,00')
  const [partText, setPartText] = useState('100')
  const [prazoText, setPrazoText] = useState('60')
  const [carText, setCarText] = useState('12')
  const [custo, setCusto] = useState('tfc')
  const [liberacao, setLiberacao] = useState(30)
  const [porte, setPorte] = useState('mpme')
  const [bndesText, setBndesText] = useState(String(REGRAS.taxaBndes.mpme).replace('.', ','))
  const [agenteText, setAgenteText] = useState('3,00')
  const [ipcaText, setIpcaText] = useState('')
  const [sistema, setSistema] = useState('sac')
  const [periodicidade, setPeriodicidade] = useState(3)
  const [composicao, setComposicao] = useState('capitalizada')
  const [iofFixoText, setIofFixoText] = useState('0')
  const [iofDiarioText, setIofDiarioText] = useState('0')
  const [hoje] = useState(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d })

  const money = parseMoneyInput(valorText)
  const participacao = parseDecimal(partText)
  const prazo = /^\d+$/.test(prazoText.trim()) ? Number(prazoText) : null
  const carencia = /^\d+$/.test(carText.trim()) ? Number(carText) : null
  const taxaBndes = parseDecimal(bndesText)
  const taxaAgente = parseDecimal(agenteText)
  const iofFixo = parseDecimal(iofFixoText), iofDiario = parseDecimal(iofDiarioText)

  // Custo financeiro do painel
  const faixa = prazo ? faixaTfb(prazo) : 60
  const tfbPts = pointsOf(bndes.data, keyOf(faixa, liberacao))
  const tfb = tfbPts.length ? { data: tfbPts.at(-1)[0], valor: tfbPts.at(-1)[1] } : null
  const tlp = tlpView(bndes.data)
  const tfcCodigo = codigoTfc(porte, prazo ?? 60)
  const tfcPts = Array.isArray(moedas.data?.series?.[tfcCodigo]?.points) ? moedas.data.series[tfcCodigo].points : []
  const tfc = tfcPts.length ? { data: tfcPts.at(-1)[0], valor: tfcPts.at(-1)[1], codigo: tfcCodigo, nome: TFC_NOMES[tfcCodigo], faixa: faixaTfc(prazo ?? 60) } : null
  const fixa = CUSTOS_FIXOS.has(custo)
  const focusIpca = ipcaEsperado(macro.data?.focus)
  const ipcaFocus = focusIpca?.valor ?? null
  const ipca = ipcaText.trim() ? parseIpcaProjection(ipcaText) : ipcaFocus
  const cdi = Array.isArray(macro.data?.cdi) && macro.data.cdi.length ? macro.data.cdi.at(-1)[1] : null
  // Na TFB, o custo financeiro é a própria TFB (nominal). Na TLP, é a TLP (real); o IPCA corrige o saldo no cronograma.
  const custoFinanceiro = custo === 'tfb' ? tfb?.valor ?? null : custo === 'tfc' ? tfc?.valor ?? null : tlp?.value ?? null
  const nominalTlp = custo === 'tlp' && Number.isFinite(custoFinanceiro) && Number.isFinite(ipca) ? tlpNominal(custoFinanceiro, ipca) : null

  const erros = {
    valor: money.ok && money.value > 0 ? null : money.error || 'Informe um valor maior que zero.',
    part: participacao !== null && participacao >= REGRAS.participacaoMinPct && participacao <= 100 ? null : 'Participação de 1 a 100%.',
    prazo: prazo !== null && prazo >= 1 && prazo <= REGRAS.prazoMaxMeses ? null : `Prazo de 1 a ${REGRAS.prazoMaxMeses} meses (7 anos).`,
    car: carencia !== null && carencia >= 0 && carencia <= (fixa ? REGRAS.carenciaMaxTfbMeses : REGRAS.carenciaMaxMeses) && (prazo === null || carencia < prazo) ? null : `Carência de 0 a ${fixa ? REGRAS.carenciaMaxTfbMeses : REGRAS.carenciaMaxMeses} meses${fixa ? ` com ${custo.toUpperCase()}` : ''}, menor que o prazo.`,
    bndes: taxaBndes !== null && taxaBndes <= 100 ? null : 'Informe a taxa do BNDES em % a.a.',
    agente: taxaAgente !== null && taxaAgente <= 100 ? null : 'Informe o spread da instituição em % a.a.',
    ipca: custo === 'tlp' && !validIpcaProjection(ipca) ? 'Informe o IPCA esperado de -50 a 100% a.a., limite deste modelo.' : null,
    iof: iofFixo !== null && iofFixo <= 100 && iofDiario !== null && iofDiario <= 100 ? null : 'Informe as alíquotas do IOF em %: 0 e 0 na alíquota zero (padrão), ou 0,38 e 0,0082 se o agente cobrar.',
  }
  const pronto = !Object.values(erros).some(Boolean) && Number.isFinite(custoFinanceiro)
  const r = pronto ? simular({ valor: money.value, participacao, prazo, carencia, custo, custoFinanceiro, ipca: custo === 'tlp' ? ipca : 0, taxaBndes, taxaAgente, sistema, periodicidade, composicao, iof: { fixed: iofFixo, daily: iofDiario } }) : null
  const res = r?.ok ? r : null
  const spread = res ? spreadSobreCdi(res.taxaNominal, cdi) : null

  const ajuda = (label, texto) => (texto ? <Help label={`Ajuda: ${label}`}>{texto}</Help> : null)
  const field = (key, label, control, hint, valor) => (
    <div className="cx-field">
      <span className="fm-rotulo"><label htmlFor={`fm-${key}`}>{label}</label>{ajuda(label, hint)}</span>
      {control}
      {valor && <p className="cx-hint fm-custo-valor">{valor}</p>}
      <p className="cx-error" id={`fm-${key}-err`} role={erros[key] ? 'alert' : undefined}>{erros[key] ?? ''}</p>
    </div>
  )
  const seg = (id, label, hint, botoes, extra = null) => (
    <div className="cx-field">
      <span className="fm-rotulo"><span className="cx-label" id={`fm-${id}-l`}>{label}</span>{ajuda(label, hint)}</span>
      <div className="seg" role="group" aria-labelledby={`fm-${id}-l`}>{botoes}</div>
      {extra}
    </div>
  )
  const input = (key, value, onChange, extra = {}) => <input id={`fm-${key}`} inputMode="decimal" autoComplete="off" aria-invalid={!!erros[key]} aria-describedby={`fm-${key}-err`} value={value} onChange={(e) => onChange(e.target.value)} onFocus={(e) => e.target.select()} {...extra} />

  return (
    <section className="cx cx-finame" aria-labelledby="calc-h">
      <button type="button" className="cx-back" onClick={onBack}><span aria-hidden="true">‹</span> Calculadoras</button>
      <h2 id="calc-h" className="cx-title"><span className="cx-icon" aria-hidden="true"><FinameIcon /></span>BNDES Finame Materiais</h2>

      <article className="desk-panel cx-panel">
        <header><h3>Condições gerais</h3><small>Regras do produto conferidas em {dmy(REGRAS.conferidoEm)}</small></header>
        <div className="cx-form">
          {field('valor', 'Valor dos materiais', <MoneyInput id="fm-valor" aria-invalid={!!erros.valor} aria-describedby="fm-valor-err" value={valorText} onChange={setValorText} />, 'Bens industrializados novos, nacionais, enquadrados na lista NCM e nos critérios CST/CSOSN do Finame Materiais; não se trata do credenciamento CFI do Finame tradicional. Notas de até 12 meses antes do protocolo.')}
          {field('part', 'Participação do BNDES (%)', input('part', partText, setPartText), 'Até 100% dos itens financiáveis.')}
          {field('prazo', 'Prazo total (meses)', input('prazo', prazoText, setPrazoText, { inputMode: 'numeric' }), 'Até 84 meses (7 anos).')}
          {field('car', 'Carência (meses)', input('car', carText, setCarText, { inputMode: 'numeric' }), fixa ? `Até 12 meses com ${custo.toUpperCase()}; juros exigíveis durante a carência.` : 'Até 24 meses; juros exigíveis durante a carência.')}
          {seg('custo', 'Custo financeiro', `${CUSTOS.find((c) => c.id === custo).hint} Selic suspensa como custo financeiro (${REGRAS.selicSuspensa}).`,
            CUSTOS.map((c) => <button key={c.id} type="button" aria-pressed={custo === c.id} onClick={() => setCusto(c.id)}>{c.label}</button>))}
          {custo === 'tfc' ? (
            <div className="cx-field">
              <span className="fm-rotulo"><span className="cx-label">TFC · série do BNDES</span>{ajuda('TFC · série do BNDES', 'Série das Moedas Contratuais do BNDES escolhida pelo porte (MPME tem série própria) e pela faixa de prazo: TFC_60.90 ou TFC_MPME_60.90 até 60 meses; TFC_120.90 ou TFC_MPME_120.90 de 61 a 120 meses. Valor do último dia publicado, coletado pelo painel (aba BNDES).')}</span>
              <p className="cx-hint fm-custo-valor">{tfc ? <>{tfc.nome} ({tfc.codigo}), {PORTES.find((p) => p.id === porte).mpme ? 'MPME' : 'grande empresa'}, faixa {tfc.faixa === 60 ? 'até 60' : '61 a 120'} meses: <b>{pct(tfc.valor, 4)} a.a.</b> em {dmy(tfc.data)}.</> : moedas.status === 'loading' ? 'Carregando a TFC…' : 'TFC indisponível no painel; a conta fica sem custo financeiro.'}</p>
            </div>
          ) : custo === 'tfb' ? (
            seg('lib', 'TFB · liberação dos recursos', 'Prazo entre a contratação e a liberação dos recursos pelo BNDES: a TFB é cotada por faixa de prazo do financiamento e por liberação em 30 ou 90 dias. Valor do último dia publicado, coletado pelo painel (aba BNDES).',
              [30, 90].map((d) => <button key={d} type="button" aria-pressed={liberacao === d} onClick={() => setLiberacao(d)}>{d} dias</button>),
              <p className="cx-hint fm-custo-valor">{tfb ? <>TFB da faixa de {faixa} meses: <b>{pct(tfb.valor, 4)} a.a.</b> em {dmy(tfb.data)}.</> : bndes.status === 'loading' ? 'Carregando a TFB…' : 'TFB indisponível no painel; a conta fica sem custo financeiro.'}</p>)
          ) : (
            field('ipca', 'IPCA esperado (% a.a.)', input('ipca', ipcaText, setIpcaText, { placeholder: Number.isFinite(ipcaFocus) ? nf(ipcaFocus, 2) : '4,50' }),
              'Projeção da inflação usada para corrigir o saldo na TLP. Vem preenchida com a mediana do Focus para o ano seguinte; pode ser alterada. O contrato corrige o saldo pelo IPCA efetivo e cobra a TLP (parcela real) sobre o saldo corrigido.',
              tlp ? <>TLP <b>{pct(tlp.value, 2)} a.a.</b> ({dmy(tlp.date)}){focusIpca ? <> · IPCA esperado pelo Focus para {focusIpca.ano}: <b>{pct(ipcaFocus, 2)}</b></> : null}{Number.isFinite(nominalTlp) ? <> · ≈ {pct(nominalTlp, 2)} a.a. nominal (projeção)</> : null}</> : 'TLP indisponível no painel.')
          )}
          {seg('porte', 'Taxa do BNDES · porte e região', '0,95% a.a. para MPMEs no Norte e Nordeste; 1,25% a.a. para MPMEs nas demais regiões e para grandes empresas (página do produto em 04/11/2026; a mudança de 1,15% para 1,25% em 22/01/2026 é informada pela Abimaq). O porte também escolhe a série da TFC. Editável.',
            PORTES.map((p) => <button key={p.id} type="button" aria-pressed={porte === p.id} onClick={() => { setPorte(p.id); setBndesText(String(p.taxa).replace('.', ',')) }}>{p.label}</button>),
            <><div className="cx-rate">{input('bndes', bndesText, setBndesText, { 'aria-label': 'Taxa do BNDES (% a.a.)' })}<span className="fm-unidade">% a.a.</span></div><p className="cx-error" id="fm-bndes-err" role={erros.bndes ? 'alert' : undefined}>{erros.bndes ?? ''}</p></>)}
          {field('agente', 'Spread da instituição financeira (% a.a.)', <div className="cx-rate">{input('agente', agenteText, setAgenteText)}<span className="fm-unidade">% a.a.</span></div>, 'É a "taxa do agente financeiro" na nomenclatura do BNDES: a remuneração do banco, negociada com o cliente conforme risco, garantias e relacionamento; não há teto público. Compõe a taxa final junto com o custo financeiro e a taxa do BNDES.')}
          {seg('sis', 'Sistema de amortização', `SAC: ${SISTEMAS[0].hint}. Price: ${custo === 'tlp' ? 'parcelas iguais em termos reais, que crescem com o IPCA' : SISTEMAS[1].hint}. Parcelas mensais após a carência.`,
            SISTEMAS.map((s) => <button key={s.id} type="button" aria-pressed={sistema === s.id} onClick={() => setSistema(s.id)}>{s.label}</button>))}
          {seg('per', 'Juros na carência', 'Juros exigíveis durante a carência, pagos na periodicidade escolhida; dentro do período, capitalizados mês a mês.',
            PERIODICIDADES.map((p) => <button key={p.id} type="button" aria-pressed={periodicidade === p.id} onClick={() => setPeriodicidade(p.id)}>{p.label}</button>))}
          {seg('comp', 'Composição da taxa', `Capitalizada: ${COMPOSICOES[0].hint}. Somada: ${COMPOSICOES[1].hint}.`,
            COMPOSICOES.map((c) => <button key={c.id} type="button" aria-pressed={composicao === c.id} onClick={() => setComposicao(c.id)}>{c.label}</button>))}
          <details className="cx-iof">
            <summary>IOF (padrão: alíquota zero)</summary>
            <p className="cx-hint fm-iof-nota fm-rotulo">Padrão: alíquota zero (art. 8º, IX).{ajuda('IOF', `${REGRAS.iof}.`)}</p>
            <div className="cx-iof-fields">
              <div className="cx-field">
                <label htmlFor="fm-iof-fixo">Adicional, uma vez (%)</label>
                {input('iof-fixo', iofFixoText, setIofFixoText, { 'aria-invalid': !!erros.iof, 'aria-describedby': 'fm-iof-err' })}
              </div>
              <div className="cx-field">
                <label htmlFor="fm-iof-diario">Diária (% ao dia)</label>
                {input('iof-diario', iofDiarioText, setIofDiarioText, { 'aria-invalid': !!erros.iof, 'aria-describedby': 'fm-iof-err' })}
              </div>
            </div>
            <p className="cx-error" id="fm-iof-err" role={erros.iof ? 'alert' : undefined}>{erros.iof ?? ''}</p>
          </details>
        </div>
      </article>

      <div className="cx-gap" aria-hidden="true" />

      <article className="desk-panel cx-panel" aria-live="polite">
        <header><h3>Resultado</h3></header>
        {!res && <p className="cx-hint cx-pad">{r?.erros?.length ? r.erros.join(' ') : 'Preencha as condições gerais.'}</p>}
        {res && (
          <>
            <div className="fm-grade">
              <div className="fm-kpi"><span className="fm-rotulo">{custo === 'tlp' ? 'Juros reais (sobre saldo corrigido)' : 'Taxa final'}{ajuda(custo === 'tlp' ? 'Juros reais' : 'Taxa final', custo === 'tlp' ? 'Taxa real composta: (1 + TLP) × (1 + BNDES) × (1 + spread) − 1, cobrada sobre o saldo corrigido pelo IPCA; a taxa nominal aproximada considera o IPCA projetado.' : `Taxa final composta: (1 + custo financeiro) × (1 + taxa do BNDES) × (1 + spread da instituição) − 1${composicao === 'somada' ? ', ou a soma das três quando a composição é somada' : ''}. A taxa mensal é a equivalente em meses de 1/12 do ano.`)}</span><b>{pct(res.taxa, 2)} a.a.</b><small>{pct(res.taxaMensal, 3)} a.m. · {pct(custoFinanceiro, 2)} {custo.toUpperCase()} + {pct(taxaBndes, 2)} BNDES + {pct(taxaAgente, 2)} spread da instituição, {composicao === 'somada' ? 'somadas' : 'capitalizadas'}{custo === 'tlp' ? ` · ≈ ${pct(res.taxaNominal, 2)} nominal com IPCA de ${pct(ipca, 2)}` : ''}</small></div>
              <div className="fm-kpi"><span className="fm-rotulo">Valor financiado{ajuda('Valor financiado', 'Valor dos materiais × participação do BNDES; o restante é recursos próprios do cliente.')}</span><b>{brl(res.financiado)}</b><small>{res.recursosProprios > 0 ? `${brl(res.recursosProprios)} de recursos próprios` : '100% dos itens financiáveis'}</small></div>
              <div className="fm-kpi"><span className="fm-rotulo">Juros na carência{ajuda('Juros na carência', 'Juros do período de carência, pagos na periodicidade escolhida (dentro do período, capitalizados mês a mês); sem amortização nesse período.')}</span><b>{brl(res.jurosCarencia)}</b><small>{carencia} {carencia === 1 ? 'mês' : 'meses'} · {PERIODICIDADES.find((p) => p.id === periodicidade).label.toLowerCase()}</small></div>
              <div className="fm-kpi"><span className="fm-rotulo">Parcelas{ajuda('Parcelas', 'Primeira parcela após a carência (juros + amortização). No SAC as parcelas caem; na Price são iguais em TFC e TFB e, na TLP, iguais em termos reais, crescendo com o IPCA.')}</span><b>{brl(res.primeiraParcela)}</b><small>{res.parcelasAmortizacao}x mensais{sistema === 'sac' ? ` · última ${brl(res.ultimaParcela)}` : custo === 'tlp' ? ` · última ${brl(res.ultimaParcela)} (crescem com o IPCA)` : ' · iguais'}</small></div>
              <div className="fm-kpi"><span className="fm-rotulo">Spread da instituição{ajuda('Spread da instituição', 'Remuneração do banco (a "taxa do agente financeiro" do BNDES). Em R$: juros com a taxa completa menos juros com custo financeiro + taxa do BNDES, no mesmo cronograma; a parte do BNDES é juros com custo + BNDES menos juros só com o custo, e o custo financeiro é o restante. Em pontos: quanto o spread acrescenta à taxa final, que na composição capitalizada é o spread multiplicado por (1 + custo) × (1 + BNDES).')}</span><b>{pct(taxaAgente, 2)} a.a.</b><small>{brl(res.atribuicao.agente)} dos juros ({pct((res.atribuicao.agente / res.juros) * 100, 1)}) · +{nf(res.spreadAgentePp, 2)} p.p. sobre custo + BNDES · BNDES {brl(res.atribuicao.bndes)} · custo financeiro {brl(res.atribuicao.custoFinanceiro)}</small></div>
              <div className="fm-kpi"><span className="fm-rotulo">Juros totais{ajuda('Juros totais', 'Soma dos juros da carência e das parcelas. Na TLP, a correção pelo IPCA do saldo é mostrada à parte e também compõe o pagamento final.')}</span><b>{brl(res.juros)}</b><small>{pct((res.juros / res.financiado) * 100, 1)} do financiado{custo === 'tlp' ? ` · correção pelo IPCA ${brl(res.correcao)} (projeção)` : ''}</small></div>
              <div className="fm-kpi"><span className="fm-rotulo">IOF{ajuda('IOF', 'Alíquota zero por padrão: operação com recursos da FINAME (Decreto 6.306/2007, art. 8º, IX). Se o agente cobrar, informe as alíquotas em IOF nas condições gerais.')}</span><b>{brl(res.iof)}</b><small>{res.iof > 0 ? `${brl(res.iofFixo)} adicional + ${brl(res.iofDiario)} diário` : 'alíquota zero (art. 8º, IX)'}</small></div>
              <div className="fm-kpi"><span className="fm-rotulo">Pagamento final{ajuda('Pagamento final', 'Valor financiado + juros totais + correção pelo IPCA (TLP) + IOF: tudo o que o cliente paga até a última parcela, sem tarifas, seguros ou garantias.')}</span><b>{brl(res.total)}</b><small>financiado + juros{custo === 'tlp' ? ' + correção IPCA' : ''}{res.iof > 0 ? ' + IOF' : ''}</small></div>
            </div>
            {spread != null && <p className="cx-hint cx-pad fm-rotulo">Equivale a <b>CDI + {pct(spread, 2)} a.a.</b>{ajuda('Equivale a CDI +', `Spread capitalizado sobre o CDI de hoje (${pct(cdi, 2)}) que dá a mesma taxa nominal: serve para comparar com o capital de giro.${custo === 'tlp' ? ' Na TLP, o custo real muda com o IPCA efetivo; a projeção usa o IPCA esperado.' : ''}`)}</p>}
            {res.avisos.map((a) => <Estado key={a} tipo="aviso">{a}</Estado>)}
          </>
        )}
      </article>

      {res && (
        <article className="desk-panel cx-panel fm-fluxo-panel">
          <header><h3>Fluxo parcela a parcela{ajuda('Fluxo parcela a parcela', `Vencimentos no mesmo dia de cada mês a partir da liberação, considerada hoje (${data(hoje)}); o agente define as datas reais. "Juros pagos" é o que vence no mês: na carência, os juros acumulam e são pagos na periodicidade escolhida. IOF adicional na liberação e IOF diário em cada parcela, quando houver${custo === 'tlp' ? '; correção pelo IPCA projetada, aplicada ao saldo antes dos juros' : ''}.`)}</h3></header>
          <div className="cx-wrap fm-fluxo" role="region" aria-label="Fluxo parcela a parcela" tabIndex={0}>
            <table className="cx-matrix fm-tabela">
              <thead><tr><th scope="col">Nº</th><th scope="col">Vencimento</th><th scope="col">Saldo inicial</th>{custo === 'tlp' && <th scope="col">Correção IPCA</th>}<th scope="col">Juros pagos</th><th scope="col">Amortização</th><th scope="col">Parcela</th><th scope="col">IOF</th><th scope="col">Total pago</th><th scope="col">Saldo final</th></tr></thead>
              <tbody>
                <tr className="fm-liberacao"><th scope="row">0 · liberação</th><td>{data(hoje)}</td><td>—</td>{custo === 'tlp' && <td>—</td>}<td>—</td><td>—</td><td>—</td><td>{brl(res.iofFixo)}</td><td>{brl(res.iofFixo)}</td><td>{brl(res.financiado)}</td></tr>
                {res.parcelas.map((p) => <tr key={p.mes} className={p.carencia ? 'fm-carencia' : undefined}><th scope="row">{p.mes}{p.carencia ? ' · carência' : ''}</th><td>{data(vencimento(hoje, p.mes))}</td><td>{brl(p.saldoInicial)}</td>{custo === 'tlp' && <td>{brl(p.correcao)}</td>}<td>{brl(p.juros)}</td><td>{brl(p.amortizacao)}</td><td>{brl(p.parcela)}</td><td>{brl(p.iof)}</td><td>{brl(p.pago)}</td><td>{brl(p.saldo)}</td></tr>)}
              </tbody>
              <tfoot><tr><th scope="row">Total</th><td>{res.parcelas.length} meses</td><td>—</td>{custo === 'tlp' && <td>{brl(res.correcao)}</td>}<td>{brl(res.juros)}</td><td>{brl(res.financiado + res.correcao)}</td><td>{brl(res.juros + res.financiado + res.correcao)}</td><td>{brl(res.iof)}</td><td>{brl(res.total)}</td><td>—</td></tr></tfoot>
            </table>
          </div>
        </article>
      )}

      <details className="fm-regras">
        <summary>Regras do produto e fontes</summary>
        <ul>
          <li><b>O que financia:</b> {REGRAS.itens}. Fora: {REGRAS.foraDoProduto}. Nacionalização: {REGRAS.nacionalizacao}.</li>
          <li><b>Quem pede:</b> empresas de qualquer porte sediadas no país, empresário individual, MEI, produtor rural pessoa física, administração pública, cooperativas, fundações e associações; operação indireta, por agente financeiro credenciado.</li>
          <li><b>Limites:</b> até {REGRAS.participacaoMaxPct}% dos itens; {brl(REGRAS.tetoCliente12m)} por cliente a cada 12 meses (da homologação); reembolso de notas emitidas até {REGRAS.reembolsoMeses} meses antes do protocolo. O teto de {brl(REGRAS.tetoOperacao)} por operação aparece em materiais do BNDES e da CNI (2020 a 2025), mas não consta na página oficial em 04/11/2026: a calculadora só avisa; confirme com o agente.</li>
          <li><b>Prazo:</b> até {REGRAS.prazoMaxMeses} meses, com até {REGRAS.carenciaMaxMeses} de carência ({REGRAS.carenciaMaxTfbMeses} com TFB, TFC ou TFC MPME). Juros exigíveis na carência; depois, SAC ou Price mensal com juros junto do principal.</li>
          <li><b>Taxa:</b> custo financeiro (TFB, TFBD, TLP, Taxa LCD, Taxa Fixa Composta ou Taxa Fixa Composta MPME; Selic suspensa pela {REGRAS.selicSuspensa}) + taxa do BNDES ({pct(REGRAS.taxaBndes['mpme-nne'])} MPME N/NE; {pct(REGRAS.taxaBndes.mpme)} MPME nas demais regiões e grandes) + spread da instituição financeira (a "taxa do agente financeiro" do BNDES), negociado. A calculadora traz TFC, TFB e TLP do painel; TFBD (dólar) e Taxa LCD ficam fora.</li>
          <li><b>IOF:</b> {REGRAS.iof}.</li>
          <li><b>Garantias:</b> livre negociação entre o agente e o cliente, observadas as normas do Banco Central; admitida a garantia do FGI (Tradicional ou PEAC) ou do FG BNDES-SEBRAE. Seguro conforme a política do agente.</li>
          <li><b>Conta:</b> taxa composta das três parcelas (capitalizada, padrão do BNDES: o exemplo oficial da página "Taxa de juros" é 1,07 × 1,015 × 1,03 − 1 = 11,86%; ou somada); taxa mensal por juros compostos em meses iguais de 1/12 do ano (o contrato apura por dias úteis: numa parcela isolada, com 19 a 23 dias úteis no mês, os juros do mês podem diferir em cerca de ±10% do valor aqui mostrado, e a diferença se compensa ao longo do ano; a base de apuração do contrato deve ser confirmada com o agente); juros da carência capitalizados dentro do período e pagos no fim dele; a parte dos juros que remunera cada um é apurada em camadas, no mesmo cronograma: custo financeiro = juros só com o custo; BNDES = juros com custo + BNDES menos juros só com o custo; spread da instituição = juros com a taxa completa menos juros com custo + BNDES; na TLP, o saldo é corrigido pelo IPCA todo mês e a amortização é calculada sobre o saldo corrigido (SAC = saldo ÷ parcelas vincendas); SAC ou Price mensal; IOF sobre o principal de cada parcela (sem a correção pelo IPCA) pelos dias até o vencimento, contando a carência e limitados a 365.</li>
          <li>O que ainda depende de conferência com o agente: valor mínimo, aceitação de Price no produto, periodicidade padrão dos juros na carência e a alíquota de IOF aplicável ao funding da operação. A conta aqui é estimativa; a proposta do agente prevalece.</li>
        </ul>
        <p className="fm-fontes-titulo">Base legal e onde cada regra foi conferida</p>
        <ul>{FONTES.map((f) => <li key={f.regra}><b>{f.regra}.</b> <a href={f.url} target="_blank" rel="noopener noreferrer">{f.fonte}</a>.</li>)}</ul>
      </details>
      <p className="status">Estimativa com as regras vigentes em {dmy(REGRAS.conferidoEm)} e os custos financeiros do painel (TFC, TFB e TLP da aba BNDES, IPCA esperado do Focus). Sem tarifas, seguros nem garantias. Origem dos dados em Configurações › Base de dados.</p>
    </section>
  )
}
