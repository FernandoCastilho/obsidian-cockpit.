import { summarizeMonth } from './model.js'
import { money } from './format.js'

export const Bar = ({ value, max, over }) => (
  <div className="bar-track" aria-hidden="true">
    <div className={over ? 'bar-fill over' : 'bar-fill'} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0}%` }} />
  </div>
)

export default function Mes({ data, month, pessoa }) {
  const s = summarizeMonth(data, { month, pessoa })
  const pend = s.liquida.pendente + s.liquida.planejado
  return (
    <>
      <section className="kpis">
        <div><span>Receitas</span><b>{money(s.receitas.realizado)}</b></div>
        <div><span>Despesas (líquidas)</span><b>{money(s.liquida.realizado)}</b>{s.reembolsos.realizado ? <small>após {money(s.reembolsos.realizado)} de reembolsos</small> : null}</div>
        <div className={s.resultado.realizado < 0 ? 'neg' : ''}><span>Resultado</span><b>{money(s.resultado.realizado)}</b></div>
        <div><span>A vencer</span><b>{money(pend)}</b><small>previsto do mês: {money(s.resultado.previsto)}</small></div>
      </section>

      <section className="panel">
        <h2>Despesas por categoria</h2>
        {s.categorias.length === 0 && <p className="mut">Sem despesas neste mês.</p>}
        <ul className="rows">
          {s.categorias.map((c) => {
            const gasto = c.realizado
            const over = c.orcado > 0 && gasto > c.orcado
            return (
              <li key={c.id}>
                <div className="line">
                  <span>{c.nome}</span>
                  <span className="num">
                    {money(gasto)}
                    {c.orcado > 0 && <em> de {money(c.orcado)}</em>}
                  </span>
                </div>
                <Bar value={gasto} max={c.orcado || gasto} over={over} />
                {(c.pendente + c.planejado > 0 || over) && (
                  <small className="mut">
                    {over ? `${money(gasto - c.orcado)} acima do orçado. ` : ''}
                    {c.pendente + c.planejado > 0 ? `${money(c.pendente + c.planejado)} a vencer.` : ''}
                  </small>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Conta corrente</h2>
        <p className="mut small">Só o que entrou e saiu das contas correntes, pela data em que o dinheiro se moveu.</p>
        <div className="kpis slim">
          <div><span>Entradas</span><b>{money(s.caixa.entradas)}</b></div>
          <div><span>Saídas</span><b>{money(s.caixa.saidas)}</b></div>
          <div className={s.caixa.liquido < 0 ? 'neg' : ''}><span>Saldo do mês</span><b>{money(s.caixa.liquido)}</b></div>
          <div><span>Agendado</span><b>{money(s.caixa.pendente)}</b></div>
        </div>
      </section>
    </>
  )
}
