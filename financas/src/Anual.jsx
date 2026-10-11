import { summarizeYear } from './model.js'
import { wholeNumber as plain, monthShort } from './format.js'

const sum = (a) => a.reduce((x, y) => x + y, 0)

export default function Anual({ data, year, pessoa }) {
  const y = summarizeYear(data, { year, pessoa })
  const totalCat = (l) => sum(l.celulas.map((c) => c.r))
  return (
    <section className="panel">
      <h2>{year}: realizado por mês</h2>
      <p className="mut small">Valores em reais, sem centavos. Despesas por categoria; o valor menor abaixo é o que ainda vai vencer.</p>
      <div className="scroll">
        <table className="grid">
          <thead>
            <tr>
              <th>Categoria</th>
              {y.meses.map((m) => <th key={m}>{monthShort(m)}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {y.linhas.map((l) => (
              <tr key={l.id}>
                <th className={l.id === '_sem' ? 'warn-text' : ''}>{l.id === '_sem' ? 'Sem categoria' : l.nome}</th>
                {l.celulas.map((c, i) => (
                  <td key={i}>
                    {c.r ? plain(c.r) : '·'}
                    {c.p ? <small>+{plain(c.p)}</small> : null}
                  </td>
                ))}
                <td><b>{plain(totalCat(l))}</b></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th>Receitas</th>{y.receitas.map((v, i) => <td key={i}>{v ? plain(v) : '·'}</td>)}<td><b>{plain(sum(y.receitas))}</b></td></tr>
            <tr><th>Reembolsos</th>{y.reembolsos.map((v, i) => <td key={i}>{v ? plain(v) : '·'}</td>)}<td><b>{plain(sum(y.reembolsos))}</b></td></tr>
            <tr className="result"><th>Resultado</th>{y.resultado.map((v, i) => <td key={i} className={v < 0 ? 'neg-text' : ''}>{v ? plain(v) : '·'}</td>)}<td><b>{plain(sum(y.resultado))}</b></td></tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
