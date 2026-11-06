import { useState } from 'react'
import MoneyInput from './MoneyInput.jsx'
import { DISCOUNT_INITIAL_FORM, DISCOUNT_TERMS, TITLE_FEE_MODES, parseDiscountForm } from './analiseDesconto.js'
import './AnaliseDesconto.css'

const brl = (value) => value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const number = (value) => value == null ? '—' : value.toLocaleString('pt-BR')

export function DescontoIcon() {
  return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 11h8M8 15h5M8 18h3" /><path d="m14 17 2 2 4-4" /></svg>
}

export default function AnaliseDesconto({ onBack }) {
  const [form, setForm] = useState(() => ({ ...DISCOUNT_INITIAL_FORM }))
  const { errors, operation, result: calculated } = parseDiscountForm(form)
  const result = calculated?.ok ? calculated : null
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }))
  const props = (key) => ({ id: `ad-${key}`, 'aria-invalid': !!errors[key], 'aria-describedby': `ad-${key}-err ad-${key}-hint` })
  const field = (key, label, control, hint = '') => <div className="cx-field" key={key}>
    <label htmlFor={`ad-${key}`}>{label}</label>{control}
    <p className="cx-hint" id={`ad-${key}-hint`}>{hint}</p>
    <p className="cx-error" id={`ad-${key}-err`} role={errors[key] ? 'alert' : undefined}>{errors[key] || ''}</p>
  </div>
  const textField = (key, label, hint, inputMode = 'decimal') => field(key, label, <input {...props(key)} inputMode={inputMode} autoComplete="off" value={form[key]} onChange={(event) => set(key, event.target.value)} onFocus={(event) => event.target.select()} />, hint)
  const moneyField = (key, label, hint) => field(key, label, <MoneyInput {...props(key)} value={form[key]} onChange={(value) => set(key, value)} />, hint)
  const feeField = form.titleFeeMode === 'total' ? moneyField('titleFeeTotal', 'Tarifa total de títulos por operação', 'Total cobrado pelo conjunto de títulos. Não multiplica pela quantidade.')
    : form.titleFeeMode === 'unit' ? moneyField('titleFeeUnit', 'Custo unitário por título', 'Multiplicado pela quantidade de títulos em cada operação.')
      : form.titleFeeMode === 'percent' ? textField('titleFeePercent', 'Tarifa sobre o valor bruto (%)', '0,25% reproduz os centavos da tabela de referência; é uma hipótese, não uma tarifa contratual confirmada.') : null
  const summaryRows = [
    ['Quantidade de operações', result?.operations, result?.annualOperations, true],
    ['Volume bruto de operações', result?.monthly.value, result?.annual.value],
    ['Tarifa de títulos', result?.monthly.titleFee, result?.annual.titleFee],
    ['Tarifa de contratação (TAC)', result?.monthly.tac, result?.annual.tac],
    ['Juros pagos', result?.monthly.interest, result?.annual.interest],
    ['IOF pago', result?.monthly.iof, result?.annual.iof],
    ['Custo total do desconto', result?.monthly.cost, result?.annual.cost],
  ]
  const first = result?.comparisons[0]
  const comparisonRows = [
    { label: 'Desconto: juros + TAC + títulos + IOF', month: result?.monthly.cost, value: (row) => row.discountCost },
    { label: 'Giro: juros + TAC + IOF', month: first ? first.giro.cost / 12 : null, value: (row) => row.giro.cost },
    { label: 'Economia estimada com giro', month: first ? first.savings / 12 : null, value: (row) => row.savings, savings: true },
    { label: 'Parcela Price, sem TAC e IOF', month: first?.giro.installment, value: (row) => row.giro.installment },
    { label: 'Média mensal all-in: principal + custos', month: first?.giro.averageMonthlyOutflow, value: (row) => row.giro.averageMonthlyOutflow },
  ]
  return <section className="cx cx-desconto" aria-labelledby="ad-heading">
    <button type="button" className="cx-back" onClick={onBack}><span aria-hidden="true">‹</span> Calculadoras</button>
    <h2 id="ad-heading" className="cx-title"><span className="cx-icon"><DescontoIcon /></span>Análise de desconto</h2>
    <p className="desconto-intro">Compare o custo recorrente de antecipar títulos com um capital de giro Price em 12, 24, 36 e 48 meses.</p>
    <p className="desconto-notice">Exemplo editável. Confirme como a tarifa dos títulos é cobrada e a alíquota adicional de IOF antes de comparar. A quantidade de operações informada abaixo controla todos os resultados.</p>

    <article className="desk-panel cx-panel desconto-input-panel">
      <header><h3>1. Operação real de desconto</h3></header>
      <div className="cx-form">
        {field('date', 'Data da operação e liberação do giro', <input {...props('date')} type="date" min="1900-01-01" max="9995-12-31" value={form.date} onChange={(event) => set('date', event.target.value)} />, 'A primeira parcela do giro vence no mês seguinte, no mesmo dia, limitado ao último dia do mês.')}
        {moneyField('value', 'Valor bruto da operação')}
        {textField('operationRate', 'Taxa da operação real (% a.m.)', 'Informativa. Os juros pagos abaixo são o valor efetivo informado, sem cálculo por prazo médio.')}
        {textField('titles', 'Quantidade de títulos por operação', null, 'numeric')}
        {field('titleFeeMode', 'Como calcular a tarifa dos títulos?', <select {...props('titleFeeMode')} value={form.titleFeeMode} onChange={(event) => set('titleFeeMode', event.target.value)}><option value="">Selecione a forma de cobrança</option>{TITLE_FEE_MODES.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}</select>, 'A referência mostra R$ 564,00 como “unitário”, mas os totais o tratam como tarifa da operação. Escolha a interpretação correta.')}
        {feeField}
        {moneyField('tac', 'Tarifa de contratação por operação (TAC)')}
        {moneyField('interest', 'Juros pagos por operação', 'Valor real, informado em reais. Sem os vencimentos dos títulos, a taxa não permite reconstruir os juros.')}
        {moneyField('iofPaid', 'IOF pago por operação', 'Valor real do desconto. As alíquotas do giro não modificam este campo.')}
      </div>
      <div className="desconto-kpis" aria-live="polite">
        <div><span>Tarifa total de títulos</span><b>{brl(operation?.titleFee)}</b></div>
        <div><span>Subtotal sem tarifa de títulos</span><b>{brl(operation?.costWithoutTitles)}</b><small>TAC + juros + IOF</small></div>
        <div><span>Custo total completo</span><b>{brl(operation?.cost)}</b><small>Inclui a tarifa de títulos</small></div>
        <div><span>Valor líquido da operação</span><b>{brl(operation?.net)}</b><small>Bruto menos todos os custos</small></div>
      </div>
      <p className="cx-hint cx-pad">O total de R$ 4.054,75 da primeira referência não inclui a tarifa de títulos. Aqui, custo completo e valor líquido incluem essa tarifa, sem omiti-la.</p>
    </article>

    <article className="desk-panel cx-panel desconto-input-panel">
      <header><h3>2. Projeção mensal do desconto</h3></header>
      <div className="cx-form">
        {textField('operations', 'Quantidade de operações por mês', 'A primeira referência tem 6 e a comparação tem 7. Vale exclusivamente o número deste campo.', 'numeric')}
        {moneyField('averageValue', 'Valor médio bruto por operação', 'Volume mensal = valor médio × quantidade de operações.')}
        {textField('discountRate', 'Taxa de desconto de referência (% a.m.)', 'Informativa. Não substitui os juros pagos informados, pois não há prazo médio ou vencimentos dos títulos.')}
      </div>
      <p className="cx-hint cx-pad">A projeção repete a quantidade de títulos, a TAC e os valores de juros e IOF pagos a cada operação. A tarifa percentual, se escolhida, incide sobre o valor médio. Mudar apenas o valor médio não recalcula juros nem IOF; ajuste os valores pagos para cada cenário.</p>
    </article>

    <article className="desk-panel cx-panel desconto-input-panel">
      <header><h3>3. Premissas do capital de giro</h3></header>
      <div className="cx-form">
        {field('giroPrincipalMode', 'Principal usado no giro', <select {...props('giroPrincipalMode')} value={form.giroPrincipalMode} onChange={(event) => set('giroPrincipalMode', event.target.value)}><option value="monthly">Igual ao volume bruto mensal do desconto</option><option value="manual">Informar outro valor</option></select>, 'Usar o volume mensal é uma hipótese de comparação, não uma necessidade de capital de giro (NCG) apurada.')}
        {form.giroPrincipalMode === 'manual' && moneyField('giroPrincipal', 'Valor financiado no giro', 'Ao informar outro principal, os montantes comparados também ficam diferentes.')}
        {textField('giroRate', 'Taxa do giro Price (% a.m.)', 'Taxa mensal efetiva, sem carência e com parcelas mensais.')}
        {moneyField('giroTac', 'TAC do giro, uma única vez', 'R$ 3.150,00 é o valor inferido para reconciliar a referência. Confirme a proposta; não é uma tarifa padrão.')}
        {textField('iofDaily', 'IOF diário do giro (% ao dia)', '0,0082% é a premissa da referência. Aplicado a cada amortização, com limite de 365 dias.')}
        {textField('iofAdditional', 'IOF adicional do giro, uma vez (%)', 'Informe explicitamente: 0 reproduz a referência sem adicional; 0,38 adiciona 0,38% do principal. Confirme a condição aplicável.')}
      </div>
      <p className="cx-hint cx-pad">TAC e IOF são pagos à parte e não financiados. Dias corridos reais entre a liberação e cada vencimento, sem ajuste de feriados ou dias úteis. As alíquotas são premissas editáveis, não validação tributária.</p>
    </article>

    <div aria-live="polite" className="desconto-result-status">
      {Object.keys(errors).length > 0 && <p className="desconto-notice">Preencha ou corrija os campos sinalizados para liberar a comparação.</p>}
      {calculated && !calculated.ok && <p role="alert" className="cx-error">{calculated.error}</p>}
      {result && <p className="desconto-result-caption">Principal do giro: <b>{brl(result.principal)}</b> · {number(result.operations)} operações de desconto por mês · Price a {form.giroRate}% a.m.</p>}
    </div>

    <article className="desk-panel cx-panel desconto-summary-panel">
      <header><h3>Resumo dos custos do desconto</h3></header>
      <div className="cx-wrap" role="region" aria-label="Resumo mensal e anual do desconto" tabIndex={0}>
        <table className="cx-matrix desconto-table"><caption className="sr-only">Volume e custos de desconto no mês e em doze meses</caption><thead><tr><th scope="col">Item</th><th scope="col">Mês</th><th scope="col">Ano</th></tr></thead><tbody>{summaryRows.map(([label, monthly, annual, count]) => <tr key={label}><th scope="row">{label}</th><td>{count ? number(monthly) : brl(monthly)}</td><td>{count ? number(annual) : brl(annual)}</td></tr>)}</tbody></table>
      </div>
    </article>

    <article className="desk-panel cx-panel desconto-comparison-panel">
      <header><h3>Desconto × giro: custo financeiro</h3></header>
      <div className="cx-wrap" role="region" aria-label="Comparação de desconto e giro em 12, 24, 36 e 48 meses; role para ver todas as colunas" tabIndex={0}>
        <table className="cx-matrix desconto-table"><caption className="sr-only">Custo acumulado por prazo, economia estimada e desembolso mensal</caption><thead><tr><th scope="col">Item</th><th scope="col">Mês<small>base: giro de 12 meses</small></th>{DISCOUNT_TERMS.map((months) => <th scope="col" key={months}>{months} meses</th>)}</tr></thead><tbody>{comparisonRows.map((row) => <tr key={row.label} className={row.savings ? 'desconto-savings' : undefined}><th scope="row">{row.label}</th><td data-negative={row.savings && row.month < 0 ? 'true' : undefined}>{brl(row.month)}</td>{DISCOUNT_TERMS.map((months, index) => { const value = result ? row.value(result.comparisons[index]) : null; return <td key={months} data-negative={row.savings && value < 0 ? 'true' : undefined}>{brl(value)}</td> })}</tr>)}</tbody></table>
      </div>
      <p className="cx-hint cx-pad">Economia = custo do desconto − custo do giro. Positivo: giro tem menor custo no cenário; negativo: maior custo. Na coluna Mês, os custos são a média do cenário de 12 meses; as duas linhas de parcela/desembolso já são mensais.</p>
      <p className="desconto-notice desconto-inset"><b>A média mensal all-in não é a parcela contratual.</b> Ela distribui principal, juros, TAC e IOF pelo prazo. A parcela Price aparece separadamente, sem TAC e IOF.</p>
      <p className="cx-hint cx-pad">Os fluxos não são equivalentes: o desconto é repetido todo mês e o giro é amortizado. A diferença de custos não comprova economia efetiva nem substitui a análise do ciclo de caixa. Esta simulação não é CET nem recomendação de contratação.</p>
    </article>

    <article className="desk-panel cx-panel desconto-comparison-panel">
      <header><h3>Composição do custo do giro</h3></header>
      <div className="cx-wrap" role="region" aria-label="Juros, TAC e IOF do giro por prazo; role para ver todas as colunas" tabIndex={0}>
        <table className="cx-matrix desconto-table"><caption className="sr-only">Encargos totais do giro e separação do IOF diário e adicional</caption><thead><tr><th scope="col">Item</th>{DISCOUNT_TERMS.map((months) => <th scope="col" key={months}>{months} meses</th>)}</tr></thead><tbody>{[['Juros totais', 'interest'], ['TAC única', 'tac'], ['IOF diário', 'dailyIof'], ['IOF adicional', 'additionalIof'], ['IOF total', 'iof'], ['Custo financeiro total', 'cost']].map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{DISCOUNT_TERMS.map((months, index) => <td key={months}>{brl(result?.comparisons[index].giro[key])}</td>)}</tr>)}</tbody></table>
      </div>
    </article>

    <details className="desconto-method"><summary>Premissas, fórmulas e pontos de atenção</summary>
      <ul>
        <li>Tarifa por operação: total informado, custo unitário × títulos ou valor bruto × percentual. Sem arredondamento intermediário; os valores exibidos são arredondados para centavos.</li>
        <li>Desconto mensal = operações × (tarifa de títulos + TAC + juros pagos + IOF pago). Custo do prazo = custo mensal × meses.</li>
        <li>Price: PMT = principal × i / (1 − (1 + i) elevado a −n). Se a taxa for zero, PMT = principal / n.</li>
        <li>IOF do giro = adicional × principal + diária × soma de cada amortização multiplicada por seus dias corridos, limitados a 365. Percentuais são divididos por 100.</li>
        <li>Custo do giro = soma das parcelas − principal + TAC + IOF. Média mensal all-in = (principal + custo do giro) / meses.</li>
        <li>Não inclui juros de mora por títulos vencidos, despesas de baixa de duplicatas, seguros, outros encargos, renegociações nem reinvestimento dos fluxos.</li>
        <li>Confirme juros, tarifas, alíquotas e calendário na proposta. Os dados iniciais são um exemplo, não condições comerciais vigentes.</li>
      </ul>
    </details>
  </section>
}
