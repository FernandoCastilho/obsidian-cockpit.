import { useMemo, useState } from 'react'
import { giro, giroTsv, giroVsCdi } from './giro.js'
import { parseNum } from './calc.js'
import Pracas from './Pracas.jsx'
import DateCheck from './DateCheck.jsx'
import Explain from './Explain.jsx'
import ResultBar from './ResultBar.jsx'

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v, d = 2) => (v == null ? '—' : `${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`)
const dm = (iso) => iso.split('-').reverse().join('/')
const STRUCT = [
  ['price', 'Parcelas iguais (Price)'],
  ['sac', 'Amortização constante (SAC)'],
  ['bullet', 'Bullet (tudo no vencimento)'],
]
const today = () => new Date().toISOString().slice(0, 10)

export default function Giro({ curves, hol }) {
  const [value, setValue] = useState('500.000,00')
  const [n, setN] = useState('12')
  const [structure, setStructure] = useState('price')
  const [rate, setRate] = useState('1,80')
  const [unit, setUnit] = useState('am')
  const [start, setStart] = useState(today())
  const [fees, setFees] = useState('0')
  const [copied, setCopied] = useState(false)
  const res = useMemo(
    () => giro({ value: parseNum(value), n: parseInt(n, 10) || 0, structure, rate: parseNum(rate), unit, start, fees: parseNum(fees) || 0 }),
    [value, n, structure, rate, unit, start, fees],
  )
  const pts = (() => {
    const today = curves.data?.br?.compare?.find((c) => c.id === 'hoje')
    return today ? curves.data.br.curves[today.date] : null
  })()
  const cmp = res.ok && pts ? giroVsCdi(pts, res) : null
  const bar = res.ok ? { main: structure === 'bullet' ? `Pagar ${brl(res.totalPaid)}` : `1ª parcela ${brl(res.rows[0].payment)}`, sub: `juros ${brl(res.totalInterest)} · custo ${res.cost ? pct(res.cost.aa) : '—'} a.a.` } : null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(giroTsv(res))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sem permissão de área de transferência */
    }
  }

  return (
    <article className="chart calc-split">
      <div className="calc-in">
      <p className="status note">Estimativa com os dados que você informa; tarifas e impostos não são presumidos. Não é CET regulatório.</p>
      <Pracas pracas={hol.pracas} onChange={hol.setPracas} label="Praças (avisos de feriado nas datas)" />
      <div className="calc-form">
        <label>
          Valor liberado (R$)
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label>
          Prazo (meses)
          <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} />
        </label>
        <label>
          Início
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </label>
      </div>
      <div className="calc-form">
        <div>
          <span className="lbl">Estrutura de pagamento <Explain id="giro" /></span>
          <div className="seg" role="group" aria-label="Estrutura de pagamento">
            {STRUCT.map(([id, label]) => (
              <button key={id} type="button" aria-pressed={structure === id} onClick={() => setStructure(id)}>{label}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="calc-form">
        <div className="seg" role="group" aria-label="Unidade da taxa">
          <button type="button" aria-pressed={unit === 'am'} onClick={() => setUnit('am')}>ao mês</button>
          <button type="button" aria-pressed={unit === 'aa'} onClick={() => setUnit('aa')}>ao ano</button>
        </div>
        <label>
          Taxa (% {unit === 'am' ? 'ao mês' : 'ao ano'})
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
        <label>
          Despesas à vista (R$): tarifa, IOF e seguro descontados do valor
          <input inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} />
        </label>
      </div>
</div>
<div className="calc-out" id="calc-out">
      {!res.ok ? (
        <div className="calc-block">
          {res.missing?.length > 0 && (
            <>
              <p className="status stale">Para calcular, falta:</p>
              <ul className="miss">{res.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            </>
          )}
          {res.error && <p className="status stale">{res.error}</p>}
        </div>
      ) : (
        <>
          <p className="calc-verdict">
            {structure === 'bullet' ? `Pagar ${brl(res.totalPaid)} em ${dm(res.end)}` : `${brl(res.rows[0].payment)} na 1ª parcela${structure === 'sac' ? ` (a última sai ${brl(res.rows.at(-1).payment)})` : ' (iguais)'}`}
            <small>
              {' '}· total pago {brl(res.totalPaid)} · juros {brl(res.totalInterest)} ({pct((res.totalInterest / parseNum(value)) * 100)} do valor) · taxa {pct(res.i)} ao mês · prazo médio {res.avgLife.toFixed(1).replace('.', ',')} meses
            </small>
          </p>
          <div className="options">
            <section className="opt">
              <h4>Custo efetivo (com as despesas à vista)</h4>
              <dl>
                <dt>Dinheiro recebido</dt>
                <dd>{brl(res.cash)}</dd>
                <dt>Custo efetivo ao mês</dt>
                <dd>{res.cost ? pct(res.cost.am) : '—'}</dd>
                <dt>Custo efetivo ao ano</dt>
                <dd>{res.cost ? pct(res.cost.aa) : '—'}</dd>
              </dl>
            </section>
            <section className="opt">
              <h4>Em relação ao CDI</h4>
              {cmp ? (
                <dl>
                  <dt>DI da curva no prazo médio ({cmp.d} dias úteis)</dt>
                  <dd>{pct(cmp.diAa)} a.a.</dd>
                  <dt>Custo efetivo ÷ DI</dt>
                  <dd>{pct(cmp.pctCdi, 1)} do CDI</dd>
                </dl>
              ) : (
                <p className="status">Comparação indisponível (curva DI fora do ar ou sem custo efetivo).</p>
              )}
            </section>
          </div>
          <DateCheck date={res.rows[0].date} hol={hol} />
          <DateCheck date={res.end} hol={hol} />
          <details className="table" open={res.rows.length <= 14}>
            <summary>Cronograma de pagamentos ({res.rows.length} parcelas)</summary>
            <div className="scroll">
              <table className="focus-table fin-table cards">
                <thead><tr><th>Parcela</th><th>Data</th><th>Pagamento</th><th>Juros</th><th>Amortização</th><th>Saldo devedor</th></tr></thead>
                <tbody>
                  {res.rows.map((r) => (
                    <tr key={r.k}>
                      <td data-label="Parcela">{r.k}</td>
                      <td data-label="Data">{dm(r.date)}</td>
                      <td data-label="Pagamento">{r.payment ? brl(r.payment) : '—'}</td>
                      <td data-label="Juros">{r.interest ? brl(r.interest) : '—'}</td>
                      <td data-label="Amortização">{r.amort ? brl(r.amort) : '—'}</td>
                      <td data-label="Saldo devedor">{brl(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className="calc-form">
            <button type="button" className="btn small" onClick={copy}>{copied ? 'Copiado' : 'Copiar cronograma (Excel)'}</button>
          </div>
          <details className="premissas">
            <summary>Premissas e método</summary>
          <p className="status">
            Juros compostos mensais, parcelas mensais sem ajuste de feriado (o app só avisa) e IOF e tarifas só entram se você informar em "Despesas à vista". O custo efetivo é a taxa que zera o valor presente dos fluxos. A comparação com o CDI usa o DI da curva da B3 no prazo médio (21 dias úteis por mês), não o CDI realizado.
          </p>
          </details>
        </>
      )}
</div>
      <ResultBar targetId="calc-out" main={bar?.main} sub={bar?.sub} />
    </article>
  )
}
