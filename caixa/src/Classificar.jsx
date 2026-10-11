import { useMemo, useState } from 'react'
import { Dinheiro, Icone } from './ui.jsx'
import { dataCurta } from './format.js'

const normaliza = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Folha que sobe de baixo: dados do lançamento e escolha da subcategoria.
export default function Classificar({ lancamento: l, data, onEscolher, onFechar, ocupado }) {
  const [busca, setBusca] = useState('')
  const grupos = useMemo(() => {
    const q = normaliza(busca)
    return data.categorias.filter((c) => !c.id.startsWith('SEM')).map((c) => ({
      ...c, subs: data.subcategorias.filter((s) => s.categoria === c.id && (!q || normaliza(`${s.nome} ${c.nome}`).includes(q))),
    })).filter((c) => c.subs.length)
  }, [data, busca])

  return (
    <div className="fundo" onClick={onFechar}>
      <div className="folha" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className="alca" />
        <header className="folha-topo">
          <div>
            <b>{l.desc}</b>
            <small>{dataCurta(l.data)} · {l.contaNome}{l.status !== 'realizado' && ' · previsto'}</small>
          </div>
          <Dinheiro valor={l.valor} />
          <button className="fechar" onClick={onFechar} aria-label="Fechar"><Icone nome="fechar" /></button>
        </header>
        <p className="rotulo">{l.semCategoria ? 'Escolha a categoria' : `Hoje: ${l.categoriaNome} · ${l.subNome}`}</p>
        <label className="busca"><Icone nome="busca" /><input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar categoria" /></label>
        <div className="folha-lista">
          {grupos.map((c) => (
            <div key={c.id}>
              <p className="grupo">{c.nome}</p>
              {c.subs.map((s) => (
                <button key={s.id} disabled={ocupado} className={`opcao${s.id === l.sub ? ' on' : ''}`} onClick={() => onEscolher(s.id)}>
                  {s.nome}{s.id === l.sub && <Icone nome="ok" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
