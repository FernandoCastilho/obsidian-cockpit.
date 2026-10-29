import { useState } from 'react'
import './Calculadora.css'
import MoneyInput from './MoneyInput.jsx'
import { parseMoneyInput } from './moneyInput.js'
import { IOF_PJ, SYSTEMS, compareSystems, parseDecimal } from './emprestimo.js'

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Ícone do Capital de Giro: pilha de moedas com a seta de retorno do caixa.
function GiroIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="9" cy="6.5" rx="5.5" ry="2.5" />
      <path d="M3.5 6.5v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" />
      <path d="M3.5 10.5v4c0 1.4 2.5 2.5 5.5 2.5 1 0 1.9-.1 2.7-.4" />
      <path d="M21 13.5a4.5 4.5 0 10-1.3 3.2" />
      <path d="M21 10.5v3h-3" />
    </svg>
  )
}

const CALCS = [{ id: 'giro', title: 'Capital de Giro', sub: 'Parcela, juros totais e pagamento final', Icon: GiroIcon }]

function CapitalDeGiro({ onBack }) {
  const [valueText, setValueText] = useState('100.000,00')
  const [nText, setNText] = useState('12')
  const [rateText, setRateText] = useState('2,00')
  const [unit, setUnit] = useState('am')
  const [system, setSystem] = useState('price')
  const [iofFixedText, setIofFixedText] = useState('0,38')
  const [iofDailyText, setIofDailyText] = useState('0,0082')
  const money = parseMoneyInput(valueText)
  const n = /^\d+$/.test(nText.trim()) ? Number(nText) : null
  const rate = parseDecimal(rateText)
  const iofFixed = parseDecimal(iofFixedText), iofDaily = parseDecimal(iofDailyText)
  const errors = {
    value: money.ok ? null : money.error,
    n: n !== null && n >= 1 && n <= 600 ? null : 'Informe o prazo em meses, número inteiro de 1 a 600.',
    rate: rate !== null && rate <= 1000 ? null : 'Informe a taxa em %, por exemplo 2,00.',
    iof: iofFixed !== null && iofFixed <= 100 && iofDaily !== null && iofDaily <= 100 ? null : 'Informe as alíquotas do IOF em %, por exemplo 0,38 e 0,0082.',
  }
  const compared = Object.values(errors).some(Boolean) ? null : compareSystems({ value: money.value, n, rate, unit, system, iof: { fixed: iofFixed, daily: iofDaily } })
  const result = compared?.selected.ok ? compared.selected : null
  // Colunas na ordem Price, SAC e (só quando escolhido) Bullet; as de Price e SAC aparecem sempre, vazias enquanto a entrada é inválida.
  const byId = Object.fromEntries(result ? [[result.system, result], ...compared.others.map((o) => [o.system, o.result])] : [])
  const cols = SYSTEMS.filter((x) => x.id !== 'bullet' || result?.system === 'bullet').map((x) => ({ system: x.id, label: x.label, result: byId[x.id] ?? null, selected: result?.system === x.id }))
  const rows = [
    { key: 'parcela', label: 'Parcela', cell: (r) => (r.installment == null ? { main: '—', sub: 'pagamento único' } : r.last == null ? { main: brl(r.installment), sub: `fixa, em ${r.n}x` } : { main: brl(r.installment), sub: `até ${brl(r.last)}` }) },
    { key: 'iof', label: 'IOF', cell: (r) => ({ main: brl(r.iof) }) },
    { key: 'juros', label: 'Juros Totais', cell: (r) => ({ main: brl(r.interest), sub: `${(r.interest / money.value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% do valor` }) },
    { key: 'total', label: 'Pagamento Final', cell: (r) => ({ main: brl(r.total) }) },
  ]
  const sys = SYSTEMS.find((s) => s.id === system)
  const field = (key, label, control) => (
    <div className="cx-field">
      <label htmlFor={`cx-${key}`}>{label}</label>
      {control}
      <p className="cx-error" id={`cx-${key}-err`} role={errors[key] ? 'alert' : undefined}>{errors[key] ?? ''}</p>
    </div>
  )
  return (
    <section className="cx" aria-labelledby="calc-h">
      <button type="button" className="cx-back" onClick={onBack}><span aria-hidden="true">‹</span> Calculadoras</button>
      <h2 id="calc-h" className="cx-title"><span className="cx-icon" aria-hidden="true"><GiroIcon /></span>Capital de Giro</h2>

      <article className="desk-panel cx-panel">
        <header><h3>Condições gerais</h3></header>
        <div className="cx-form">
          {field('value', 'Valor', <MoneyInput id="cx-value" aria-invalid={!!errors.value} aria-describedby="cx-value-err" value={valueText} onChange={setValueText} />)}
          {field('n', 'Prazo (meses)', <input id="cx-n" inputMode="numeric" autoComplete="off" aria-invalid={!!errors.n} aria-describedby="cx-n-err" value={nText} onChange={(e) => setNText(e.target.value)} onFocus={(e) => e.target.select()} />)}
          {field('rate', 'Taxa (%)', (
            <div className="cx-rate">
              <input id="cx-rate" inputMode="decimal" autoComplete="off" aria-invalid={!!errors.rate} aria-describedby="cx-rate-err" value={rateText} onChange={(e) => setRateText(e.target.value)} onFocus={(e) => e.target.select()} />
              <div className="seg" role="group" aria-label="Período da taxa">
                <button type="button" aria-pressed={unit === 'am'} onClick={() => setUnit('am')}>a.m.</button>
                <button type="button" aria-pressed={unit === 'aa'} onClick={() => setUnit('aa')}>a.a.</button>
              </div>
            </div>
          ))}
          <div className="cx-field">
            <span className="cx-label" id="cx-system-l">Sistema de amortização</span>
            <div className="seg" role="group" aria-labelledby="cx-system-l">
              {SYSTEMS.map((s) => <button key={s.id} type="button" aria-pressed={system === s.id} onClick={() => setSystem(s.id)}>{s.label}</button>)}
            </div>
            <p className="cx-hint">{sys.hint}</p>
          </div>
          <details className="cx-iof">
            <summary>Alíquotas do IOF (pessoa jurídica)</summary>
            <div className="cx-iof-fields">
              <div className="cx-field">
                <label htmlFor="cx-iof-fixed">Adicional, uma vez (%)</label>
                <input id="cx-iof-fixed" inputMode="decimal" autoComplete="off" aria-invalid={!!errors.iof} aria-describedby="cx-iof-err" value={iofFixedText} onChange={(e) => setIofFixedText(e.target.value)} onFocus={(e) => e.target.select()} />
              </div>
              <div className="cx-field">
                <label htmlFor="cx-iof-daily">Diária (% ao dia)</label>
                <input id="cx-iof-daily" inputMode="decimal" autoComplete="off" aria-invalid={!!errors.iof} aria-describedby="cx-iof-err" value={iofDailyText} onChange={(e) => setIofDailyText(e.target.value)} onFocus={(e) => e.target.select()} />
              </div>
            </div>
            <p className="cx-error" id="cx-iof-err" role={errors.iof ? 'alert' : undefined}>{errors.iof ?? ''}</p>
            <p className="cx-hint">Padrão: {IOF_PJ.fixed.toLocaleString('pt-BR')}% sobre o valor, uma vez, mais {IOF_PJ.daily.toLocaleString('pt-BR')}% ao dia sobre o principal de cada parcela, até {IOF_PJ.maxDays} dias (Decreto 12.499/2025). Confirme a alíquota vigente com seu banco.</p>
          </details>
        </div>
      </article>

      <div className="cx-gap" aria-hidden="true" />

      <article className="desk-panel cx-panel" aria-live="polite">
        <header><h3>Resultado</h3></header>
        <div className="cx-wrap" role="region" aria-label="Resultado por sistema de amortização; role para ver todas as colunas" tabIndex={0}>
          <table className="cx-matrix">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Item</span></th>
                {cols.map((c) => <th key={c.system} scope="col" className={c.selected ? 'cx-selected' : undefined}>{c.label}{c.selected && <small>selecionado</small>}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row">{r.label}</th>
                  {cols.map((c) => {
                    const cell = c.result ? r.cell(c.result) : null
                    return (
                      <td key={c.system} className={c.selected ? 'cx-selected' : undefined}>
                        {cell ? <>{cell.main}{cell.sub && <small>{cell.sub}</small>}</> : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!result && <p className="cx-hint cx-pad">Preencha as condições gerais.</p>}
        {result && compared.others.length > 0 && (
          <ul className="cx-diff">
            {compared.others.map((o) => (
              <li key={o.system}>
                No <b>{o.label}</b>, o Pagamento Final fica {Math.abs(o.totalDiff) < 0.005 ? <>igual ao do <b>{sys.label}</b></> : <><b>{brl(Math.abs(o.totalDiff))}</b> {o.totalDiff < 0 ? 'menor' : 'maior'} que no {sys.label}</>}
                {Math.abs(o.interestDiff) >= 0.005 && <> (juros {brl(Math.abs(o.interestDiff))} {o.interestDiff < 0 ? 'menores' : 'maiores'})</>}.
              </li>
            ))}
          </ul>
        )}
        <p className="cx-hint cx-pad">Mesmo valor, prazo, taxa e IOF nas colunas; só muda o sistema de amortização. Pagamento Final = valor + juros + IOF.</p>
      </article>
      <p className="status">Estimativa com a taxa informada, sem tarifas, seguros nem outros impostos. IOF de pessoa jurídica calculado sobre o principal de cada parcela, com meses de 365/12 dias (a tela não pede datas). Taxa a.a. convertida por juros compostos. Não é o CET do contrato.</p>
    </section>
  )
}

// Aba Calculadoras: lista de calculadoras (ícones) e a calculadora aberta, com endereço próprio (#calculadora/giro).
export default function Calculadora({ view, onView }) {
  if (view === 'giro') return <CapitalDeGiro onBack={() => onView('')} />
  return (
    <section className="cx" aria-labelledby="calc-title">
      <h2 id="calc-title" className="cx-title">Calculadoras</h2>
      <div className="cx-tiles">
        {CALCS.map(({ id, title, sub, Icon }) => (
          <button key={id} type="button" className="cx-tile" onClick={() => onView(id)} aria-label={`${title}: abrir calculadora`}>
            <span className="cx-icon" aria-hidden="true"><Icon /></span>
            <span className="cx-tile-text"><b>{title}</b><small>{sub}</small></span>
            <span className="cx-go" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </section>
  )
}
