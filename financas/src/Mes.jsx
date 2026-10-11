import { summarizeMonth } from './model.js'
import { money, shiftMonth } from './format.js'
import Money from './Money.jsx'

export const Bar = ({ value, max, over, warn }) => (
  <div className="bar-track" aria-hidden="true">
    <div className={over ? 'bar-fill over' : warn ? 'bar-fill warn' : 'bar-fill'} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0}%` }} />
  </div>
)

export default function Mes({ data, month, pessoa }) {
  const s = summarizeMonth(data, { month, pessoa })
  const prev = summarizeMonth(data, { month: shiftMonth(month, -1), pessoa })
  const delta = s.resultado.realizado - prev.resultado.realizado
  const pend = s.liquida.pendente + s.liquida.planejado
  const semCat = data.lancamentos.filter((l) => l.data.startsWith(month) && (pessoa === 'TODOS' || l.pessoa === pessoa) && !l.sub && (l.tipo === 'receita' || l.tipo === 'despesa'))
  const semCatTotal = semCat.reduce((a, l) => a + Math.abs(l.valor), 0)
  const hasPrev = prev.receitas.realizado !== 0 || prev.liquida.realizado !== 0

  return (
    <>
      <section className="hero" aria-label="Resumo do mês">
        <div className="hero-main">
          <span className="label">Resultado do mês</span>
          <b className={`big ${s.resultado.realizado < 0 ? 'neg-text' : ''}`}><Money v={s.resultado.realizado} /></b>
          {hasPrev && (
            <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
              {delta >= 0 ? '▲' : '▼'} {money(Math.abs(delta))} <em>sobre o mês anterior</em>
            </span>
          )}
        </div>
        <dl className="hero-side">
          <div><dt>Receitas</dt><dd><Money v={s.receitas.realizado} /></dd></div>
          <div><dt>Despesas líquidas</dt><dd><Money v={s.liquida.realizado} /></dd>{s.reembolsos.realizado ? <small>após {money(s.reembolsos.realizado)} de reembolsos</small> : null}</div>
          <div><dt>A vencer</dt><dd><Money v={pend} /></dd><small>previsto: {money(s.resultado.previsto)}</small></div>
        </dl>
      </section>

      {semCat.length > 0 && (
        <aside className="notice" role="note">
          <b>{semCat.length} {semCat.length === 1 ? 'lançamento sem categoria' : 'lançamentos sem categoria'}</b> neste mês, somando {money(semCatTotal)}. Classifique na aba Lancamentos da planilha e toque em Atualizar dados.
        </aside>
      )}

      <section className="panel">
        <h2>Despesas por categoria</h2>
        {s.categorias.length === 0 && <p className="mut">Sem despesas neste mês.</p>}
        <ul className="rows">
          {s.categorias.map((c) => {
            const gasto = c.realizado
            const sem = c.id === '_sem'
            const over = c.orcado > 0 && gasto > c.orcado
            return (
              <li key={c.id}>
                <div className="line">
                  <span className={sem ? 'warn-text' : ''}>{sem ? 'Sem categoria' : c.nome}</span>
                  <span className="num">
                    <Money v={gasto} cents={false} />
                    {c.orcado > 0 && <em> de <Money v={c.orcado} cents={false} /></em>}
                  </span>
                </div>
                <Bar value={gasto} max={c.orcado || gasto} over={over} warn={sem} />
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
        <dl className="stats">
          <div><dt>Entradas</dt><dd><Money v={s.caixa.entradas} cents={false} /></dd></div>
          <div><dt>Saídas</dt><dd><Money v={s.caixa.saidas} cents={false} /></dd></div>
          <div><dt>Saldo do mês</dt><dd className={s.caixa.liquido < 0 ? 'neg-text' : ''}><Money v={s.caixa.liquido} cents={false} /></dd></div>
          <div><dt>Agendado</dt><dd><Money v={s.caixa.pendente} cents={false} /></dd></div>
        </dl>
      </section>
    </>
  )
}
