import { useMemo, useState } from 'react'
import { busDaysIn } from './holidays.js'
import Pracas from './Pracas.jsx'
import DateCheck from './DateCheck.jsx'
import { compare, parseNum } from './calc.js'
import Explain from './Explain.jsx'
import Finimp from './Finimp.jsx'

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v, d = 2) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`
const dm = (iso) => iso.split('-').reverse().join('/')
const MODES = [
  { id: 'pre', label: 'Pré-fixada', ph: '14,50' },
  { id: 'cdi', label: '% do CDI', ph: '105' },
  { id: 'spread', label: 'CDI + spread', ph: '1,20' },
  { id: 'total', label: 'Valor total pago', ph: '1.074.000,00' },
]
const UNITS = [
  { id: 'aa', label: 'ao ano' },
  { id: 'am', label: 'ao mês' },
  { id: 'periodo', label: 'no período' },
]
const PH = { aa: '14,50', am: '1,15', periodo: '7,20' }
const TERMS = [
  { label: '3 meses', days: 91 },
  { label: '6 meses', days: 182 },
  { label: '1 ano', days: 365 },
  { label: '2 anos', days: 730 },
  { label: '3 anos', days: 1095 },
]

function OperacaoDi({ curves, hol }) {
  const br = curves.data?.br
  const today = br?.compare?.find((c) => c.id === 'hoje')
  const pts = today ? br.curves[today.date] : null
  const base = today?.date
  const iso = (days) => new Date(Date.parse(`${base}T12:00:00Z`) + days * 864e5).toISOString().slice(0, 10)
  const maxD = pts ? Math.max(...pts.map((p) => p[0])) : 0
  const maxIso = base ? iso(Math.floor((maxD / 252) * 365)) : ''
  const [value, setValue] = useState('1.000.000,00')
  const [due, setDue] = useState('')
  const [mode, setMode] = useState('pre')
  const [rate, setRate] = useState('1,20')
  const [side, setSide] = useState('borrow')
  const [unit, setUnit] = useState('am')
  const [monthBase, setMonthBase] = useState('du')
  const [appPct, setAppPct] = useState('100')
  const [net, setNet] = useState(true)
  const [ageTxt, setAgeTxt] = useState('0')
  const [accTxt, setAccTxt] = useState('0')
  const [daysTxt, setDaysTxt] = useState('180')
  const end = due && base ? (due < base ? base : due > maxIso ? maxIso : due) : base ? iso(Math.min(180, Math.floor((maxD / 252) * 365))) : ''
  const calDays = base && end ? Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${base}T12:00:00Z`)) / 864e5) : 0
  const pickDue = (s) => {
    setDue(s)
    setDaysTxt(String(Math.round((Date.parse(`${s}T12:00:00Z`) - Date.parse(`${base}T12:00:00Z`)) / 864e5)))
  }
  const typeDays = (v) => {
    setDaysTxt(v)
    const n = parseInt(v, 10)
    if (n > 0) setDue(iso(Math.min(n, Math.floor((maxD / 252) * 365))))
  }
  const d = base ? busDaysIn(base, end, ['BR'], hol.ctx) : 0 // dias úteis do DI: calendário nacional (B3/ANBIMA)
  const r = useMemo(() => (pts ? compare({ pts, d, value: parseNum(value), mode, rate: parseNum(rate), unit, side, calDays, monthBase, appPct: parseNum(appPct), net, ageDays: parseNum(ageTxt) || 0, accrued: parseNum(accTxt) || 0 }) : null), [pts, d, value, mode, rate, unit, side, calDays, monthBase, appPct, net, ageTxt, accTxt])
  const m = MODES.find((x) => x.id === mode)

  return (
    <>
      {curves.status === 'loading' && <div className="placeholder">Carregando curva DI…</div>}
      {curves.status !== 'loading' && !pts && <p className="status">Calculadora indisponível: depende da curva DI x pré da B3, que não veio na última atualização.</p>}
      {pts && (
        <article className="chart">
          <Pracas pracas={hol.pracas} onChange={hol.setPracas} label="Praças da operação (avisos de feriado)" />
          <div className="calc-form">
            <label>
              Valor (R$)
              <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
            <label>
              Vencimento
              <input type="date" min={base} max={maxIso} value={end} onChange={(e) => e.target.value && pickDue(e.target.value)} />
              <DateCheck date={end} hol={hol} onUse={pickDue} />
            </label>
            <label>
              Prazo (dias corridos)
              <input inputMode="numeric" value={daysTxt} onChange={(e) => typeDays(e.target.value)} />
            </label>
            <div className="seg" role="group" aria-label="Atalhos de prazo">
              {TERMS.map((t) => (
                <button key={t.label} type="button" onClick={() => pickDue(iso(Math.min(t.days, Math.floor((maxD / 252) * 365))))}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="calc-form">
            <div className="seg" role="group" aria-label="Tipo de taxa da operação">
              {MODES.map((x) => (
                <button key={x.id} type="button" aria-pressed={mode === x.id} onClick={() => (setMode(x.id), setUnit(x.id === 'spread' && unit === 'periodo' ? 'aa' : unit), setRate(x.id === 'pre' ? PH[unit] : x.ph))}>
                  {x.label}
                </button>
              ))}
            </div>
            {mode !== 'cdi' && mode !== 'total' && (
              <div className="seg" role="group" aria-label="Unidade da taxa">
                {UNITS.filter((u) => mode === 'pre' || u.id !== 'periodo').map((u) => (
                  <button key={u.id} type="button" aria-pressed={unit === u.id} onClick={() => (setUnit(u.id), mode === 'pre' && setRate(PH[u.id]))}>
                    {u.label}
                  </button>
                ))}
              </div>
            )}
            {mode !== 'cdi' && mode !== 'total' && unit === 'am' && (
              <div className="seg" role="group" aria-label="Base do mês">
                <button type="button" aria-pressed={monthBase === 'cal'} title="Mês de 30 dias corridos: prazo ÷ 30" onClick={() => setMonthBase('cal')}>mês = 30 dias corridos</button>
                <button type="button" aria-pressed={monthBase === 'du'} title="Mês de 21 dias úteis (252 ÷ 12), convenção do mercado de DI" onClick={() => setMonthBase('du')}>mês = 21 dias úteis</button>
              </div>
            )}
            <label>
              {mode === 'total' ? `Valor total ${side === 'borrow' ? 'pago' : 'recebido'} no vencimento (R$)` : `Taxa da operação (${mode === 'cdi' ? '% do CDI' : `% ${UNITS.find((u) => u.id === unit).label}`})`}
              <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={m.ph} />
            </label>
            <div className="seg" role="group" aria-label="Sentido da operação">
              <button type="button" aria-pressed={side === 'invest'} onClick={() => setSide('invest')}>Aplicação (eu recebo)</button>
              <button type="button" aria-pressed={side === 'borrow'} onClick={() => setSide('borrow')}>Empréstimo (eu pago)</button>
            </div>
          </div>
          {side === 'borrow' && (
            <div className="calc-form">
              <label>
                Aplicação: rentabilidade (% do CDI)
                <input inputMode="decimal" value={appPct} onChange={(e) => setAppPct(e.target.value)} />
              </label>
              <div>
                <span className="lbl">Comparar líquido de IR (CDB) <Explain id="irRegressivo" /></span>
                <div className="seg" role="group" aria-label="Comparação líquida de imposto">
                  <button type="button" aria-pressed={!net} onClick={() => setNet(false)}>Bruto</button>
                  <button type="button" aria-pressed={net} onClick={() => setNet(true)}>Líquido de IR</button>
                </div>
              </div>
              {net && (
                <>
                  <label>
                    Dias já aplicados
                    <input inputMode="numeric" value={ageTxt} onChange={(e) => setAgeTxt(e.target.value)} />
                  </label>
                  <label>
                    Rendimento já acumulado (R$)
                    <input inputMode="decimal" value={accTxt} onChange={(e) => setAccTxt(e.target.value)} />
                  </label>
                </>
              )}
            </div>
          )}
          {r?.error ? (
            <p className="status stale">{r.error}</p>
          ) : r ? (
            <>
              {side === 'borrow' ? (
                <>
                  <p className={`calc-verdict ${r.good ? 'up' : 'down'}`}>
                    {r.good
                      ? `Mais barato: manter a aplicação e tomar o empréstimo (economia de ${brl(Math.abs(r.diff))})`
                      : `Mais barato: resgatar a aplicação hoje (economia de ${brl(Math.abs(r.diff))})`}
                    <small> · custo de resgatar {brl(r.refGain)} × custo do empréstimo {brl(r.op.gain)} · prazo {calDays} dias corridos = {r.d} dias úteis até {dm(end)}</small>
                  </p>
                  <div className="options">
                    <section className={`opt${r.good ? '' : ' win'}`}>
                      <h4>Resgatar a aplicação hoje</h4>
                      <dl>
                        <dt>Rendimento que deixa de ganhar em {calDays} dias ({pct(parseNum(appPct), 0)} do CDI)</dt>
                        <dd>{brl(r.app.gross.gain)}</dd>
                        {net && (
                          <>
                            <dt>IR que incidiria sobre ele ({pct(r.app.tax.irPct, 1)}{r.app.tax.iofPct > 0 ? ` + IOF ${r.app.tax.iofPct}%` : ''}, tabela regressiva)</dt>
                            <dd>−{brl(r.app.tax.total)}</dd>
                            <dt>Rendimento líquido perdido</dt>
                            <dd>{brl(r.app.gross.gain - r.app.tax.total)}</dd>
                            <dt>IR pago hoje sobre o rendimento já acumulado de {brl(r.app.tax.accrued)} ({pct(r.app.tax.taxNow.irPct, 1)}{r.app.tax.taxNow.iofPct > 0 ? ` + IOF ${r.app.tax.taxNow.iofPct}%` : ''})</dt>
                            <dd>{brl(r.app.tax.taxNow.total)}</dd>
                            <dt>IR que pagaria no vencimento sobre o mesmo rendimento ({pct(r.app.tax.taxLater.irPct, 1)})</dt>
                            <dd>−{brl(r.app.tax.taxLater.total)}</dd>
                            <dt>IR antecipado ao resgatar hoje</dt>
                            <dd>{brl(r.app.tax.savings)}</dd>
                          </>
                        )}
                      </dl>
                      <p className="opt-total">Custo de resgatar <b>{brl(r.refGain)}</b></p>
                    </section>
                    <section className={`opt${r.good ? ' win' : ''}`}>
                      <h4>Manter a aplicação e tomar o empréstimo</h4>
                      <dl>
                        <dt>Juros do empréstimo ({pct(r.op.am)} ao mês = {pct(r.op.period)} em {calDays} dias)</dt>
                        <dd>{brl(r.op.gain)}</dd>
                        <dt>Total a pagar no vencimento</dt>
                        <dd>{brl(r.op.fv)}</dd>
                      </dl>
                      <p className="opt-total">Custo do empréstimo <b>{brl(r.op.gain)}</b></p>
                    </section>
                  </div>
                  {net && r.app.tax.accrued === 0 && (
                    <p className="status stale">O IR pago hoje depende do rendimento já acumulado: informe o valor e os dias já aplicados para ver a antecipação do imposto. Zerado, só o rendimento dos {calDays} dias entra na conta.</p>
                  )}
                  <details className="table">
                    <summary>Taxas comparadas</summary>
                    <div className="scroll">
                      <table className="focus-table">
                        <thead>
                          <tr><th></th><th>Empréstimo</th><th>Aplicação ({pct(parseNum(appPct), 0)} do CDI) bruta</th>{net && <th>Aplicação líquida de IR</th>}</tr>
                        </thead>
                        <tbody>
                          <tr><td>Taxa no período ({calDays} dias corridos, {r.d} d.u.)</td><td>{pct(r.op.period)}</td><td>{pct(r.app.gross.period)}</td>{net && <td>{pct(r.app.net.period)}</td>}</tr>
                          <tr><td>Taxa efetiva a.a.</td><td>{pct(r.op.aa)}</td><td>{pct(r.app.gross.aa)}</td>{net && <td>{pct(r.app.net.aa)}</td>}</tr>
                          <tr><td>Taxa equivalente ao mês</td><td>{pct(r.op.am)}</td><td>{pct(r.app.gross.am)}</td>{net && <td>{pct(r.app.net.am)}</td>}</tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              ) : (
                <>
                  <p className={`calc-verdict ${r.good ? 'up' : 'down'}`}>
                {side === 'invest'
                  ? `A operação rende ${brl(Math.abs(r.diff))} ${r.diff >= 0 ? 'a mais' : 'a menos'} que aplicar no CDI`
                  : `O empréstimo custa ${brl(Math.abs(r.diff))} ${r.diff >= 0 ? 'a mais do que' : 'a menos do que'} a aplicação no CDI rende`}
                <small>
                  {side === 'borrow'
                    ? ` · pagar ${brl(r.op.fv)} em ${calDays} dias (custo de ${brl(r.op.gain)}); aplicar ${brl(parseNum(value))} no CDI rende ${brl(r.di.gain)}. Tomar o empréstimo e aplicar no CDI: resultado de ${brl(-r.diff)}.`
                    : ` · ${Math.abs(r.diffBps).toFixed(0)} bps a.a. ${r.diffBps >= 0 ? 'acima' : 'abaixo'} do CDI`}
                  {' '}· prazo {calDays} dias corridos = {r.d} dias úteis até {dm(end)}
                </small>
              </p>
              <div className="scroll">
                <table className="focus-table">
                  <thead>
                    <tr><th></th><th>{side === 'borrow' ? 'Empréstimo' : 'Operação'}</th><th>Aplicação no CDI (curva)</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Taxa no período ({calDays} dias corridos, {r.d} d.u.)</td><td>{pct(r.op.period)}</td><td>{pct(r.di.period)}</td></tr>
                    <tr><td>Taxa efetiva a.a.</td><td>{pct(r.op.aa)}</td><td>{pct(r.di.aa)}</td></tr>
                    <tr><td>Taxa equivalente ao mês</td><td>{pct(r.op.am)}</td><td>{pct(r.di.am)}</td></tr>
                    <tr><td>{side === 'invest' ? 'Rendimento' : 'Custo (empréstimo) / rendimento (CDI)'} no prazo</td><td>{brl(r.op.gain)}</td><td>{brl(r.di.gain)}</td></tr>
                    <tr><td>{side === 'borrow' ? 'Valor a pagar / valor resgatado' : 'Valor no vencimento'}</td><td>{brl(r.op.fv)}</td><td>{brl(r.di.fv)}</td></tr>
                    <tr><td>% do CDI do período</td><td>{r.cdiEquivalent != null ? pct(r.cdiEquivalent, 1) : '—'}</td><td>100,0%</td></tr>
                  </tbody>
                </table>
              </div>
                </>
              )}
              {mode !== 'cdi' && r.cdiEquivalent != null && (
                <p className="calc-conv">
                  {mode === 'total' ? (
                    <>
                      {brl(parseNum(rate))} sobre {brl(parseNum(value))} = juros de <b>{brl(r.op.gain)}</b> = <b>{pct(r.op.period)}</b> em {calDays} dias = <b>{pct(r.op.am)}</b> ao mês = <b>{pct(r.op.aa)}</b> ao ano = <b>{pct(r.cdiEquivalent, 1)}</b> do CDI do período ({pct(r.di.period)}).
                    </>
                  ) : (
                    <>
                      {pct(parseNum(rate))} {UNITS.find((u) => u.id === unit).label}{mode === 'spread' ? ' de spread' : ''} = <b>{pct(r.op.period)}</b> em {calDays} dias = <b>{pct(r.cdiEquivalent, 1)}</b> do CDI do período ({pct(r.di.period)}).
                    </>
                  )}
                </p>
              )}
              <p className="status">
                {side === 'borrow' ? 'Taxa máxima do empréstimo para compensar manter a aplicação' : 'Ponto de equilíbrio'}: {mode === 'total' ? `valor total de ${brl(r.breakeven)}` : mode === 'pre' ? `${pct(r.breakeven)} ${UNITS.find((u) => u.id === unit).label}` : mode === 'cdi' ? '100% do CDI' : 'spread de 0,00%'} ({side === 'borrow' ? 'acima disso resgatar a aplicação sai mais barato' : 'a operação empata com o CDI'}). Taxa ao mês é composta: {monthBase === 'cal' ? `mês de 30 dias corridos, então ${calDays} dias = ${(calDays / 30).toFixed(2).replace('.', ',')} meses` : 'mês de 21 dias úteis (252 ÷ 12)'}; taxa ao ano segue 252 dias úteis. "% do CDI do período" = taxa da operação no período ÷ CDI da curva no período; "% do CDI" como taxa informada rende esse percentual do CDI de cada dia, composto dia a dia. O DI é a taxa de mercado para o prazo na curva da B3 de {dm(today.date)}; por isso o CDI do período é o implícito na curva, não o realizado. {net ? 'IR e IOF do CDB pela tabela regressiva sobre os dias corridos (tempo já aplicado mais o prazo); considera só o rendimento da aplicação, sem marcação a mercado, carência, penalidade ou liquidez, e não inclui IOF e tarifas do empréstimo.' : 'Valores brutos, sem impostos, custos ou IOF.'} Dias úteis do DI pelo calendário de feriados nacionais (feriados municipais não entram na contagem).
              </p>
            </>
          ) : null}
        </article>
      )}
    </>
  )
}

export default function Calculadora({ curves, hol }) {
  const [mode, setMode] = useState('di')
  return (
    <section className="macro calc" aria-labelledby="calc-h">
      <div className="history-head">
        <h2 id="calc-h">
          Calculadora <Explain id={mode === 'di' ? 'calculadora' : 'finimp'} />
        </h2>
        <div className="seg" role="group" aria-label="Tipo de cálculo">
          <button type="button" aria-pressed={mode === 'di'} onClick={() => setMode('di')}>Operação × DI</button>
          <button type="button" aria-pressed={mode === 'finimp'} onClick={() => setMode('finimp')}>FINIMP</button>
        </div>
      </div>
      {mode === 'di' ? <OperacaoDi curves={curves} hol={hol} /> : <Finimp hol={hol} />}
    </section>
  )
}
