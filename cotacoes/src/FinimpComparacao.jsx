import { Fragment, useState } from 'react'
import FinimpHelp from './FinimpHelp.jsx'
import { FINIMP_HELP } from './finimpHelpContent.js'
import MoneyInput from './MoneyInput.jsx'
import { parseMoneyInput } from './moneyInput.js'
import { parseDecimal } from './emprestimo.js'
import { FINIMP_TERMS, compareFinimp, finimpCost, solveFinimpRate } from './finimpComparison.js'
import './FinimpComparacao.css'

export function FinimpIcon() { return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 7h18M17 3l4 4-4 4M21 17H3m4-4-4 4 4 4" /></svg> }
const initial = { annualRate: '', flatRate: '', tac: '0' }
const parseBank = (bank, useTac) => ({ annualRate: parseDecimal(bank.annualRate), flatRate: parseDecimal(bank.flatRate), tac: useTac ? (parseMoneyInput(bank.tac).ok ? parseMoneyInput(bank.tac).value : null) : 0 })
export default function FinimpComparacao({ onBack }) {
  const [principalText, setPrincipal] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [competitor, setCompetitor] = useState(initial)
  const [itau, setItau] = useState(initial)
  const [useTac, setUseTac] = useState(false)
  const [goalMode, setGoalMode] = useState('equal')
  const [goalTerm, setGoalTerm] = useState(5)
  const [targetText, setTarget] = useState('')
  const principal = parseMoneyInput(principalText)
  const a = parseBank(competitor, useTac), b = parseBank(itau, useTac)
  const rows = FINIMP_TERMS.map(days => compareFinimp({ principal: principal.ok ? principal.value : null, days, competitor: a, itau: b }))
  const selected = finimpCost({ ...a, principal: principal.ok ? principal.value : null, days: FINIMP_TERMS[goalTerm] })
  const target = parseMoneyInput(targetText)
  const goal = solveFinimpRate({ principal: principal.ok ? principal.value : null, days: FINIMP_TERMS[goalTerm], flatRate: b.flatRate, tac: b.tac, targetCost: goalMode === 'equal' ? (selected.ok ? selected.cost : null) : (target.ok ? target.value : null) })
  const money = n => n.toLocaleString('pt-BR', { style: 'currency', currency })
  const differenceAmount = n => n !== 0 && Math.abs(n) < 0.005 ? `${n > 0 ? '+' : '−'} < 0,01 ${currency}` : money(n)
  const delta = n => n === 0 ? '0 p.p.' : Math.abs(n) < 0.0000005 ? `${n > 0 ? '+' : '−'} < 0,000001 p.p.` : `${n > 0 ? '+' : ''}${n.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} p.p.`
  const pct = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 6 }) + '%'
  const help = (key, suffix='') => <FinimpHelp title={FINIMP_HELP[key].title+(suffix?' · '+suffix:'')}><p>{FINIMP_HELP[key].text}</p></FinimpHelp>
  const field = (label, id, value, change, monetary = false, helpKey, suffix) => <div className="cx-field"><div className="fi-label"><label htmlFor={id}>{label}</label>{helpKey&&help(helpKey,suffix)}</div>{monetary ? <MoneyInput id={id} prefix={currency} value={value} onChange={change} /> : <input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={e => change(e.target.value)} />}</div>
  const bankFields = (name, bank, setBank, key) => <fieldset className="fi-bank"><legend>{name}</legend>{field('Taxa anual simples (%)', `fi-${key}-rate`, bank.annualRate, v => setBank({ ...bank, annualRate: v }),false,'rate',name)}{field('Flat único sobre o principal (%)', `fi-${key}-flat`, bank.flatRate, v => setBank({ ...bank, flatRate: v }),false,'flat',name)}{useTac && field(`TAC à vista (${currency})`, `fi-${key}-tac`, bank.tac, v => setBank({ ...bank, tac: v }), true,'tac',name)}</fieldset>
  return <section className="cx fi" aria-labelledby="fi-heading">
    <button type="button" className="cx-back" onClick={onBack}>‹ Calculadoras</button>
    <h2 id="fi-heading" className="cx-title"><FinimpIcon /> FINIMP — comparação de propostas {help('simulation')}</h2>
    <article className="desk-panel cx-panel"><header><h3>Condições</h3></header><div className="cx-form">
      {field(`Principal (${currency})`, 'fi-principal', principalText, setPrincipal, true)}
      <div className="cx-field"><div className="fi-label"><label htmlFor="fi-currency">Moeda</label>{help('currency')}</div><select id="fi-currency" value={currency} onChange={e => setCurrency(e.target.value)}><option>USD</option><option>EUR</option><option>BRL</option></select></div>
    </div><div className="fi-tac-toggle"><label className="fi-check"><input type="checkbox" checked={useTac} onChange={e => setUseTac(e.target.checked)} /> Incluir TAC à vista</label>{help('tac')}</div>
    <p className="fi-tac-status" role="status">TAC {useTac ? 'incluída' : 'excluída'}.</p>
    <div className="fi-banks">{bankFields('Instituição 1', competitor, setCompetitor, 'a')}{bankFields('Instituição 2', itau, setItau, 'b')}</div></article>
    <article className="desk-panel cx-panel fi-results"><header><h3>Tabela comparativa FINIMP {help('period')}</h3></header>
      <p id="fi-table-help" className="sr-only">12 prazos fixos, de 30 a 360 dias. Use rolagem para acessar todas as colunas.</p>
      <div className="fi-scroll" role="region" aria-label="Comparação por prazo" aria-describedby="fi-table-help" tabIndex={0}>
        <table className="fi-compare"><caption className="sr-only">Comparação de custos no período. Instituição 2 menos Instituição 1.</caption>
          <thead><tr><th scope="col" rowSpan={2}>Prazo<br />(dias)</th><th scope="colgroup" colSpan={useTac ? 5 : 4}>Instituição 1</th><th scope="colgroup" colSpan={useTac ? 5 : 4}>Instituição 2</th><th scope="colgroup" colSpan={2}>Comparação</th></tr>
            <tr>{['a', 'b'].map(bank => <Fragment key={bank}>{[<th key={bank + '-interest'} scope="col">Juros ({currency})</th>, <th key={bank + '-flat'} scope="col">Flat ({currency})</th>, useTac && <th key={bank + '-tac'} scope="col">TAC à vista ({currency})</th>, <th key={bank + '-cost'} scope="col">Custo ({currency}){help('cost',bank==='a'?'Instituição 1':'Instituição 2')}</th>, <th key={bank + '-percent'} scope="col">Custo no período (%)</th>]}</Fragment>)}<th scope="col">Diferença ({currency}){help('comparison')}</th><th scope="col">Delta do custo (p.p.)</th></tr>
          </thead>
          <tbody>{rows.map((r, i) => <tr key={FINIMP_TERMS[i]}><th scope="row">{FINIMP_TERMS[i]}</th>{r.ok ? <>{['competitor', 'itau'].map(key => <Fragment key={key}>{[<td key={key + '-interest'}>{money(r[key].interest)}</td>, <td key={key + '-flat'}>{money(r[key].flat)}</td>, useTac && <td key={key + '-tac'}>{money(r[key].tac)}</td>, <td className="fi-cost" key={key + '-cost'}><strong>{money(r[key].cost)}</strong></td>, <td key={key + '-percent'}>{pct(r[key].periodPercent)}</td>]}</Fragment>)}<td className="fi-difference"><strong>{differenceAmount(r.difference)}</strong><small>{r.difference > 0 ? 'Instituição 2 com maior custo' : r.difference < 0 ? 'Instituição 2 com menor custo' : 'Custos iguais'}</small></td><td className="fi-delta">{delta(r.deltaPp)}</td></> : <td colSpan={useTac ? 12 : 10}>Preencha principal positivo, taxas e flat não negativos e TAC válida, quando incluída.</td>}</tr>)}</tbody>
        </table>
      </div>
    </article>
    <article className="desk-panel cx-panel"><header><h3>Atingir meta de custo {help('goal')}</h3></header><div className="cx-form"><div className="cx-field"><label htmlFor="fi-goal-mode">Meta</label><select id="fi-goal-mode" value={goalMode} onChange={e => setGoalMode(e.target.value)}><option value="equal">Igualar custo da Instituição 1</option><option value="target">Custo alvo informado</option></select></div><div className="cx-field"><label htmlFor="fi-goal-term">Prazo da meta</label><select id="fi-goal-term" value={goalTerm} onChange={e => setGoalTerm(Number(e.target.value))}>{FINIMP_TERMS.map((days, i) => <option key={days} value={i}>{days} dias</option>)}</select></div>{goalMode === 'target' && field(`Custo alvo (${currency})`, 'fi-target', targetText, setTarget, true)}</div>
    <div className="fi-goal" role="status">{goal.ok ? <><strong>Taxa requerida: {pct(goal.annualRate)} a.a.</strong><p>Custo calculado: {money(goal.result.cost)} ({pct(goal.result.periodPercent)} no período).</p><button type="button" onClick={() => setItau({ ...itau, annualRate: goal.annualRate.toLocaleString('pt-BR', { useGrouping: false, maximumSignificantDigits: 17 }) })}>Aplicar taxa à Instituição 2</button></> : <p>{goal.error}</p>}</div></article>

  </section>
}
