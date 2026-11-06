import { useEffect, useRef, useState } from 'react'
import { INSUMOS } from './insumos.js'
import SetoresLegado from './SetoresLegado.jsx'
import { CATALOGO_SETORIAL, TOPICOS_ESTUDO, normalizeSector } from './centralSetorial.js'
import './CentralSetorial.css'

export default function Setores({ view = '', onView = () => {}, quotes }) {
  const [query, setQuery] = useState('')
  const detailRef = useRef(null)
  const parts = view.split('/')
  const routeGroup = parts[0] === 'topico' ? CATALOGO_SETORIAL.find(group => group.id === parts[1]) : null
  const routeTopic = routeGroup?.topics[Number(parts[2])]
  const selected = routeTopic ? {group: routeGroup.id, groupLabel: routeGroup.label, topic: routeTopic} : null
  const showContent = Boolean(view && view !== 'central' && !routeGroup && view !== 'b3' && !view.startsWith('b3/'))
  useEffect(() => { if ((routeTopic || showContent) && detailRef.current) { detailRef.current.focus({ preventScroll: true }); detailRef.current.scrollIntoView({ block: 'start', behavior: 'auto' }) } }, [routeTopic, showContent, view])
  const term = normalizeSector(query.trim())
  const groups = CATALOGO_SETORIAL.map(group => ({...group, matches: group.topics.filter(topic => !term || normalizeSector(`${group.label} ${topic}`).includes(term))})).filter(group => group.matches.length)
  return <div className="central-setorial">
    <header className="central-intro"><p className="central-kicker">CONHECIMENTO SETORIAL</p><h2>Central de setores</h2><p>Explore setores e subsetores para entender seus negócios, mercados e necessidades financeiras.</p></header>
    <label className="central-search">Buscar setor ou subsetor<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: compensados, autopeças ou logística" /></label>
    {(view === 'b3' || view.startsWith('b3/')) && <p role="status" className="central-note">A antiga classificação B3 foi substituída pelo catálogo unificado. Escolha o setor correspondente abaixo; não há conversão automática entre classificações.</p>}
    <div className="central-layout"><div className="central-catalog"><section className="central-callout" aria-labelledby="central-sectors-title"><h3 id="central-sectors-title">Setores e subsetores</h3>{groups.length ? groups.map(group => <details key={group.id} open={term || selected?.group === group.id ? true : undefined}><summary>{group.label} <span>{group.matches.length} {group.matches.length === 1 ? 'tópico' : 'tópicos'}</span></summary><ul>{group.matches.map(topic => <li key={topic}><button type="button" aria-pressed={selected?.topic === topic && selected?.group === group.id} onClick={() => onView(`topico/${group.id}/${group.topics.indexOf(topic)}`)}>{topic}</button></li>)}</ul></details>) : <p role="status">Nenhum tópico encontrado. Tente outro termo.</p>}</section><section className="central-callout" aria-labelledby="central-inputs-title"><h3 id="central-inputs-title">Insumos e Indicadores</h3><ul>{INSUMOS.map(item => <li key={item.id}><button type="button" aria-pressed={showContent && view === item.id} onClick={() => onView(item.id)}>{item.label}</button></li>)}</ul></section></div>
    <aside ref={detailRef} tabIndex={-1} className={`central-detail${selected || showContent ? ' central-detail-selected' : ''}${showContent ? ' central-detail-content' : ''}`} aria-live="polite">{showContent ? <SetoresLegado key={view} view={view} quotes={quotes}/> : selected ? <><p className="central-kicker">{selected.groupLabel}</p><h3>{selected.topic}</h3><p className="central-note">Tópico disponível no catálogo. Estudo setorial não incluído nesta etapa.</p><h4>Estrutura para estudo</h4><ol>{TOPICOS_ESTUDO.map(topic => <li key={topic}>{topic}</li>)}</ol></> : <><h3>Escolha um subsetor</h3><p>Selecione um tópico para ver a estrutura prevista para o estudo.</p></>}</aside></div>
  </div>
}
