import { useState } from 'react'
import MoneyInput from './MoneyInput.jsx'
import { parseMoneyInput } from './moneyInput.js'
import { IOF_PJ, parseDecimal } from './emprestimo.js'
import { useDataFile } from './useDataFile.js'
import { useMacro } from './useMacro.js'
import { keyOf, pointsOf, tlpView } from './bndes.js'
import { COMPOSICOES, CUSTOS, FONTES, PERIODICIDADES, PORTES, REGRAS, SISTEMAS, faixaTfb, ipcaEsperado, simular, spreadSobreCdi, tlpNominal } from './finameMateriais.js'
import { nf } from './format.js'
import Estado from './Estado.jsx'

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v, d = 2) => `${nf(v, d)}%`
const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')

// Ícone: caixa de materiais com a marca do BNDES (barras) ao lado.
export function FinameIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8l9-4 9 4-9 4-9-4z" /><path d="M3 8v8l9 4 9-4V8" /><path d="M12 12v8" />
    </svg>
  )
}

// Calculadoras › BNDES Finame Materiais: condições do produto (prazo, carência, custo financeiro, taxas) e o resultado
// com cronograma. O custo financeiro vem do painel: TFB da faixa de prazo (aba BNDES) ou TLP + IPCA esperado (Focus).
export default function FinameMateriais({ onBack }) {
  const bndes = useDataFile('bndes.json')
  const macro = useMacro()
  const [valorText, setValorText] = useState('500.000,00')
  const [partText, setPartText] = useState('100')
  const [prazoText, setPrazoText] = useState('60')
  const [carText, setCarText] = useState('12')
  const [custo, setCusto] = useState('tfb')
  const [liberacao, setLiberacao] = useState(30)
  const [porte, setPorte] = useState('demais')
  const [bndesText, setBndesText] = useState(String(REGRAS.taxaBndes.demais).replace('.', ','))
  const [agenteText, setAgenteText] = useState('3,00')
  const [ipcaText, setIpcaText] = useState('')
  const [sistema, setSistema] = useState('sac')
  const [periodicidade, setPeriodicidade] = useState(3)
  const [composicao, setComposicao] = useState('capitalizada')
  const [iofFixoText, setIofFixoText] = useState(String(IOF_PJ.fixed).replace('.', ','))
  const [iofDiarioText, setIofDiarioText] = useState(String(IOF_PJ.daily).replace('.', ','))
  const [verCronograma, setVerCronograma] = useState(false)

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
  const focusIpca = ipcaEsperado(macro.data?.focus)
  const ipcaFocus = focusIpca?.valor ?? null
  const ipca = ipcaText.trim() ? parseDecimal(ipcaText) : ipcaFocus
  const cdi = Array.isArray(macro.data?.cdi) && macro.data.cdi.length ? macro.data.cdi.at(-1)[1] : null
  // Na TFB, o custo financeiro é a própria TFB (nominal). Na TLP, é a TLP (real); o IPCA corrige o saldo no cronograma.
  const custoFinanceiro = custo === 'tfb' ? tfb?.valor ?? null : tlp?.value ?? null
  const nominalTlp = custo === 'tlp' && Number.isFinite(custoFinanceiro) && Number.isFinite(ipca) ? tlpNominal(custoFinanceiro, ipca) : null

  const erros = {
    valor: money.ok ? null : money.error,
    part: participacao !== null && participacao >= REGRAS.participacaoMinPct && participacao <= 100 ? null : 'Participação de 1 a 100%.',
    prazo: prazo !== null && prazo >= 1 && prazo <= REGRAS.prazoMaxMeses ? null : `Prazo de 1 a ${REGRAS.prazoMaxMeses} meses (7 anos).`,
    car: carencia !== null && carencia >= 0 && carencia <= (custo === 'tfb' ? REGRAS.carenciaMaxTfbMeses : REGRAS.carenciaMaxMeses) && (prazo === null || carencia < prazo) ? null : `Carência de 0 a ${custo === 'tfb' ? REGRAS.carenciaMaxTfbMeses : REGRAS.carenciaMaxMeses} meses${custo === 'tfb' ? ' com TFB' : ''}, menor que o prazo.`,
    bndes: taxaBndes !== null && taxaBndes <= 100 ? null : 'Informe a taxa do BNDES em % a.a.',
    agente: taxaAgente !== null && taxaAgente <= 100 ? null : 'Informe a taxa do agente em % a.a.',
    ipca: custo === 'tlp' && !Number.isFinite(ipca) ? 'Informe o IPCA esperado em % a.a.' : null,
    iof: iofFixo !== null && iofFixo <= 100 && iofDiario !== null && iofDiario <= 100 ? null : 'Informe as alíquotas do IOF em %, por exemplo 0,38 e 0,0082 (0 e 0 se o agente confirmar alíquota zero).',
  }
  const pronto = !Object.values(erros).some(Boolean) && Number.isFinite(custoFinanceiro)
  const r = pronto ? simular({ valor: money.value, participacao, prazo, carencia, custo, custoFinanceiro, ipca: custo === 'tlp' ? ipca : 0, taxaBndes, taxaAgente, sistema, periodicidade, composicao, iof: { fixed: iofFixo, daily: iofDiario } }) : null
  const res = r?.ok ? r : null
  const spread = res ? spreadSobreCdi(res.taxaNominal, cdi) : null
  const sis = SISTEMAS.find((s) => s.id === sistema)

  const field = (key, label, control, hint) => (
    <div className="cx-field">
      <label htmlFor={`fm-${key}`}>{label}</label>
      {control}
      {hint && <p className="cx-hint">{hint}</p>}
      <p className="cx-error" id={`fm-${key}-err`} role={erros[key] ? 'alert' : undefined}>{erros[key] ?? ''}</p>
    </div>
  )
  const input = (key, value, onChange, extra = {}) => <input id={`fm-${key}`} inputMode="decimal" autoComplete="off" aria-invalid={!!erros[key]} aria-describedby={`fm-${key}-err`} value={value} onChange={(e) => onChange(e.target.value)} onFocus={(e) => e.target.select()} {...extra} />

  return (
    <section className="cx" aria-labelledby="calc-h">
      <button type="button" className="cx-back" onClick={onBack}><span aria-hidden="true">‹</span> Calculadoras</button>
      <h2 id="calc-h" className="cx-title"><span className="cx-icon" aria-hidden="true"><FinameIcon /></span>BNDES Finame Materiais</h2>

      <article className="desk-panel cx-panel">
        <header><h3>Condições gerais</h3><small>Regras do produto conferidas em {dmy(REGRAS.conferidoEm)}</small></header>
        <div className="cx-form">
          {field('valor', 'Valor dos materiais', <MoneyInput id="fm-valor" aria-invalid={!!erros.valor} aria-describedby="fm-valor-err" value={valorText} onChange={setValorText} />, 'Bens industrializados novos, nacionais e credenciados no BNDES; notas de até 12 meses antes do protocolo.')}
          {field('part', 'Participação do BNDES (%)', input('part', partText, setPartText), 'Até 100% dos itens financiáveis.')}
          {field('prazo', 'Prazo total (meses)', input('prazo', prazoText, setPrazoText, { inputMode: 'numeric' }), 'Até 84 meses (7 anos).')}
          {field('car', 'Carência (meses)', input('car', carText, setCarText, { inputMode: 'numeric' }), custo === 'tfb' ? 'Até 12 meses com TFB.' : 'Até 24 meses.')}
          <div className="cx-field">
            <span className="cx-label" id="fm-custo-l">Custo financeiro</span>
            <div className="seg" role="group" aria-labelledby="fm-custo-l">
              {CUSTOS.map((c) => <button key={c.id} type="button" aria-pressed={custo === c.id} onClick={() => setCusto(c.id)}>{c.label}</button>)}
            </div>
            <p className="cx-hint">{CUSTOS.find((c) => c.id === custo).hint} Selic suspensa como custo financeiro ({REGRAS.selicSuspensa}).</p>
          </div>
          {custo === 'tfb' ? (
            <div className="cx-field">
              <span className="cx-label" id="fm-lib-l">TFB · liberação dos recursos</span>
              <div className="seg" role="group" aria-labelledby="fm-lib-l">
                {[30, 90].map((d) => <button key={d} type="button" aria-pressed={liberacao === d} onClick={() => setLiberacao(d)}>{d} dias</button>)}
              </div>
              <p className="cx-hint fm-custo-valor">{tfb ? <>TFB da faixa de {faixa} meses: <b>{pct(tfb.valor, 4)} a.a.</b> em {dmy(tfb.data)} (aba BNDES).</> : bndes.status === 'loading' ? 'Carregando a TFB…' : 'TFB indisponível no painel; a conta fica sem custo financeiro.'}</p>
            </div>
          ) : (
            field('ipca', 'IPCA esperado (% a.a.)', input('ipca', ipcaText, setIpcaText, { placeholder: Number.isFinite(ipcaFocus) ? nf(ipcaFocus, 2) : '4,50' }), tlp ? `TLP ${pct(tlp.value, 2)} a.a. (${dmy(tlp.date)})${focusIpca ? ` + IPCA esperado pelo Focus para ${focusIpca.ano}: ${pct(ipcaFocus, 2)}` : ''}${Number.isFinite(nominalTlp) ? ` ≈ ${pct(nominalTlp, 2)} a.a. nominal (projeção; o contrato corrige o saldo pelo IPCA e cobra a TLP sobre o saldo corrigido)` : ''}.` : 'TLP indisponível no painel.')
          )}
          <div className="cx-field">
            <span className="cx-label" id="fm-porte-l">Taxa do BNDES · porte e região</span>
            <div className="seg" role="group" aria-labelledby="fm-porte-l">
              {PORTES.map((p) => <button key={p.id} type="button" aria-pressed={porte === p.id} onClick={() => { setPorte(p.id); setBndesText(String(p.taxa).replace('.', ',')) }}>{p.label}</button>)}
            </div>
            <div className="cx-rate">{input('bndes', bndesText, setBndesText)}<span className="fm-unidade">% a.a.</span></div>
            <p className="cx-hint">0,95% para MPMEs no Norte e Nordeste; 1,25% nas demais regiões e para grandes empresas (desde 22/01/2026).</p>
            <p className="cx-error" id="fm-bndes-err" role={erros.bndes ? 'alert' : undefined}>{erros.bndes ?? ''}</p>
          </div>
          {field('agente', 'Taxa do agente financeiro (% a.a.)', <div className="cx-rate">{input('agente', agenteText, setAgenteText)}<span className="fm-unidade">% a.a.</span></div>, 'Negociada com o cliente conforme risco, garantias e relacionamento; não há teto público.')}
          <div className="cx-field">
            <span className="cx-label" id="fm-sis-l">Sistema de amortização</span>
            <div className="seg" role="group" aria-labelledby="fm-sis-l">
              {SISTEMAS.map((s) => <button key={s.id} type="button" aria-pressed={sistema === s.id} onClick={() => setSistema(s.id)}>{s.label}</button>)}
            </div>
            <p className="cx-hint">{sis.hint}; parcelas mensais após a carência.</p>
          </div>
          <div className="cx-field">
            <span className="cx-label" id="fm-per-l">Juros na carência</span>
            <div className="seg" role="group" aria-labelledby="fm-per-l">
              {PERIODICIDADES.map((p) => <button key={p.id} type="button" aria-pressed={periodicidade === p.id} onClick={() => setPeriodicidade(p.id)}>{p.label}</button>)}
            </div>
            <p className="cx-hint">Juros exigíveis durante a carência, pagos na periodicidade escolhida.</p>
          </div>
          <div className="cx-field">
            <span className="cx-label" id="fm-comp-l">Composição da taxa</span>
            <div className="seg" role="group" aria-labelledby="fm-comp-l">
              {COMPOSICOES.map((c) => <button key={c.id} type="button" aria-pressed={composicao === c.id} onClick={() => setComposicao(c.id)}>{c.label}</button>)}
            </div>
            <p className="cx-hint">{COMPOSICOES.find((c) => c.id === composicao).hint}.</p>
          </div>
          <details className="cx-iof">
            <summary>Alíquotas do IOF (pessoa jurídica)</summary>
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
            <p className="cx-hint">{REGRAS.iof}.</p>
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
              <div className="fm-kpi"><span>{custo === 'tlp' ? 'Juros reais (sobre saldo corrigido)' : 'Taxa final'}</span><b>{pct(res.taxa, 2)} a.a.</b><small>{pct(res.taxaMensal, 3)} a.m. · {pct(custoFinanceiro, 2)} {custo === 'tlp' ? 'TLP' : 'TFB'} + {pct(taxaBndes, 2)} BNDES + {pct(taxaAgente, 2)} agente, {composicao === 'somada' ? 'somadas' : 'capitalizadas'}{custo === 'tlp' ? ` · ≈ ${pct(res.taxaNominal, 2)} nominal com IPCA de ${pct(ipca, 2)}` : ''}</small></div>
              <div className="fm-kpi"><span>Valor financiado</span><b>{brl(res.financiado)}</b><small>{res.recursosProprios > 0 ? `${brl(res.recursosProprios)} de recursos próprios` : '100% dos itens financiáveis'}</small></div>
              <div className="fm-kpi"><span>Juros na carência</span><b>{brl(res.jurosCarencia)}</b><small>{carencia} {carencia === 1 ? 'mês' : 'meses'} · {PERIODICIDADES.find((p) => p.id === periodicidade).label.toLowerCase()}</small></div>
              <div className="fm-kpi"><span>Parcelas</span><b>{brl(res.primeiraParcela)}</b><small>{res.parcelasAmortizacao}x mensais{sistema === 'sac' ? ` · última ${brl(res.ultimaParcela)}` : ' · iguais'}</small></div>
              <div className="fm-kpi"><span>Juros totais</span><b>{brl(res.juros)}</b><small>{pct((res.juros / res.financiado) * 100, 1)} do financiado{custo === 'tlp' ? ` · correção pelo IPCA ${brl(res.correcao)} (projeção)` : ''}</small></div>
              <div className="fm-kpi"><span>IOF</span><b>{brl(res.iof)}</b><small>{res.iof > 0 ? `${brl(res.iofFixo)} adicional + ${brl(res.iofDiario)} diário` : 'alíquota zero informada'}</small></div>
              <div className="fm-kpi"><span>Pagamento final</span><b>{brl(res.total)}</b><small>financiado + juros{custo === 'tlp' ? ' + correção IPCA' : ''}{res.iof > 0 ? ' + IOF' : ''}</small></div>
            </div>
            {spread != null && <p className="cx-hint cx-pad">Equivale a <b>CDI + {pct(spread, 2)} a.a.</b> (spread capitalizado sobre o CDI de hoje, {pct(cdi, 2)}): compare com o capital de giro.{custo === 'tlp' ? ' Na TLP, o custo real muda com o IPCA efetivo; a projeção usa o IPCA esperado.' : ''}</p>}
            {res.avisos.map((a) => <Estado key={a} tipo="aviso">{a}</Estado>)}
            <details className="fm-cron" open={verCronograma} onToggle={(e) => setVerCronograma(e.currentTarget.open)}>
              <summary>Cronograma mês a mês</summary>
              <div className="cx-wrap" role="region" aria-label="Cronograma de pagamentos" tabIndex={0}>
                <table className="cx-matrix fm-tabela">
                  <thead><tr><th scope="col">Mês</th>{custo === 'tlp' && <th scope="col">Correção IPCA</th>}<th scope="col">Juros</th><th scope="col">Amortização</th><th scope="col">Parcela</th><th scope="col">Saldo</th></tr></thead>
                  <tbody>{res.parcelas.map((p) => <tr key={p.mes} className={p.carencia ? 'fm-carencia' : undefined}><th scope="row">{p.mes}{p.carencia ? ' · carência' : ''}</th>{custo === 'tlp' && <td>{brl(p.correcao)}</td>}<td>{brl(p.juros)}</td><td>{brl(p.amortizacao)}</td><td>{brl(p.parcela)}</td><td>{brl(p.saldo)}</td></tr>)}</tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </article>

      <details className="fm-regras">
        <summary>Regras do produto e fontes</summary>
        <ul>
          <li><b>O que financia:</b> {REGRAS.itens}. Fora: {REGRAS.foraDoProduto}. Nacionalização: {REGRAS.nacionalizacao}.</li>
          <li><b>Quem pede:</b> empresas de qualquer porte sediadas no país, empresário individual, MEI, administração pública, cooperativas, fundações e associações; operação indireta, por agente financeiro credenciado.</li>
          <li><b>Limites:</b> até {REGRAS.participacaoMaxPct}% dos itens; teto de {brl(REGRAS.tetoOperacao)} por operação e {brl(REGRAS.tetoCliente12m)} por cliente a cada 12 meses (da homologação); reembolso de notas emitidas até {REGRAS.reembolsoMeses} meses antes do protocolo.</li>
          <li><b>Prazo:</b> até {REGRAS.prazoMaxMeses} meses, com até {REGRAS.carenciaMaxMeses} de carência ({REGRAS.carenciaMaxTfbMeses} com TFB ou taxa fixa composta). Juros exigíveis na carência; depois, SAC ou Price mensal com juros junto do principal.</li>
          <li><b>Taxa:</b> custo financeiro (TFB, TFBD, TLP, Taxa LCD ou taxa fixa composta; Selic suspensa pela {REGRAS.selicSuspensa}) + taxa do BNDES ({pct(REGRAS.taxaBndes['mpme-nne'])} MPME N/NE; {pct(REGRAS.taxaBndes.demais)} demais) + taxa do agente, negociada.</li>
          <li><b>IOF:</b> {REGRAS.iof}. Garantias e seguro conforme a política do agente (FGI quando aplicável).</li>
          <li><b>Conta:</b> taxa composta das três parcelas (capitalizada, padrão do BNDES: o exemplo oficial da página "Taxa de juros" é 1,07 × 1,015 × 1,03 − 1 = 11,86%; ou somada); taxa mensal por juros compostos em meses iguais de 1/12 do ano (o contrato apura por dias úteis; a diferença fica abaixo de 1% dos juros no total, mas pode chegar a alguns por cento numa parcela isolada); juros da carência capitalizados dentro do período e pagos no fim dele; na TLP, o saldo é corrigido pelo IPCA todo mês e a amortização é calculada sobre o saldo corrigido (SAC = saldo ÷ parcelas vincendas); SAC ou Price mensal; IOF sobre o principal de cada parcela pelos dias até o vencimento, contando a carência.</li>
          <li>O que ainda depende de conferência com o agente: valor mínimo, aceitação de Price no produto, periodicidade padrão dos juros na carência e a alíquota de IOF aplicável ao funding da operação. A conta aqui é estimativa; a proposta do agente prevalece.</li>
        </ul>
        <p className="fm-fontes-titulo">Base legal e onde cada regra foi conferida</p>
        <ul>{FONTES.map((f) => <li key={f.regra}><b>{f.regra}.</b> {f.fonte}.</li>)}</ul>
      </details>
      <p className="status">Estimativa com as regras vigentes em {dmy(REGRAS.conferidoEm)} e os custos financeiros do painel (TFB e TLP da aba BNDES, IPCA esperado do Focus). Sem tarifas, seguros nem garantias. Origem dos dados em Configurações › Base de dados.</p>
    </section>
  )
}
