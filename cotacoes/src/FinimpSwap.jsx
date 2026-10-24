import { useMemo, useState } from 'react'
import { FORMULAS, finimpSwap, swapTsv } from './finimpSwap.js'
import { parseNum, parseRate } from './calc.js'
import { nextBusinessDay } from './holidays.js'
import Pracas from './Pracas.jsx'
import Explain from './Explain.jsx'
import ResultBar from './ResultBar.jsx'

const dm = (iso) => iso.split('-').reverse().join('/')
const num = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const usd = (v) => (v === 0 ? '-' : num(v))
const addDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

// FINIMP 4131 + swap para CDI, no formato da cotação do banco: perna em USD (juros, IR, amortização) e perna em R$ (CDI esperado + spread).
export default function FinimpSwap({ curves, hol }) {
  const [start, setStart] = useState('')
  const [vUsd, setVUsd] = useState('')
  const [vBrl, setVBrl] = useState('')
  const [n, setN] = useState('')
  const [grace, setGrace] = useState('')
  const [step, setStep] = useState('30')
  const [rate, setRate] = useState('')
  const [ir, setIr] = useState('15')
  const [spread, setSpread] = useState('')
  const [flat, setFlat] = useState('')
  const [cals, setCals] = useState(['BR', 'NY'])
  const [copied, setCopied] = useState(false)

  const br = curves.data?.br
  const today = br?.compare?.find((c) => c.id === 'hoje')
  const pts = today ? br.curves[today.date] : null
  const base = today?.date

  const res = useMemo(
    () =>
      finimpSwap({
        start,
        usd: parseNum(vUsd),
        brl: parseNum(vBrl),
        n: parseInt(n, 10) || 0,
        grace: grace === '' ? NaN : parseInt(grace, 10),
        step: parseInt(step, 10) || 0,
        ratePct: rate === '' ? NaN : parseRate(rate),
        irPct: ir === '' ? 0 : parseRate(ir),
        spreadPct: spread === '' ? NaN : parseRate(spread),
        pts,
        base,
        cals,
        ctx: hol.ctx,
        flatCdi: flat === '' ? undefined : parseRate(flat),
      }),
    [start, vUsd, vBrl, n, grace, step, rate, ir, spread, flat, pts, base, cals, hol.ctx],
  )
  const fx = parseNum(vUsd) > 0 && parseNum(vBrl) > 0 ? parseNum(vBrl) / parseNum(vUsd) : null
  const fill = () => {
    setStart(nextBusinessDay(addDays(10), cals, hol.ctx))
    setVUsd('2.879.963,14')
    setVBrl('15.000.000,00')
    setN('60')
    setGrace('6')
    setStep('30')
    setRate('6,48')
    setIr('15')
    setSpread('2,50')
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(swapTsv(res))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sem permissão de área de transferência */
    }
  }
  const bar = res.ok ? { main: `Total em R$ ${num(res.totals.parcelaBrl)}`, sub: `${res.rows.length} parcelas · ativo + IR ${num(res.allIn)}% a.a.` } : null

  return (
    <article className="chart finimp calc-split stack">
      <div className="calc-in">
        <p className="status note">Reproduz o formato da cotação do banco: perna em dólar (juros, IR e amortização) e perna em reais do swap (CDI esperado + spread). Estimativa; nada é presumido além do que você informa e da curva DI x pré.</p>
        <div className="calc-form">
          <button type="button" className="btn small" onClick={fill}>Preencher exemplo</button>
        </div>

        <h3 className="calc-sub">Operação</h3>
        <div className="calc-form">
          <label>Desembolso<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label>Volume (USD)<input inputMode="decimal" value={vUsd} onChange={(e) => setVUsd(e.target.value)} placeholder="2.879.963,14" /></label>
          <label>Volume (R$), nocional do swap<input inputMode="decimal" value={vBrl} onChange={(e) => setVBrl(e.target.value)} placeholder="15.000.000,00" /></label>

          <label>Parcelas<input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} placeholder="60" /></label>
          <label>Carência (parcelas só de juros)<input inputMode="numeric" value={grace} onChange={(e) => setGrace(e.target.value)} placeholder="6" /></label>
          <label>Intervalo (dias corridos)<input inputMode="numeric" value={step} onChange={(e) => setStep(e.target.value)} /></label>
        </div>

        {fx && <p className="status">Câmbio implícito: R$ {num(fx, 4)} por US$</p>}
        <h3 className="calc-sub">Custo em dólar</h3>
        <div className="calc-form">
          <label>Taxa do ativo (% a.a., ACT/360)<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="6,48" /></label>
          <label><span>IR sobre os juros (%) <Explain id="irGrossUp" /></span><input inputMode="decimal" value={ir} onChange={(e) => setIr(e.target.value)} /></label>
        </div>

        <h3 className="calc-sub">Swap para CDI</h3>
        <div className="calc-form">
          <label>Spread sobre o CDI (% a.a.)<input inputMode="decimal" value={spread} onChange={(e) => setSpread(e.target.value)} placeholder="2,50" /></label>
          <label>CDI esperado: vazio usa a curva DI; ou informe um CDI fixo (% a.a.)<input inputMode="decimal" value={flat} onChange={(e) => setFlat(e.target.value)} placeholder="curva DI x pré" /></label>
        </div>
        {curves.status === 'loading' && <p className="status">Carregando curva DI…</p>}
        {curves.status !== 'loading' && !pts && flat === '' && <p className="status stale">Curva DI indisponível agora: informe um CDI fixo para calcular a perna em reais.</p>}
      </div>

      <div className="calc-out" id="calc-out">
        {!res.ok ? (
          <div className="calc-block">
            <p className="status stale">Para calcular, falta:</p>
            <ul className="miss">{res.missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        ) : (
          <>
            <table className="focus-table fin-table ficha">
              <tbody>
                <tr><th scope="row">{res.rows.length}x</th><td>4131</td></tr>
                <tr><th scope="row">Volume</th><td>USD {num(parseNum(vUsd))} // BRL {num(parseNum(vBrl))}</td></tr>
                <tr><th scope="row">Custo (USD)</th><td>Taxa ativo + IR: {num(res.allIn)}% a.a.</td></tr>
                <tr><th scope="row">Custo (BRL)</th><td>Swap CDI: {num(parseRate(spread))}% a.a. · {num(res.spreadAm)}% a.m.</td></tr>
                <tr><th scope="row">Total parcelas (R$)</th><td><b>{num(res.totals.parcelaBrl)}</b></td></tr>
              </tbody>
            </table>
            {res.extrapolated && <p className="status stale">O prazo passa do último vértice da curva DI; além dele o CDI esperado segue a última taxa a termo.</p>}
            <div className="scroll">
              <table className="focus-table fin-table cards swap-table">
                <thead>
                  <tr><th>#</th><th>Início</th><th>Data Final</th><th>DC</th><th>DU Intra</th><th>Saldo devedor USD</th><th>Amortização USD</th><th>Juros</th><th>IR</th><th>Parcela USD</th><th>Parcela Esperada BRL</th></tr>
                </thead>
                <tbody>
                  {res.rows.map((r) => (
                    <tr key={r.k}>
                      <td data-label="#">{r.k}</td>
                      <td data-label="Início">{dm(r.start)}</td>
                      <td data-label="Data Final">{dm(r.end)}</td>
                      <td data-label="DC">{r.dc}</td>
                      <td data-label="DU Intra">{r.du}</td>
                      <td data-label="Saldo devedor USD">{num(r.balUsd)}</td>
                      <td data-label="Amortização USD">{usd(r.amUsd)}</td>
                      <td data-label="Juros">{num(r.juros)}</td>
                      <td data-label="IR">{num(r.ir)}</td>
                      <td data-label="Parcela USD">{num(r.parcelaUsd)}</td>
                      <td data-label="Parcela Esperada BRL" className="yel">{num(r.parcelaBrl)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="6" scope="row">Total</th>
                    <td data-label="Amortização USD">{num(res.totals.amUsd)}</td>
                    <td data-label="Juros">{num(res.totals.juros)}</td>
                    <td data-label="IR">{num(res.totals.ir)}</td>
                    <td data-label="Parcela USD">{num(res.totals.parcelaUsd)}</td>
                    <td data-label="Parcela Esperada BRL" className="yel">{num(res.totals.parcelaBrl)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="calc-form">
              <button type="button" className="btn small" onClick={copy}>{copied ? 'Copiado' : 'Copiar cronograma (Excel)'}</button>
            </div>
            <details className="table">
              <summary>Fórmulas de cada coluna e conferências</summary>
              <ul className="miss">{res.checks.map((c) => <li key={c.label}>{c.ok ? '✓' : '✗'} {c.label}</li>)}</ul>
              <dl className="formulas">
                {FORMULAS.map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              <p className="status">Juros em USD são simples (ACT/360). O IR é gross-up: a empresa paga o imposto além do juro. A perna em reais usa o CDI esperado pela curva DI x pré da B3 ({base ? dm(base) : '—'}) e o spread capitalizado em dias úteis (base 252).</p>
            </details>
          </>
        )}
      </div>
      <ResultBar targetId="calc-out" main={bar?.main} sub={bar?.sub} />
    </article>
  )
}
