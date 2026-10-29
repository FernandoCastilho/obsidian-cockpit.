import { useState } from 'react'
import './Calculadora.css'
import MoneyInput from './MoneyInput.jsx'
import { parseMoneyInput } from './moneyInput.js'
import { SYSTEMS, loan, parseDecimal } from './emprestimo.js'

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
  const money = parseMoneyInput(valueText)
  const n = /^\d+$/.test(nText.trim()) ? Number(nText) : null
  const rate = parseDecimal(rateText)
  const errors = {
    value: money.ok ? null : money.error,
    n: n !== null && n >= 1 && n <= 600 ? null : 'Informe o prazo em meses, número inteiro de 1 a 600.',
    rate: rate !== null && rate <= 1000 ? null : 'Informe a taxa em %, por exemplo 2,00.',
  }
  const result = Object.values(errors).some(Boolean) ? null : loan({ value: money.value, n, rate, unit, system })
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
        </div>
      </article>

      <div className="cx-gap" aria-hidden="true" />

      <article className="desk-panel cx-panel" aria-live="polite">
        <header><h3>Resultado</h3></header>
        <dl className="cx-result">
          <div>
            <dt>Parcela</dt>
            <dd>{result ? (result.installment == null ? '—' : brl(result.installment)) : '—'}</dd>
            <small>{!result ? 'Preencha as condições gerais.' : result.system === 'price' ? `fixa, em ${result.n}x` : result.system === 'sac' ? `1ª parcela; a última é ${brl(result.last)}` : 'sem parcelas: pagamento único no vencimento'}</small>
          </div>
          <div>
            <dt>Juros Totais</dt>
            <dd>{result ? brl(result.interest) : '—'}</dd>
            <small>{result ? `${(result.interest / money.value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% do valor` : ' '}</small>
          </div>
          <div>
            <dt>Pagamento Final</dt>
            <dd>{result ? brl(result.total) : '—'}</dd>
            <small>{result ? 'total pago: valor + juros' : ' '}</small>
          </div>
        </dl>
      </article>
      <p className="status">Estimativa com a taxa informada, sem tarifas, IOF, seguros nem impostos. Taxa a.a. convertida por juros compostos. Não é o CET do contrato.</p>
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
