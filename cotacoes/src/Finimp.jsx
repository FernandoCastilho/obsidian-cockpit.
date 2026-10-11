import { useMemo, useState } from 'react'
import { DECIMALS, simulate, toTsv } from './finimp.js'
import { parseNum } from './calc.js'
import Explain from './Explain.jsx'
import ResultBar from './ResultBar.jsx'
import Pracas from './Pracas.jsx'
import DateCheck from './DateCheck.jsx'
import { nextBusinessDay } from './holidays.js'

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

export default function Finimp({ hol }) {
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
  const [more, setMore] = useState(false)
  const [empresa, setEmpresa] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [deriv, setDeriv] = useState('')
  const [copiedQ, setCopiedQ] = useState(false)

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
  const bar = res.ok ? { main: `Juros ${fmt(res.totals.interest)}`, sub: `principal ${fmt(res.totals.disbursed)} · total pago ${fmt(res.totals.paid)}` } : null
  const fill = () => {
    const nb = (n) => nextBusinessDay(addDays(n), hol.pracas, hol.ctx) // exemplo sempre em dia útil comum às praças
    const a = nb(10)
    setCurrency(EXAMPLE.currency)
    setDisb([{ date: a, amount: EXAMPLE.disb[0].amount }])
    setStructure('bullet')
    setMaturity(nb(190))
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
  // Ficha da cotação: Empresa, CNPJ, Valor, Moeda, Prazo total, Cronograma, Derivativo, Taxa, Vl Final
  const dash = (v) => (v === '' || v == null ? '—' : v)
  const sched = !res.ok
    ? '—'
    : structure === 'amort'
      ? res.rows.filter((r) => r.amortization).map((r) => `${dm(r.date)}: ${fmt(r.amortization)}`).join(' · ')
      : structure === 'periodic'
        ? `Principal em ${dm(res.maturity)}; juros em ${res.rows.filter((r) => r.interestPaid).map((r) => dm(r.date)).join(', ')}`
        : `Bullet: principal e juros em ${dm(res.maturity)}`
  const ficha = [
    ['Empresa', dash(empresa)],
    ['CNPJ', dash(cnpj)],
    ['Valor', res.ok ? fmt(res.totals.disbursed) : '—'],
    ['Moeda', currency],
    ['Prazo total', res.ok ? `${Math.round((Date.parse(res.maturity) - Date.parse(res.first)) / 864e5)} dias corridos` : '—'],
    ['Cronograma de amortização', sched],
    ['Derivativo', dash(deriv)],
    ['Taxa', rate === '' ? '—' : `${rate}% a.a. (${dayCount || 'convenção a definir'}${rule ? `, ${rule === 'comp' ? 'composta' : 'proporcional'}` : ''})`],
    ['Vl Final', res.ok ? fmt(res.totals.paid) : '—'],
  ]
  const copyQ = async () => {
    try {
      await navigator.clipboard.writeText(ficha.map(([k, v]) => `${k}\t${v}`).join('\n'))
      setCopiedQ(true)
      setTimeout(() => setCopiedQ(false), 2000)
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
    <article className="chart finimp calc-split">
      <div className="calc-in">
      <p className="status note">Estimativa com os dados que você informa; nada é buscado nem presumido. Não é CET regulatório.</p>
      <Pracas pracas={hol.pracas} onChange={hol.setPracas} label="Praças da operação (avisos de feriado nas datas)" />
      <div className="calc-form">
        <label>
          Moeda
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['USD', 'EUR', 'JPY'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" className="btn small" onClick={fill}>Preencher exemplo</button>
      </div>

      <h3 className="calc-sub">Identificação</h3>
      <div className="calc-form">
        <label>Empresa<input value={empresa} onChange={(e) => setEmpresa(e.target.value)} autoComplete="organization" /></label>
        <label>CNPJ<input inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" /></label>
        <label>Derivativo<input value={deriv} onChange={(e) => setDeriv(e.target.value)} placeholder="ex.: swap USD x CDI, NDF, sem derivativo" /></label>
      </div>

      <h3 className="calc-sub">Desembolsos</h3>
      <Rows
        items={disb}
        setItems={setDisb}
        blank={{ date: '', amount: '' }}
        addLabel="desembolso"
        render={(it, up) => (
          <>
            <label>Data<input type="date" value={it.date} onChange={(e) => up({ date: e.target.value })} /><DateCheck date={it.date} hol={hol} onUse={(d) => up({ date: d })} /></label>
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
          <label>Vencimento<input type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} /><DateCheck date={maturity} hol={hol} onUse={setMaturity} /></label>
        </div>
      )}
      {structure === 'periodic' && (
        <Rows items={interest} setItems={setInterest} blank={{ date: '' }} addLabel="data de juros" render={(it, up) => <label>Data de pagamento de juros<input type="date" value={it.date} onChange={(e) => up({ date: e.target.value })} /><DateCheck date={it.date} hol={hol} onUse={(d) => up({ date: d })} /></label>} />
      )}
      {structure === 'amort' && (
        <Rows
          items={amort}
          setItems={setAmort}
          blank={{ date: '', kind: 'pct', amount: '' }}
          addLabel="amortização"
          render={(it, up) => (
            <>
              <label>Data<input type="date" value={it.date} onChange={(e) => up({ date: e.target.value })} /><DateCheck date={it.date} hol={hol} onUse={(d) => up({ date: d })} /></label>
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

</div>
<div className="calc-out" id="calc-out">
      <h3 className="calc-sub">Ficha da cotação</h3>
      <div className="scroll">
        <table className="focus-table fin-table ficha">
          <tbody>
            {ficha.map(([k, v]) => (
              <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="calc-form">
        <button type="button" className="btn small" onClick={copyQ}>{copiedQ ? 'Copiado' : 'Copiar ficha (Excel)'}</button>
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
            <table className="focus-table fin-table cards">
              <thead>
                <tr>
                  <th>Data</th>
                  {more && <th>Saldo inicial</th>}
                  {more && <th>Desembolso</th>}
                  {more && <th>Juros do trecho</th>}
                  <th>Juros pagos</th>
                  <th>Amortização</th>
                  {more && <th>Saldo final</th>}
                  <th>Fluxo (tomador)</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.date}>
                    <td data-label="Data">{dm(r.date)}</td>
                    {more && <td data-label="Saldo inicial">{fmt(r.opening)}</td>}
                    {more && <td data-label="Desembolso">{r.disbursement ? fmt(r.disbursement) : '—'}</td>}
                    {more && <td data-label="Juros do trecho">{r.accrued ? fmt(r.accrued) : '—'}</td>}
                    <td data-label="Juros pagos">{r.interestPaid ? fmt(r.interestPaid) : '—'}</td>
                    <td data-label="Amortização">{r.amortization ? fmt(r.amortization) : '—'}</td>
                    {more && <td data-label="Saldo final">{fmt(r.closing)}</td>}
                    <td data-label="Fluxo (tomador)">{r.flow >= 0 ? '+' : '−'}{fmt(Math.abs(r.flow))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="calc-form">
            <button type="button" className="btn small" onClick={copy}>{copied ? 'Copiado' : 'Copiar cronograma (Excel)'}</button>
            <button type="button" className="btn small" aria-pressed={more} onClick={() => setMore((v) => !v)}>{more ? 'Menos colunas' : 'Mais colunas'}</button>
          </div>
          <details className="table">
            <summary>Memória de cálculo e reconciliação</summary>
            <ul className="miss">
              {res.checks.map((c) => <li key={c.label}>{c.ok ? '✓' : '✗'} {c.label}</li>)}
            </ul>
            <div className="scroll">
              <table className="focus-table fin-table cards">
                <thead><tr><th>Trecho</th><th>Dias</th><th>Saldo</th><th>Fração início</th><th>Fração fim</th><th>Fórmula</th><th>Juros</th></tr></thead>
                <tbody>
                  {res.memo.map((m) => (
                    <tr key={m.from + m.to}>
                      <td data-label="Trecho">{dm(m.from)} → {dm(m.to)}</td>
                      <td data-label="Dias">{m.days}</td>
                      <td data-label="Saldo">{fmt(m.balance)}</td>
                      <td data-label="Fração início">{m.f0.toFixed(6)}</td>
                      <td data-label="Fração fim">{m.f1.toFixed(6)}</td>
                      <td data-label="Fórmula">{m.formula}</td>
                      <td data-label="Juros">{fmt(m.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="status">
              Frações de período em dias corridos efetivos ÷ {res.base} ({dayCount}), contadas desde o início de cada período de juros (último pagamento de juros). Precisão interna total; {round ? `os juros pagos foram arredondados a ${dec} casas por pagamento` : 'sem arredondamento interno, só na exibição'}. Datas informadas são usadas como estão: o app avisa feriados nas praças escolhidas, mas não ajusta datas sozinho. Entradas: taxa {rate}% a.a. informada por você.
            </p>
          </details>
        </>
      )}
</div>
      <ResultBar targetId="calc-out" main={bar?.main} sub={bar?.sub} />
    </article>
  )
}
