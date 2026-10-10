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
  const [mode, setMode] = useState('cdi')
  const [rate, setRate] = useState('105')
  const [side, setSide] = useState('invest')
  const [unit, setUnit] = useState('aa')
  const end = due && base ? (due < base ? base : due > maxIso ? maxIso : due) : base ? iso(365) : ''
  const d = base ? busDaysIn(base, end, ['BR'], hol.ctx) : 0 // dias úteis do DI: calendário nacional (B3/ANBIMA)
  const r = useMemo(() => (pts ? compare({ pts, d, value: parseNum(value), mode, rate: parseNum(rate), unit, side }) : null), [pts, d, value, mode, rate, unit, side])
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
              <input type="date" min={base} max={maxIso} value={end} onChange={(e) => e.target.value && setDue(e.target.value)} />
              <DateCheck date={end} hol={hol} onUse={setDue} />
            </label>
            <div className="seg" role="group" aria-label="Atalhos de prazo">
              {TERMS.map((t) => (
                <button key={t.label} type="button" onClick={() => setDue(iso(Math.min(t.days, Math.floor((maxD / 252) * 365))))}>
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
            {mode !== 'cdi' && (
              <div className="seg" role="group" aria-label="Unidade da taxa">
                {UNITS.filter((u) => mode === 'pre' || u.id !== 'periodo').map((u) => (
                  <button key={u.id} type="button" aria-pressed={unit === u.id} onClick={() => (setUnit(u.id), mode === 'pre' && setRate(PH[u.id]))}>
                    {u.label}
                  </button>
                ))}
              </div>
            )}
            <label>
              Taxa da operação ({mode === 'cdi' ? '% do CDI' : `% ${UNITS.find((u) => u.id === unit).label}`})
              <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={m.ph} />
            </label>
            <div className="seg" role="group" aria-label="Sentido da operação">
              <button type="button" aria-pressed={side === 'invest'} onClick={() => setSide('invest')}>Eu recebo</button>
              <button type="button" aria-pressed={side === 'borrow'} onClick={() => setSide('borrow')}>Eu pago</button>
            </div>
          </div>
          {r?.error ? (
            <p className="status stale">{r.error}</p>
          ) : r ? (
            <>
              <p className={`calc-verdict ${r.good ? 'up' : 'down'}`}>
                {side === 'invest'
                  ? `A operação rende ${brl(Math.abs(r.diff))} ${r.diff >= 0 ? 'a mais' : 'a menos'} que aplicar no DI`
                  : `A operação custa ${brl(Math.abs(r.diff))} ${r.diff >= 0 ? 'a mais' : 'a menos'} que o DI`}
                <small> · {Math.abs(r.diffBps).toFixed(0)} bps a.a. {r.diffBps >= 0 ? 'acima' : 'abaixo'} · prazo {r.d} dias úteis até {dm(end)}</small>
              </p>
              <div className="scroll">
                <table className="focus-table">
                  <thead>
                    <tr><th></th><th>Operação</th><th>DI (curva)</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Taxa no período ({r.d} d.u.)</td><td>{pct(r.op.period)}</td><td>{pct(r.di.period)}</td></tr>
                    <tr><td>Taxa efetiva a.a.</td><td>{pct(r.op.aa)}</td><td>{pct(r.di.aa)}</td></tr>
                    <tr><td>Taxa equivalente ao mês</td><td>{pct(r.op.am)}</td><td>{pct(r.di.am)}</td></tr>
                    <tr><td>{side === 'invest' ? 'Rendimento' : 'Custo'} no prazo</td><td>{brl(r.op.gain)}</td><td>{brl(r.di.gain)}</td></tr>
                    <tr><td>Valor no vencimento</td><td>{brl(r.op.fv)}</td><td>{brl(r.di.fv)}</td></tr>
                    <tr><td>% do CDI do período</td><td>{r.cdiEquivalent != null ? pct(r.cdiEquivalent, 1) : '—'}</td><td>100,0%</td></tr>
                  </tbody>
                </table>
              </div>
              {mode !== 'cdi' && r.cdiEquivalent != null && (
                <p className="calc-conv">
                  {pct(parseNum(rate))} {UNITS.find((u) => u.id === unit).label}{mode === 'spread' ? ' de spread' : ''} = <b>{pct(r.op.period)}</b> no período ({r.d} d.u.) = <b>{pct(r.cdiEquivalent, 1)}</b> do CDI do período ({pct(r.di.period)}).
                </p>
              )}
              <p className="status">
                Ponto de equilíbrio: {mode === 'pre' ? `${pct(r.breakeven)} ${UNITS.find((u) => u.id === unit).label}` : mode === 'cdi' ? '100% do CDI' : 'spread de 0,00%'} (a operação empata com o DI). Taxa ao mês é composta e 1 mês = 21 dias úteis (252 ÷ 12). "% do CDI do período" = taxa da operação no período ÷ CDI da curva no período; "% do CDI" como taxa informada rende esse percentual do CDI de cada dia, composto dia a dia. O DI é a taxa de mercado para o prazo na curva da B3 de {dm(today.date)}; por isso o CDI do período é o implícito na curva, não o realizado. Valores brutos, sem impostos, custos ou IOF; dias úteis do DI pelo calendário de feriados nacionais (feriados municipais não entram na contagem).
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
