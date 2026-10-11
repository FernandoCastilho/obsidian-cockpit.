import { summarizeMonth } from './model.js'
import { money } from './format.js'
import { Bar } from './Mes.jsx'

export default function Orcamento({ data, month, pessoa }) {
  const s = summarizeMonth(data, { month, pessoa })
  const cats = s.categorias.filter((c) => c.orcado > 0 || c.realizado > 0 || c.pendente > 0)
  const totalGasto = cats.reduce((a, c) => a + c.realizado, 0)
  return (
    <section className="panel">
      <h2>Planejado × realizado</h2>
      <div className="kpis slim">
        <div><span>Orçado</span><b>{money(s.orcado)}</b></div>
        <div><span>Realizado</span><b>{money(totalGasto)}</b></div>
        <div className={s.orcado - totalGasto < 0 ? 'neg' : ''}><span>Diferença</span><b>{money(s.orcado - totalGasto)}</b></div>
      </div>
      {s.orcado === 0 && <p className="mut small">Nenhum valor planejado para este mês na aba Orcamento.</p>}
      <ul className="rows">
        {cats.map((c) => {
          const resto = c.orcado - c.realizado
          return (
            <li key={c.id}>
              <details>
                <summary>
                  <div className="line">
                    <span>{c.nome}</span>
                    <span className={`num ${resto < 0 ? 'neg-text' : ''}`}>{c.orcado > 0 ? `${resto < 0 ? '−' : ''}${money(Math.abs(resto))} ${resto < 0 ? 'acima' : 'restam'}` : 'sem orçamento'}</span>
                  </div>
                  <Bar value={c.realizado} max={c.orcado || c.realizado} over={resto < 0} />
                  <small className="mut">
                    {money(c.realizado)} realizado · {money(c.orcado)} orçado{c.pendente + c.planejado > 0 ? ` · ${money(c.pendente + c.planejado)} a vencer` : ''}
                  </small>
                </summary>
                <ul className="rows tight sub">
                  {c.subs.map((x) => (
                    <li key={x.id} className="line">
                      <span>{x.nome}</span>
                      <span className="num">{money(x.realizado)}{x.orcado > 0 && <em> de {money(x.orcado)}</em>}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
