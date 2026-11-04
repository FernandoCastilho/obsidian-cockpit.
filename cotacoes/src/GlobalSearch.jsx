import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SEARCH_SECTIONS, SEARCH_SOURCES, highlightParts, indexSearchData, isSearchShortcut, searchDocuments, searchSnippet } from './globalSearch.js'
import { DATA_BASE } from './useQuotes.js'
import { loadDataFile } from './useDataFile.js'
import './GlobalSearch.css'
export function SearchHighlight({ text, query }) {
  return highlightParts(String(text || ''),query).map((p,i)=>p.match ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>)
}
const stamp = t => t ? new Date(t).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo'}) : 'referência não informada'
export default function GlobalSearch({ onNavigate }) {
  const [open,setOpen]=useState(false), [query,setQuery]=useState(''), [docs,setDocs]=useState([]), [sources,setSources]=useState([]), [pending,setPending]=useState(false), [attempt,setAttempt]=useState(0), [limit,setLimit]=useState(60), [staticError,setStaticError]=useState(false)
  const dialog=useRef(null), input=useRef(null), trigger=useRef(null), previousFocus=useRef(null)
  const deferred=useDeferredValue(query)
  const show=()=>{if(document.querySelector('dialog[open]'))return;previousFocus.current=document.activeElement;setOpen(true)}
  const close=()=>setOpen(false)
  useEffect(()=>{
    const key=e=>{if(isSearchShortcut(e) && (!document.querySelector('dialog[open]') || dialog.current?.open)){e.preventDefault();if(dialog.current?.open)input.current?.focus();else{previousFocus.current=document.activeElement;setOpen(true)}}}
    document.addEventListener('keydown',key)
    return()=>document.removeEventListener('keydown',key)
  },[])
  useEffect(()=>{
    const el=dialog.current, triggerElement=trigger.current
    if(!open){if(el.open)el.close();return}
    el.showModal();input.current?.focus();const overflow=document.body.style.overflow;document.body.style.overflow='hidden'
    return()=>{if(el.open)el.close();document.body.style.overflow=overflow;const back=previousFocus.current?.isConnected ? previousFocus.current : triggerElement;back?.focus({preventScroll:true})}
  },[open])
  useEffect(()=>{
    if(!open)return
    let active=true, cursor=0
    setDocs([]);setSources([]);setStaticError(false);setPending(true)
    const loadStatic=import('./searchCatalog.js').then(m=>{if(active)setDocs(d=>[...d,...m.staticSearchDocuments()])}).catch(()=>{if(active)setStaticError(true)})
    const work=async()=>{
      while(cursor<SEARCH_SOURCES.length){
        const [file,route,label]=SEARCH_SOURCES[cursor++]
        try{
          const external = ['quotes.json','history.json','intraday.json'].includes(file) && DATA_BASE
          const result = external ? await fetch(`${DATA_BASE}/${file}`, {signal:AbortSignal.timeout(20000)}).then(async response=>{if(!response.ok)throw new Error('Indisponível');return {data:await response.json()}}) : await loadDataFile(file,Date.now(),attempt>0)
          if(!result.data)throw new Error('Dados indisponíveis')
          const indexed=indexSearchData(file,result.data,route,label)
          if(active){setDocs(d=>[...d,...indexed.docs]);setSources(s=>[...s,{label,limited:indexed.limited,stale:!!result.stale,ok:true,stamp:result.data.generatedAt || result.data.updatedAt}])}
        }catch{if(active)setSources(s=>[...s,{label,ok:false}])}
      }
    }
    Promise.allSettled([loadStatic,...Array.from({length:4},work)]).then(()=>{if(active)setPending(false)})
    return()=>{active=false}
  },[open,attempt])
  const results=useMemo(()=>searchDocuments(docs,deferred),[docs,deferred])
  const shown=results.slice(0,limit)
  const groups=Object.values(SEARCH_SECTIONS).map(section=>({section,items:shown.filter(d=>d.section===section)})).filter(g=>g.items.length)
  const failed=sources.filter(s=>!s.ok), stale=sources.filter(s=>s.stale), limited=sources.filter(s=>s.limited)
  const choose=d=>{setOpen(false);onNavigate(d,query)}
  return <>
    <button ref={trigger} type="button" className="global-search-trigger" aria-label="Buscar em todo o painel" aria-haspopup="dialog" aria-keyshortcuts="Control+Shift+F" onClick={show} title="Buscar em todo o painel · Ctrl+Shift+F"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><span>Buscar</span><kbd>Ctrl⇧F</kbd></button>
    {createPortal(<dialog ref={dialog} className="global-search-dialog" aria-labelledby="global-search-heading" onKeyDown={e=>{if(e.key==='Escape' && !e.isComposing){e.preventDefault();e.stopPropagation();close()}}} onCancel={e=>{e.preventDefault();close()}} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===dialog.current && (e.clientX<e.currentTarget.getBoundingClientRect().left || e.clientX>e.currentTarget.getBoundingClientRect().right || e.clientY<e.currentTarget.getBoundingClientRect().top || e.clientY>e.currentTarget.getBoundingClientRect().bottom))close()}}>
      <div className="global-search-head"><h2 id="global-search-heading">Buscar no painel</h2><button type="button" className="btn" onClick={close} aria-label="Fechar busca">Fechar</button></div>
      <label className="global-search-field">Palavra ou expressão<input ref={input} type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(60)}} autoComplete="off" spellCheck={false} placeholder="Ex.: inadimplência, FIDC, inflação" aria-describedby="global-search-scope" /></label>
      <p id="global-search-scope" className="global-search-scope">Busca local nas áreas do painel, conceitos completos, explicações e dados publicados. Ignora acentos e maiúsculas. Não inclui textos integrais de sites externos, formulários ou conteúdo pessoal não salvo. Ctrl+Shift+F funciona quando o navegador entrega o atalho à página; o botão Buscar permanece disponível.</p>
      <div className="global-search-status" role="status" aria-live="polite">{query.trim().length<2 ? 'Digite pelo menos 2 caracteres.' : `${results.length} resultado${results.length===1?'':'s'}${shown.length<results.length ? ` · mostrando ${shown.length}` : ''}.`}{pending && ` Carregando dados das áreas (${sources.length}/${SEARCH_SOURCES.length}); resultados parciais.`}</div>
      {(failed.length>0 || staticError || stale.length>0 || limited.length>0) && <details className="search-coverage"><summary>Cobertura da busca: {failed.length+(staticError?1:0)} indisponível(is){stale.length ? ` · ${stale.length} cópia(s) preservada(s)` : ''}{limited.length ? ' · cobertura parcial' : ''}</summary>{staticError && <p>Conteúdo estático indisponível nesta tentativa.</p>}{failed.map(s=><p key={s.label}>{s.label}: não foi possível ler os dados publicados.</p>)}{stale.map(s=><p key={s.label}>{s.label}: última cópia disponível, de {stamp(s.stamp)}.</p>)}{limited.map(s=><p key={s.label}>{s.label}: limite de tamanho do índice atingido; parte dos registros não foi incluída.</p>)}<button type="button" className="btn" disabled={pending} onClick={()=>setAttempt(a=>a+1)}>Tentar novamente</button></details>}
      {!pending && query.trim().length>=2 && !results.length && <p>Nenhum resultado no conteúdo disponível. Tente outra palavra ou confira a cobertura acima.</p>}
      <div className="global-search-results" aria-busy={pending || deferred!==query}>{groups.map(g=><section key={g.section} aria-label={`Resultados em ${g.section}`}><h3>{g.section} <small>{results.filter(d=>d.section===g.section).length}</small></h3><ul>{g.items.map(d=><li key={d.id}><button type="button" className="global-search-result" onClick={()=>choose(d)}><strong><SearchHighlight text={d.title} query={query}/></strong><small>{d.kind}{d.stamp ? ` · referência do arquivo: ${stamp(d.stamp)}` : ''}</small><span><SearchHighlight text={searchSnippet(d.body,query)} query={query}/></span><span className="search-open">Abrir em {g.section}</span></button></li>)}</ul></section>)}</div>
      {shown.length<results.length && <button type="button" className="btn search-more" onClick={()=>setLimit(l=>l+60)}>Mostrar mais resultados</button>}
    </dialog>,document.body)}
  </>
}
export function SearchDestination({ selection, onClose }) {
  const ref=useRef(null)
  useEffect(()=>{if(!selection)return;const id=requestAnimationFrame(()=>{ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'start'})});return()=>cancelAnimationFrame(id)},[selection])
  if(!selection)return null
  const {doc,query}=selection
  return <aside ref={ref} tabIndex={-1} className="search-destination" aria-label="Resultado aberto pela busca">
    <div><strong>Resultado da busca: <SearchHighlight text={doc.title} query={query}/></strong><button type="button" className="btn" onClick={onClose} aria-label="Fechar resultado da busca">Fechar resultado</button></div>
    <p><SearchHighlight text={searchSnippet(doc.body,query,400)} query={query}/></p>
    <small>{doc.kind}{doc.stamp ? ` · cópia do arquivo de ${stamp(doc.stamp)}` : ''}. A área correspondente está aberta abaixo; alguns itens podem exigir os filtros ou a tabela de histórico.</small>
    {doc.kind==='Explicação' && <details open><summary>Explicação completa</summary><p>{doc.body}</p></details>}
  </aside>
}
