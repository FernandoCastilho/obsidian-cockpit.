import { useMemo, useState } from 'react'
import { dayLabel } from './format.js'
import Money from './Money.jsx'
import { Tile, BankBadge } from './Icon.jsx'

const TIPO_LABEL = { transferencia: 'Transferência', pagto_fatura: 'Fatura', investimento: 'Investimento', reembolso: 'Reembolso' }

export default function Lancamentos({ data, month, pessoa }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('todos')
  const lista = useMemo(() => {
    const k = q.trim().toLowerCase()
    return data.lancamentos.filter(
      (l) =>
        l.data.startsWith(month) &&
        (pessoa === 'TODOS' || l.pessoa === pessoa) &&
        (status === 'todos' || l.status === status) &&
        (!k || `${l.desc} ${l.subNome} ${l.categoriaNome} ${l.contaNome}`.toLowerCase().includes(k)),
    )
  }, [data, month, pessoa, q, status])

  const grupos = useMemo(() => {
    const m = new Map()
    for (const l of lista) m.set(l.data, [...(m.get(l.data) ?? []), l])
    return [...m.entries()]
  }, [lista])

  return (
    <section className="panel">
      <div className="filters">
        <input type="search" placeholder="Buscar lançamento" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="todos">Todos os status</option>
          <option value="realizado">Realizado</option>
          <option value="pendente">Pendente</option>
          <option value="planejado">Planejado</option>
        </select>
      </div>
      {grupos.length === 0 && <p className="mut">Nenhum lançamento.</p>}
      {grupos.slice(0, 60).map(([dia, ls]) => (
        <div key={dia} className="day">
          <h3>{dayLabel(dia)}</h3>
          <ul className="rows tight">
            {ls.map((l) => (
              <li key={l.id} className="lanc">
                <div className="lanc-main">
                  <Tile name={l.icone} size={36} warn={!l.sub && (l.tipo === 'receita' || l.tipo === 'despesa')} />
                  <div>
                    <div>{l.desc || '(sem descrição)'}</div>
                    <small className="mut">
                      {TIPO_LABEL[l.tipo] ? `${TIPO_LABEL[l.tipo]} · ` : ''}
                      {l.subNome || 'Sem categoria'} · <BankBadge banco={l.banco} size={17} /> {l.contaNome}
                      {l.parcela ? ` · ${l.parcela}` : ''}
                      {l.status !== 'realizado' ? ` · ${l.status}` : ''}
                    </small>
                  </div>
                </div>
                <span className={`num ${l.valor < 0 ? '' : 'pos'} ${l.tipo === 'transferencia' || l.tipo === 'pagto_fatura' || l.tipo === 'investimento' ? 'mut' : ''}`}><Money v={l.valor} /></span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {grupos.length > 60 && <p className="mut small">Mostrando os 60 dias mais recentes do mês. Use a busca para filtrar.</p>}
    </section>
  )
}
