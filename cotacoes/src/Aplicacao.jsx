import { useMemo, useState } from 'react'
import { investment, parseNum } from './calc.js'
import { useTerm } from './useTerm.js'
import Pracas from './Pracas.jsx'
import DateCheck from './DateCheck.jsx'
import Explain from './Explain.jsx'
import HBars from './HBars.jsx'
import ResultBar from './ResultBar.jsx'

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v, d = 2) => (v == null ? '—' : `${v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`)
const dm = (iso) => iso.split('-').reverse().join('/')
const MODES = [
  { id: 'cdi', label: '% do CDI', ph: '100' },
  { id: 'pre', label: 'Pré-fixada', ph: '14,50' },
  { id: 'spread', label: 'CDI + spread', ph: '1,00' },
  { id: 'total', label: 'Valor total recebido', ph: '110.000,00' },
]
const UNITS = [
  { id: 'aa', label: 'ao ano' },
  { id: 'am', label: 'ao mês' },
]
const TERMS = [
  { label: '3 meses', days: 91 },
  { label: '6 meses', days: 182 },
  { label: '1 ano', days: 365 },
  { label: '2 anos', days: 730 },
]

export default function Aplicacao({ curves, hol }) {
  const t = useTerm(curves, hol, 365)
  const [value, setValue] = useState('100.000,00')
  const [mode, setMode] = useState('cdi')
  const [unit, setUnit] = useState('aa')
  const [monthBase, setMonthBase] = useState('du')
  const [rate, setRate] = useState('100')
  const [kind, setKind] = useState('cdb')
  const [ageTxt, setAgeTxt] = useState('0')
  const r = useMemo(
    () => (t.pts ? investment({ pts: t.pts, d: t.d, calDays: t.calDays, value: parseNum(value), mode, rate: parseNum(rate), unit, monthBase, kind, ageDays: parseNum(ageTxt) || 0 }) : null),
    [t.pts, t.d, t.calDays, value, mode, rate, unit, monthBase, kind, ageTxt],
  )

  const bar = r && !r.error ? { main: `Líquido ${brl(r.net.fv)} em ${t.calDays} dias`, sub: `rendimento ${brl(r.net.gain)} · ${pct(r.pctCdiNet, 1)} do CDI` } : null
  if (curves.status === 'loading') return <div className="placeholder">Carregando curva DI…</div>
  if (!t.pts) return <p className="status">Calculadora indisponível: depende da curva DI x pré da B3, que não veio na última atualização.</p>
  return (
    <article className="chart calc-split">
      <div className="calc-in">
      <Pracas pracas={hol.pracas} onChange={hol.setPracas} label="Praças (avisos de feriado no vencimento)" />
      <div className="calc-form">
        <label>
          Valor aplicado (R$)
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label>
          Vencimento
          <input type="date" min={t.base} max={t.maxIso} value={t.end} onChange={(e) => e.target.value && t.pickDue(e.target.value)} />
          <DateCheck date={t.end} hol={hol} onUse={t.pickDue} />
        </label>
        <label>
          Prazo (dias corridos)
          <input inputMode="numeric" value={t.daysTxt} onChange={(e) => t.typeDays(e.target.value)} />
        </label>
        <div className="seg" role="group" aria-label="Atalhos de prazo">
          {TERMS.map((x) => (
            <button key={x.label} type="button" onClick={() => t.pickDue(t.iso(Math.min(x.days, t.maxCal)))}>{x.label}</button>
          ))}
        </div>
      </div>
      <div className="calc-form">
        <div>
          <span className="lbl">Tipo de ativo <Explain id="irRegressivo" /></span>
          <div className="seg" role="group" aria-label="Tipo de ativo">
            <button type="button" aria-pressed={kind === 'cdb'} onClick={() => setKind('cdb')}>CDB / RDB (IR regressivo)</button>
            <button type="button" aria-pressed={kind === 'isento'} onClick={() => setKind('isento')}>Isento de IR (LCI/LCA, pessoa física)</button>
          </div>
        </div>
        {kind === 'cdb' && (
          <label>
            Dias já aplicados (opcional)
            <input inputMode="numeric" value={ageTxt} onChange={(e) => setAgeTxt(e.target.value)} />
          </label>
        )}
      </div>
      <div className="calc-form">
        <div className="seg" role="group" aria-label="Como a rentabilidade é informada">
          {MODES.map((x) => (
            <button key={x.id} type="button" aria-pressed={mode === x.id} onClick={() => (setMode(x.id), setRate(x.ph))}>{x.label}</button>
          ))}
        </div>
        {(mode === 'pre' || mode === 'spread') && (
          <div className="seg" role="group" aria-label="Unidade da taxa">
            {UNITS.map((u) => (
              <button key={u.id} type="button" aria-pressed={unit === u.id} onClick={() => setUnit(u.id)}>{u.label}</button>
            ))}
          </div>
        )}
        {(mode === 'pre' || mode === 'spread') && unit === 'am' && (
          <div className="seg" role="group" aria-label="Base do mês">
            <button type="button" aria-pressed={monthBase === 'du'} onClick={() => setMonthBase('du')}>mês = 21 dias úteis</button>
            <button type="button" aria-pressed={monthBase === 'cal'} onClick={() => setMonthBase('cal')}>mês = 30 dias corridos</button>
          </div>
        )}
        <label>
          {mode === 'cdi' ? 'Rentabilidade (% do CDI)' : mode === 'total' ? 'Valor total recebido no vencimento (R$)' : `Taxa (% ${UNITS.find((u) => u.id === unit).label}${mode === 'spread' ? ', sobre o CDI' : ''})`}
          <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </label>
      </div>
</div>
<div className="calc-out" id="calc-out">
      {r?.error ? (
        <p className="status stale">{r.error}</p>
      ) : r ? (
        <>
          <p className="calc-verdict">
            Você recebe {brl(r.net.fv)} líquidos em {t.calDays} dias
            <small>
              {' '}· rendimento líquido de {brl(r.net.gain)} ({pct(r.net.period)} no período = {pct(r.pctCdiNet, 1)} do CDI do período) · bruto {brl(r.gross.gain)}
              {kind === 'cdb' ? ` · IR de ${pct(r.tax.irPct, 1)}${r.tax.iofPct > 0 ? ` e IOF de ${r.tax.iofPct}%` : ''}: −${brl(r.tax.total)}` : ' · sem IR'}
              {' '}· até {dm(t.end)} ({r.d} dias úteis)
            </small>
          </p>
          <HBars
            title="Rendimento em reais"
            rows={[
              { label: 'Bruto', value: r.gross.gain, text: brl(r.gross.gain) },
              { label: 'Líquido', value: r.net.gain, text: brl(r.net.gain), strong: true },
              { label: 'CDI (curva, 100%)', value: r.cdi.gain, text: brl(r.cdi.gain) },
            ]}
          />
          <div className="scroll">
            <table className="focus-table">
              <thead>
                <tr><th></th><th>Bruto</th><th>Líquido</th><th>CDI (curva, 100%)</th></tr>
              </thead>
              <tbody>
                <tr><td>Taxa no período ({t.calDays} dias corridos, {r.d} d.u.)</td><td>{pct(r.gross.period)}</td><td>{pct(r.net.period)}</td><td>{pct(r.cdi.period)}</td></tr>
                <tr><td>Taxa efetiva a.a.</td><td>{pct(r.gross.aa)}</td><td>{pct(r.net.aa)}</td><td>{pct(r.cdi.aa)}</td></tr>
                <tr><td>Taxa equivalente ao mês</td><td>{pct(r.gross.am)}</td><td>{pct(r.net.am)}</td><td>{pct(r.cdi.am)}</td></tr>
                <tr><td>Rendimento</td><td>{brl(r.gross.gain)}</td><td>{brl(r.net.gain)}</td><td>{brl(r.cdi.gain)}</td></tr>
                {kind === 'cdb' && <tr><td>IR{r.tax.iofPct > 0 ? ' e IOF' : ''} sobre o rendimento ({pct(r.tax.irPct, 1)})</td><td>—</td><td>−{brl(r.tax.total)}</td><td>—</td></tr>}
                <tr><td>Valor no vencimento</td><td>{brl(r.gross.fv)}</td><td>{brl(r.net.fv)}</td><td>{brl(r.cdi.fv)}</td></tr>
                <tr><td>% do CDI do período</td><td>{pct(r.pctCdiGross, 1)}</td><td>{pct(r.pctCdiNet, 1)}</td><td>100,0%</td></tr>
              </tbody>
            </table>
          </div>
          <p className="calc-conv">
            {kind === 'cdb'
              ? <>Este CDB, líquido de IR, equivale a um ativo isento que pague <b>{pct(r.pctCdiNet, 1)}</b> do CDI do período.</>
              : <>Para render o mesmo líquido, um CDB com IR de {pct(r.equivalent.irPct, 1)} precisaria pagar <b>{pct(r.equivalent.cdbPctCdi, 1)}</b> do CDI do período ({pct(r.equivalent.cdbPeriod)} no período).</>}
          </p>
          <details className="premissas">
            <summary>Premissas e método</summary>
          <p className="status">
            O CDI do período é o implícito na curva DI da B3 de {dm(t.today.date)}, e não o realizado. IR pela tabela regressiva sobre os dias corridos (tempo já aplicado mais o prazo); IOF só até o 29º dia. A isenção vale para pessoa física em LCI/LCA; confirme o regime do seu caso. Não considera marcação a mercado, carência, liquidez nem tarifas. {parseNum(value) > 250000 ? 'Valores acima do limite do FGC (R$ 250 mil por instituição) têm risco de crédito do emissor.' : ''}
          </p>
          </details>
        </>
      ) : null}
</div>
      <ResultBar targetId="calc-out" main={bar?.main} sub={bar?.sub} />
    </article>
  )
}
