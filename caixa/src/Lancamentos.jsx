import { useMemo, useState } from 'react'
import { Dinheiro, Icone, Vazio } from './ui.jsx'
import { dataCurta } from './format.js'
import { daPessoa } from './Hoje.jsx'

const FILTROS = [{ id: 'todos', nome: 'Todos' }, { id: 'semcat', nome: 'Sem categoria' }, { id: 'pendente', nome: 'Pendentes' }]
const normaliza = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const PAGINA = 80

export default function Lancamentos({ data, mes, pessoa, filtro, setFiltro, abrir }) {
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(PAGINA)

  const itens = useMemo(() => {
    const q = normaliza(busca)
    return data.lancamentos.filter((l) =>
      l.competencia === mes && daPessoa(l, pessoa) &&
      (filtro === 'semcat' ? l.semCategoria && ['despesa', 'receita'].includes(l.tipo) : filtro === 'pendente' ? l.status !== 'realizado' : true) &&
      (!q || normaliza(`${l.desc} ${l.subNome} ${l.categoriaNome}`).includes(q)))
  }, [data.lancamentos, mes, pessoa, filtro, busca])

  let ultimo = ''
  return (
    <div className="tela">
      <label className="busca"><Icone nome="busca" /><input value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(PAGINA) }} placeholder="Buscar descrição ou categoria" /></label>
      <div className="chips">
        {FILTROS.map((f) => <button key={f.id} className={filtro === f.id ? 'on' : ''} onClick={() => { setFiltro(f.id); setLimite(PAGINA) }}>{f.nome}</button>)}
      </div>
      {itens.length === 0 ? <Vazio>Nada por aqui.</Vazio> : (
        <ul className="lista">
          {itens.slice(0, limite).map((l) => {
            const cab = l.data !== ultimo ? (ultimo = l.data, <li key={`d-${l.data}`} className="grupo">{dataCurta(l.data)}</li>) : null
            return [cab, (
              <li key={l.id}>
                <button className={`linha toque${l.status !== 'realizado' ? ' previsto' : ''}`} onClick={() => abrir(l)}>
                  <span className="linha-meio">
                    <b>{l.desc}</b>
                    <small className={l.semCategoria ? 'ambar' : ''}>{l.semCategoria ? 'Sem categoria' : `${l.categoriaNome} · ${l.subNome}`}{l.status !== 'realizado' && ' · previsto'}</small>
                  </span>
                  <span className={['receita', 'reembolso'].includes(l.tipo) ? 'entrada' : ''}><Dinheiro valor={l.valor} /></span>
                </button>
              </li>
            )]
          })}
        </ul>
      )}
      {itens.length > limite && <button className="mais" onClick={() => setLimite(limite + PAGINA)}>Mostrar mais ({itens.length - limite})</button>}
    </div>
  )
}
