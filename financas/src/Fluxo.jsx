import { fluxo } from './analise.js'
import { monthName } from './format.js'
import Money from './Money.jsx'

export default function Fluxo({ data, pessoa }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const f = fluxo(data, { hoje, meses: 6, pessoa })
  if (f.semSaldo) {
    return (
      <section className="panel">
        <h2>Fluxo projetado</h2>
        <p className="mut">Para projetar o caixa, informe o saldo inicial da conta corrente (colunas saldo_inicial e data_saldo_inicial da aba Contas).</p>
      </section>
    )
  }
  const max = Math.max(1, ...f.meses.map((m) => Math.abs(m.final)), Math.abs(f.inicial))
  return (
    <section className="panel">
      <h2>Fluxo projetado · 6 meses</h2>
      <dl className="stats three">
        <div><dt>Saldo hoje</dt><dd><Money v={f.inicial} cents={false} /></dd></div>
        <div><dt>Em 6 meses</dt><dd className={f.meses.at(-1).final < 0 ? 'neg-text' : ''}><Money v={f.meses.at(-1).final} cents={false} /></dd></div>
        <div><dt>Ponto mais baixo</dt><dd className={f.minimo < 0 ? 'neg-text' : ''}><Money v={f.minimo} cents={false} /></dd></div>
      </dl>
      <ul className="rows">
        {f.meses.map((m) => (
          <li key={m.mes}>
            <div className="line">
              <span>{monthName(m.mes)}</span>
              <span className={`num ${m.final < 0 ? 'neg-text' : ''}`}><Money v={m.final} cents={false} /></span>
            </div>
            <div className="bar-track" aria-hidden="true"><div className={m.final < 0 ? 'bar-fill over' : 'bar-fill'} style={{ width: `${Math.min(100, (Math.abs(m.final) / max) * 100)}%` }} /></div>
            <small className="mut">entram <Money v={m.entradas} cents={false} /> · saem <Money v={m.saidas} cents={false} />{m.variavel > 0 ? <> (<Money v={m.variavel} cents={false} /> estimados)</> : null}</small>
          </li>
        ))}
      </ul>
      <p className="mut small">Projeção com recorrências, agendados e pendentes, mais uma estimativa de gastos variáveis (média dos 3 meses anteriores, fora das recorrências). Faturas de cartão entram quando forem importadas; até lá o saldo projetado tende a ficar otimista.</p>
    </section>
  )
}
