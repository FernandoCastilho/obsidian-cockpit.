import { useState } from 'react'
import { INSUMOS } from './insumos.js'
import { BANKING_TOPICS } from './bankingSectors.js'
import SetoresLegado from './SetoresLegado.jsx'
import { CATALOGO_SETORIAL, TOPICOS_ESTUDO, normalizeSector } from './centralSetorial.js'
import './CentralSetorial.css'

export default function Setores({ view = '', onView = () => {}, quotes }) {
  const [query, setQuery] = useState('')
  const [localSelection, setSelected] = useState(null)
  const parts = view.split('/')
  const routeGroup = parts[0] === 'topico' ? CATALOGO_SETORIAL.find(group => group.id === parts[1]) : null
  const routeTopic = routeGroup?.topics[Number(parts[2])]
  const selected = routeTopic ? {group: routeGroup.id, groupLabel: routeGroup.label, topic: routeTopic} : localSelection
  // Preserve deep links and existing information without presenting it as a completed study.
  if (view && view !== 'central' && !routeGroup && view !== 'b3' && !view.startsWith('b3/')) return <><button className="central-voltar" onClick={() => onView('central')}>← Central de setores</button><SetoresLegado view={view} onView={onView} quotes={quotes}/></>
  const term = normalizeSector(query.trim())
  const groups = CATALOGO_SETORIAL.map(group => ({...group, matches: group.topics.filter(topic => !term || normalizeSector(`${group.label} ${topic}`).includes(term))})).filter(group => group.matches.length)
  return <div className="central-setorial">
    <header className="central-intro"><p className="central-kicker">CONHECIMENTO SETORIAL</p><h2>Central de setores</h2><p>Explore setores e subsetores para entender seus negócios, mercados e necessidades financeiras.</p><p className="central-note">Catálogo de tópicos. A presença de um subsetor não indica que exista um estudo concluído.</p></header>
    <label className="central-search">Buscar setor ou subsetor<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: compensados, autopeças ou logística" /></label>
    {(view === 'b3' || view.startsWith('b3/')) && <p role="status" className="central-note">A antiga classificação B3 foi substituída pelo catálogo unificado. Escolha o setor correspondente abaixo; não há conversão automática entre classificações.</p>}
    <div className="central-layout"><section aria-label="Catálogo de setores"><h3>Setores e subsetores</h3>{groups.length ? groups.map(group => <details key={group.id} open={term || selected?.group === group.id ? true : undefined}><summary>{group.label} <span>{group.matches.length} tópicos</span></summary><ul>{group.matches.map(topic => <li key={topic}><button type="button" aria-pressed={selected?.topic === topic && selected?.group === group.id} onClick={() => { setSelected({group: group.id, groupLabel:group.label, topic}); onView(`topico/${group.id}/${group.topics.indexOf(topic)}`) }}>{topic}</button></li>)}</ul></details>) : <p role="status">Nenhum tópico encontrado. Tente outro termo.</p>}<details className="central-existing"><summary>Roteiros existentes para consulta</summary><p>Fichas anteriores para preparação de visita; confira o recorte de cada uma.</p><ul>{BANKING_TOPICS.map(item => <li key={item.id}><button type="button" onClick={() => onView(item.id)}>{item.label}</button></li>)}</ul></details><section className="central-related"><h3>Insumos e indicadores</h3><p>Consulte os dados e roteiros existentes para cada insumo.</p><ul>{INSUMOS.map(item => <li key={item.id}><button type="button" onClick={() => onView(item.id)}>{item.label}</button></li>)}</ul></section></section>
    <aside className={`central-detail${selected ? ' central-detail-selected' : ''}`} aria-live="polite">{selected ? <><p className="central-kicker">{selected.groupLabel}</p><h3>{selected.topic}</h3><p className="central-note">Tópico disponível no catálogo. Estudo setorial não incluído nesta etapa.</p><h4>Estrutura para estudo</h4><ol>{TOPICOS_ESTUDO.map(topic => <li key={topic}>{topic}</li>)}</ol>{selected.group === 'transporte-logistica' && selected.topic === 'Carga geral' && <div className="central-related"><h4>Conteúdo relacionado</h4><p>Roteiro existente: Transporte de cargas. Confira o recorte e os limites antes de usar.</p><button onClick={() => onView('transporte-cargas')}>Abrir roteiro existente</button></div>}</> : <><h3>Escolha um subsetor</h3><p>Selecione um tópico para ver a estrutura prevista para o estudo.</p></>}</aside></div>
  </div>
}
