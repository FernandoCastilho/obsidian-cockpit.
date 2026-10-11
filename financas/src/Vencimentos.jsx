import { vencimentos } from './analise.js'
import { dayLabel, money } from './format.js'
import Money from './Money.jsx'
import { Tile } from './Icon.jsx'

export default function Vencimentos({ data, pessoa }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const itens = vencimentos(data, { hoje, dias: 30, pessoa })
  const saidas = itens.filter((i) => i.valor < 0).reduce((a, i) => a - i.valor, 0)
  const entradas = itens.filter((i) => i.valor > 0).reduce((a, i) => a + i.valor, 0)
  return (
    <section className="panel">
      <h2>Próximos 30 dias</h2>
      <dl className="stats three">
        <div><dt>A pagar</dt><dd><Money v={saidas} cents={false} /></dd></div>
        <div><dt>A receber</dt><dd><Money v={entradas} cents={false} /></dd></div>
        <div><dt>Saldo previsto</dt><dd className={entradas - saidas < 0 ? 'neg-text' : ''}><Money v={entradas - saidas} cents={false} /></dd></div>
      </dl>
      {itens.length === 0 && <p className="mut">Nada a vencer. Cadastre contas fixas na aba Recorrencias da planilha.</p>}
      <ul className="rows tight">
        {itens.map((i, k) => (
          <li key={k} className="lanc">
            <span className="lanc-main">
              <Tile name={i.icone} size={34} warn={i.atrasado} />
              <span>
                <b>{i.desc}</b>
                <br />
                <small className={i.atrasado ? 'warn-text' : 'mut'}>{i.atrasado ? 'Atrasado · ' : ''}{dayLabel(i.data)}{i.origem === 'recorrencia' ? ' · recorrente' : ''}</small>
              </span>
            </span>
            <span className={`num ${i.valor > 0 ? 'pos' : ''}`}>{i.valor > 0 ? '+' : ''}{money(i.valor)}</span>
          </li>
        ))}
      </ul>
      <p className="mut small">Recorrências já pagas neste mês não aparecem. Faturas de cartão entram quando forem importadas.</p>
    </section>
  )
}
