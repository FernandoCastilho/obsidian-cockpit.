import { useState } from 'react'
import MoneyInput from './MoneyInput.jsx'
import { parseMoneyInput } from './moneyInput.js'
import { parseDecimal } from './emprestimo.js'
import { compareFinimp, finimpCost, solveFinimpRate } from './finimpComparison.js'
import './FinimpComparacao.css'

export function FinimpIcon() { return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 7h18M17 3l4 4-4 4M21 17H3m4-4-4 4 4 4" /></svg> }
const initial = { annualRate: '', flatRate: '', tac: '0' }
const parseBank = (bank, useTac) => ({ annualRate: parseDecimal(bank.annualRate), flatRate: parseDecimal(bank.flatRate), tac: useTac ? (parseMoneyInput(bank.tac).ok ? parseMoneyInput(bank.tac).value : null) : 0 })
const parseDays = text => /^\d+$/.test(text.trim()) && Number.isSafeInteger(Number(text)) ? Number(text) : null
export default function FinimpComparacao({ onBack }) {
  const [principalText, setPrincipal] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [competitor, setCompetitor] = useState(initial)
  const [itau, setItau] = useState(initial)
  const [useTac, setUseTac] = useState(false)
  const [terms, setTerms] = useState(Array.from({ length: 12 }, (_, i) => String((i + 1) * 30)))
  const [goalMode, setGoalMode] = useState('equal')
  const [goalTerm, setGoalTerm] = useState(5)
  const [targetText, setTarget] = useState('')
  const principal = parseMoneyInput(principalText)
  const a = parseBank(competitor, useTac), b = parseBank(itau, useTac)
  const rows = terms.map(text => compareFinimp({ principal: principal.ok ? principal.value : null, days: parseDays(text), competitor: a, itau: b }))
  const selected = finimpCost({ ...a, principal: principal.ok ? principal.value : null, days: parseDays(terms[goalTerm]) })
  const target = parseMoneyInput(targetText)
  const goal = solveFinimpRate({ principal: principal.ok ? principal.value : null, days: parseDays(terms[goalTerm]), flatRate: b.flatRate, tac: b.tac, targetCost: goalMode === 'equal' ? (selected.ok ? selected.cost : null) : (target.ok ? target.value : null) })
  const money = n => n.toLocaleString('pt-BR', { style: 'currency', currency })
  const differenceAmount = n => n !== 0 && Math.abs(n) < 0.005 ? `${n > 0 ? '+' : '−'} < 0,01 ${currency}` : money(n)
  const delta = n => n === 0 ? '0 p.p.' : Math.abs(n) < 0.0000005 ? `${n > 0 ? '+' : '−'} < 0,000001 p.p.` : `${n > 0 ? '+' : ''}${n.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} p.p.`
  const pct = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) + '%'
  const field = (label, id, value, change, monetary = false) => <div className="cx-field"><label htmlFor={id}>{label}</label>{monetary ? <MoneyInput id={id} prefix={currency} value={value} onChange={change} /> : <input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={e => change(e.target.value)} />}</div>
  const bankFields = (name, bank, setBank, key) => <fieldset className="fi-bank"><legend>{name}</legend>{field('Taxa anual simples (%)', `fi-${key}-rate`, bank.annualRate, v => setBank({ ...bank, annualRate: v }))}{field('Flat único sobre o principal (%)', `fi-${key}-flat`, bank.flatRate, v => setBank({ ...bank, flatRate: v }))}{useTac && field(`TAC à vista (${currency})`, `fi-${key}-tac`, bank.tac, v => setBank({ ...bank, tac: v }), true)}</fieldset>
  return <section className="cx fi" aria-labelledby="fi-heading">
    <button type="button" className="cx-back" onClick={onBack}>‹ Calculadoras</button>
    <h2 id="fi-heading" className="cx-title"><FinimpIcon /> FINIMP — comparação de propostas</h2>
    <p className="status">Simulação genérica com juros simples e pagamento do principal no vencimento. Preencha as condições de cada proposta; os campos não representam uma oferta de banco.</p>
    <article className="desk-panel cx-panel"><header><h3>Condições e premissas</h3></header><div className="cx-form">
      {field(`Principal (${currency})`, 'fi-principal', principalText, setPrincipal, true)}
      <div className="cx-field"><label htmlFor="fi-currency">Moeda de toda a simulação</label><select id="fi-currency" value={currency} onChange={e => setCurrency(e.target.value)}><option>USD</option><option>EUR</option><option>BRL</option></select></div>
    </div><p>A moeda apenas identifica os valores, sem conversão cambial. Base de cálculo: dias informados ÷ 360. Informe os dias previstos na proposta; nenhuma convenção ACT/360 ou 30/360 é deduzida de datas.</p>
    <label className="fi-check"><input type="checkbox" checked={useTac} onChange={e => setUseTac(e.target.checked)} /> Incluir TAC editável, assumida paga à vista e sem financiamento</label>
    <p>Flat cobrado uma única vez sobre o principal. TAC {useTac ? 'incluída no custo, na moeda selecionada, sem gerar juros' : 'excluída da simulação'}. O momento de cobrança do flat deve ser conferido no contrato; esta soma de custos não desconta fluxos a valor presente.</p>
    <div className="fi-banks">{bankFields('Concorrente', competitor, setCompetitor, 'a')}{bankFields('Itaú', itau, setItau, 'b')}</div></article>
    <article className="desk-panel cx-panel"><header><h3>Prazos alternativos</h3></header><p>Doze prazos editáveis, aplicando as mesmas condições de cada proposta. Dias inteiros a partir de zero; não se presume que a taxa será mantida pelo banco em outro prazo.</p><div className="fi-terms">{terms.map((t, i) => <div className="cx-field" key={i}><label htmlFor={`fi-days-${i}`}>Prazo {i + 1} (dias)</label><input id={`fi-days-${i}`} inputMode="numeric" value={t} onChange={e => setTerms(terms.map((v, j) => i === j ? e.target.value : v))} /></div>)}</div>
    <div className="fi-scroll" role="region" aria-label="Comparação por prazo" tabIndex={0}><table><caption>Custo = juros + flat{useTac ? ' + TAC à vista' : ''}. Diferença = Itaú − concorrente. Delta em pontos percentuais, calculado sem arredondar os custos. Deslize a tabela para ver todas as colunas.</caption><thead><tr><th scope="col">Dias</th><th scope="col">Concorrente</th><th scope="col">Itaú</th><th scope="col">Diferença de custo</th><th scope="col">Delta do custo no período (p.p.)</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i}><th scope="row">{parseDays(terms[i]) ?? 'Inválido'}</th>{r.ok ? <>{['competitor', 'itau'].map(key => <td key={key}><strong>{money(r[key].cost)}</strong><small>{pct(r[key].periodPercent)} no período</small><small>Juros {money(r[key].interest)} · flat {money(r[key].flat)}{useTac && ` · TAC ${money(r[key].tac)}`}</small></td>)}<td><strong>{differenceAmount(r.difference)}</strong><small>{r.difference > 0 ? 'Itaú com maior custo' : r.difference < 0 ? 'Itaú com menor custo' : 'Custos iguais'}</small></td><td>{delta(r.deltaPp)}</td></> : <td colSpan={4}>Preencha principal positivo, taxas e flat não negativos, TAC válida e dias inteiros não negativos.</td>}</tr>)}</tbody></table></div></article>
    <article className="desk-panel cx-panel"><header><h3>Atingir meta de custo</h3></header><p>Calcula a taxa anual simples requerida para o Itaú, mantendo seu flat e sua TAC. Soluções restritas a taxa não negativa; não representam aprovação comercial.</p><div className="cx-form"><div className="cx-field"><label htmlFor="fi-goal-mode">Meta</label><select id="fi-goal-mode" value={goalMode} onChange={e => setGoalMode(e.target.value)}><option value="equal">Igualar custo do concorrente</option><option value="target">Custo alvo informado</option></select></div><div className="cx-field"><label htmlFor="fi-goal-term">Prazo da meta</label><select id="fi-goal-term" value={goalTerm} onChange={e => setGoalTerm(Number(e.target.value))}>{terms.map((t, i) => <option key={i} value={i}>Prazo {i + 1}: {t} dias</option>)}</select></div>{goalMode === 'target' && field(`Custo alvo (${currency})`, 'fi-target', targetText, setTarget, true)}</div>
    <div className="fi-goal" role="status">{goal.ok ? <><strong>Taxa requerida: {pct(goal.annualRate)} a.a.</strong><p>Custo calculado: {money(goal.result.cost)} ({pct(goal.result.periodPercent)} no período).</p><button type="button" onClick={() => setItau({ ...itau, annualRate: goal.annualRate.toLocaleString('pt-BR', { useGrouping: false, maximumSignificantDigits: 17 }) })}>Aplicar taxa ao Itaú</button></> : <p>{goal.error}</p>}</div></article>
    <details className="desk-panel fi-method"><summary>Fórmulas e limites da comparação</summary><p>Juros = principal × taxa anual / 100 × dias / 360. Flat = principal × percentual / 100. Custo = juros + flat + TAC à vista, quando habilitada. Custo percentual no período = custo / principal × 100. A taxa requerida é (custo alvo − flat − TAC) / principal × 360 / dias × 100.</p><p>O percentual no período não é CET anual. Não são estimados impostos, câmbio, hedge, variação de indexadores, seguros ou outras tarifas. Não há custo final em reais travado. Confirme moeda, base de dias, fluxos e encargos no contrato. Nenhum dado digitado é enviado ou incluído na busca; os campos ficam apenas nesta sessão da calculadora.</p></details>
  </section>
}
