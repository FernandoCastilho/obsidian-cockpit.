import { useMemo, useState } from 'react'
import { DECIMALS, simulate, toTsv } from './finimp.js'
import { parseNum } from './calc.js'
import Explain from './Explain.jsx'

const dm = (iso) => iso.split('-').reverse().join('/')
const EXAMPLE = {
  currency: 'USD',
  disb: [{ date: '', amount: '1.000.000,00' }],
  structure: 'bullet',
  rate: '6,50',
  interest: [''],
  amort: [{ date: '', kind: 'pct', amount: '50' }, { date: '', kind: 'pct', amount: '50' }],
}
const addDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

// Lista de linhas com botão de remover; `render` desenha os campos da linha.
function Rows({ items, setItems, blank, render, addLabel }) {
  return (
    <div className="rows">
      {items.map((it, i) => (
        <div className="row" key={i}>
          {render(it, (patch) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
          {items.length > 1 && (
            <button type="button" className="x" aria-label="Remover linha" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>
          )}
        </div>
      ))}
      <button type="button" className="btn small" onClick={() => setItems([...items, { ...blank }])}>+ {addLabel}</button>
    </div>
  )
}

export default function Finimp() {
  const [currency, setCurrency] = useState('USD')
  const [disb, setDisb] = useState([{ date: '', amount: '' }])
  const [structure, setStructure] = useState('')
  const [maturity, setMaturity] = useState('')
  const [interest, setInterest] = useState([{ date: '' }])
  const [amort, setAmort] = useState([{ date: '', kind: 'pct', amount: '' }])
  const [rate, setRate] = useState('')
  const [rule, setRule] = useState('')
  const [dayCount, setDayCount] = useState('')
  const [round, setRound] = useState(false)
  const [copied, setCopied] = useState(false)

  const res = useMemo(
    () =>
      simulate({
        currency,
        disb: disb.map((d) => ({ date: d.date, amount: d.amount === '' ? '' : parseNum(d.amount) })),
        structure,
        maturity,
        interestDates: interest.map((i) => i.date).filter(Boolean),
        amort: amort.map((a) => ({ ...a, amount: a.amount === '' ? '' : parseNum(a.amount) })),
        rate: rate === '' ? NaN : parseNum(rate),
        rule,
        dayCount,
        round,
      }),
    [currency, disb, structure, maturity, interest, amort, rate, rule, dayCount, round],
  )
  const dec = DECIMALS[currency]
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency, minimumFractionDigits: dec, maximumFractionDigits: dec })
  const fill = () => {
    const a = addDays(10)
    setCurrency(EXAMPLE.currency)
    setDisb([{ date: a, amount: EXAMPLE.disb[0].amount }])
    setStructure('bullet')
    setMaturity(addDays(190))
    setRate(EXAMPLE.rate)
    setRule('prop')
    setDayCount('ACT/360')
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toTsv(res))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sem permissão de área de transferência */
    }
  }
  const seg = (value, set, options, label) => (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => set(id)}>{text}</button>
      ))}
    </div>
  )

  return (
    <article className="chart finimp">
      <p className="status stale">
        Simulação com dados informados por você: nada é buscado nem presumido. O resultado é uma estimativa, não é CET regulatório nem confirma conformidade.
      </p>
      <div className="calc-form">
        <label>
          Moeda
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['USD', 'EUR', 'JPY'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" className="btn small" onClick={fill}>Preencher exemplo</button>
      </div>

      <h3 className="calc-sub">Desembolsos</h3>
      <Rows
        items={disb}
        setItems={setDisb}
        blank={{ date: '', amount: '' }}
        addLabel="desembolso"
        render={(it, up) => (
          <>
            <label>Data<input type="date" value={it.date} onChange={(e) => up({ date: e.target.value })} /></label>
            <label>Valor ({currency})<input inputMode="decimal" value={it.amount} onChange={(e) => up({ amount: e.target.value })} /></label>
          </>
        )}
      />

      <h3 className="calc-sub">Estrutura de pagamento</h3>
      {seg(structure, setStructure, [['bullet', 'Bullet'], ['periodic', 'Juros periódicos'], ['amort', 'Amortizações']], 'Estrutura')}
      {structure === 'bullet' && <p className="status">Principal e juros pagos no vencimento. Os juros ficam acumulados a pagar; não são somados ao principal.</p>}
      {structure === 'periodic' && <p className="status">Principal no vencimento; juros pagos nas datas abaixo e no vencimento.</p>}
      {structure === 'amort' && <p className="status">Os juros são pagos junto de cada amortização. A soma das amortizações deve igualar o principal; o último pagamento é o vencimento.</p>}
      {structure && structure !== 'amort' && (
        <div className="calc-form">
          <label>Vencimento<input type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} /></label>
        </div>
      )}
      {structure === 'periodic' && (
        <Rows items={interest} setItems={setInterest} blank={{ date: '' }} addLabel="data de juros" render={(it, up) => <label>Data de pagamento de juros<input type="date" value={it.date} onChange={(e) => up({ date: e.target.value })} /></label>} />
      )}
      {structure === 'amort' && (
        <Rows
          items={amort}
          setItems={setAmort}
          blank={{ date: '', kind: 'pct', amount: '' }}
          addLabel="amortização"
          render={(it, up) => (
            <>
              <label>Data<input type="date" value={it.date} onChange={(e) => up({ date: e.target.value })} /></label>
              <label>
                Tipo
                <select value={it.kind} onChange={(e) => up({ kind: e.target.value })}>
                  <option value="pct">% do principal</option>
                  <option value="value">Valor ({currency})</option>
                </select>
              </label>
              <label>{it.kind === 'pct' ? '%' : `Valor (${currency})`}<input inputMode="decimal" value={it.amount} onChange={(e) => up({ amount: e.target.value })} /></label>
            </>
          )}
        />
      )}

      <h3 className="calc-sub">Taxa e regra de juros</h3>
      <div className="calc-form">
        <label>Taxa final (% a.a.)<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="ex.: 6,50" /></label>
        <div>
          <span className="lbl">Regra de juros <Explain id="regraJuros" /></span>
          {seg(rule, setRule, [['prop', 'Proporcional (linear)'], ['comp', 'Composta (efetiva a.a.)']], 'Regra de juros')}
        </div>
        <div>
          <span className="lbl">Convenção de dias <Explain id="convencao" /></span>
          {seg(dayCount, setDayCount, [['ACT/360', 'ACT/360'], ['ACT/365F', 'ACT/365F']], 'Convenção de contagem de dias')}
        </div>
        <label className="chk"><input type="checkbox" checked={round} onChange={(e) => setRound(e.target.checked)} /> Arredondar os juros de cada pagamento a {dec} casas</label>
      </div>

      {!res.ok ? (
        <div className="calc-block">
          {res.missing.length > 0 && (
            <>
              <p className="status stale">Para calcular, falta:</p>
              <ul className="miss">{res.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            </>
          )}
          {res.errors.map((e) => <p key={e} className="status stale">{e}</p>)}
        </div>
      ) : (
        <>
          <p className="calc-verdict">
            Juros: {fmt(res.totals.interest)}
            <small> · principal {fmt(res.totals.disbursed)} · total pago {fmt(res.totals.paid)} · {res.rows.at(-1).date > res.first ? `prazo de ${Math.round((Date.parse(res.maturity) - Date.parse(res.first)) / 864e5)} dias corridos` : ''} · {dayCount}, {rule === 'comp' ? 'juros compostos' : 'juros proporcionais'}</small>
          </p>
          <div className="scroll">
            <table className="focus-table fin-table">
              <thead>
                <tr><th>Data</th><th>Saldo inicial</th><th>Desembolso</th><th>Juros do trecho</th><th>Juros pagos</th><th>Amortização</th><th>Saldo final</th><th>Fluxo (tomador)</th></tr>
              </thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.date}>
                    <td>{dm(r.date)}</td>
                    <td>{fmt(r.opening)}</td>
                    <td>{r.disbursement ? fmt(r.disbursement) : '—'}</td>
                    <td>{r.accrued ? fmt(r.accrued) : '—'}</td>
                    <td>{r.interestPaid ? fmt(r.interestPaid) : '—'}</td>
                    <td>{r.amortization ? fmt(r.amortization) : '—'}</td>
                    <td>{fmt(r.closing)}</td>
                    <td className={r.flow >= 0 ? 'up' : 'down'}>{fmt(r.flow)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="calc-form">
            <button type="button" className="btn small" onClick={copy}>{copied ? 'Copiado' : 'Copiar cronograma (Excel)'}</button>
          </div>
          <details className="table">
            <summary>Memória de cálculo e reconciliação</summary>
            <ul className="miss">
              {res.checks.map((c) => <li key={c.label}>{c.ok ? '✓' : '✗'} {c.label}</li>)}
            </ul>
            <div className="scroll">
              <table className="focus-table fin-table">
                <thead><tr><th>Trecho</th><th>Dias</th><th>Saldo</th><th>Fração início</th><th>Fração fim</th><th>Fórmula</th><th>Juros</th></tr></thead>
                <tbody>
                  {res.memo.map((m) => (
                    <tr key={m.from + m.to}>
                      <td>{dm(m.from)} → {dm(m.to)}</td>
                      <td>{m.days}</td>
                      <td>{fmt(m.balance)}</td>
                      <td>{m.f0.toFixed(6)}</td>
                      <td>{m.f1.toFixed(6)}</td>
                      <td>{m.formula}</td>
                      <td>{fmt(m.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="status">
              Frações de período em dias corridos efetivos ÷ {res.base} ({dayCount}), contadas desde o início de cada período de juros (último pagamento de juros). Precisão interna total; {round ? `os juros pagos foram arredondados a ${dec} casas por pagamento` : 'sem arredondamento interno, só na exibição'}. Datas informadas são usadas como estão: o app não ajusta feriados nem dias não úteis. Entradas: taxa {rate}% a.a. informada por você.
            </p>
          </details>
        </>
      )}
    </article>
  )
}
