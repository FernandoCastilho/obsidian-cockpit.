import { summarizeMonth } from './model.js'
import { money } from './format.js'
import { Bar } from './Mes.jsx'
import Money from './Money.jsx'
import { Tile, Icon } from './Icon.jsx'

export default function Orcamento({ data, month, pessoa }) {
  const s = summarizeMonth(data, { month, pessoa })
  const cats = s.categorias.filter((c) => c.orcado > 0 || c.realizado > 0 || c.pendente > 0)
  const totalGasto = cats.reduce((a, c) => a + c.realizado, 0)
  return (
    <section className="panel">
      <h2>Planejado × realizado</h2>
      <dl className="stats three">
        <div><dt>Orçado</dt><dd><Money v={s.orcado} cents={false} /></dd></div>
        <div><dt>Realizado</dt><dd><Money v={totalGasto} cents={false} /></dd></div>
        <div><dt>Diferença</dt><dd className={s.orcado - totalGasto < 0 ? 'neg-text' : ''}><Money v={s.orcado - totalGasto} cents={false} /></dd></div>
      </dl>
      {s.orcado === 0 && <p className="mut small">Nenhum valor planejado para este mês na aba Orcamento.</p>}
      <ul className="rows">
        {cats.map((c) => {
          const resto = c.orcado - c.realizado
          return (
            <li key={c.id}>
              <details>
                <summary>
                  <div className="line">
                    <span className={`cat ${c.id === '_sem' ? 'warn-text' : ''}`}><Tile name={c.icone} size={30} warn={c.id === '_sem'} />{c.id === '_sem' ? 'Sem categoria' : c.nome}</span>
                    <span className={`num ${resto < 0 && c.id !== '_sem' ? 'neg-text' : ''}`}>{c.orcado > 0 ? `${resto < 0 ? '−' : ''}${money(Math.abs(resto))} ${resto < 0 ? 'acima' : 'restam'}` : 'sem orçamento'}</span>
                  </div>
                  <Bar value={c.realizado} max={c.orcado || c.realizado} over={resto < 0 && c.id !== '_sem'} warn={c.id === '_sem'} />
                  <small className="mut">
                    {money(c.realizado)} realizado · {money(c.orcado)} orçado{c.pendente + c.planejado > 0 ? ` · ${money(c.pendente + c.planejado)} a vencer` : ''}
                  </small>
                </summary>
                <ul className="rows tight sub">
                  {c.subs.map((x) => (
                    <li key={x.id} className="line">
                      <span className="cat sm"><Icon name={x.icone} size={16} />{x.nome}</span>
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
