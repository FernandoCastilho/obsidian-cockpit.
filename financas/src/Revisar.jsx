import { useState } from 'react'
import { revisao } from './analise.js'
import { money } from './format.js'
import Money from './Money.jsx'
import { Tile } from './Icon.jsx'

export default function Revisar({ data, pessoa }) {
  const r = revisao(data, { pessoa })
  const [todos, setTodos] = useState(false)
  const grupos = todos ? r.grupos : r.grupos.slice(0, 20)
  if (r.grupos.length === 0) {
    return (
      <section className="empty">
        <h2>Tudo classificado</h2>
        <p>Nenhum lançamento sem categoria.</p>
      </section>
    )
  }
  return (
    <section className="panel">
      <h2>Fila de revisão</h2>
      <p className="mut small">
        {r.linhas} lançamentos sem categoria, {money(r.total)} no total, agrupados por descrição. Para classificar um grupo de uma vez,
        crie uma regra na aba Regras da planilha com o texto sugerido; o processamento aplica a regra a todos.
      </p>
      <ul className="rows tight">
        {grupos.map((g) => (
          <li key={g.desc} className="lanc">
            <span className="lanc-main">
              <Tile name="alert" size={34} warn />
              <span>
                <b>{g.desc || 'Sem descrição'}</b>
                <br />
                <small className="mut">{g.n} {g.n === 1 ? 'lançamento' : 'lançamentos'} · último em {g.ultima.split('-').reverse().join('/')} · regra: <code>{g.sugestao}</code></small>
              </span>
            </span>
            <span className="num"><Money v={g.total} cents={false} /></span>
          </li>
        ))}
      </ul>
      {r.grupos.length > 20 && <button className="link" onClick={() => setTodos(!todos)}>{todos ? 'Mostrar só os 20 maiores' : `Mostrar todos os ${r.grupos.length} grupos`}</button>}
    </section>
  )
}
