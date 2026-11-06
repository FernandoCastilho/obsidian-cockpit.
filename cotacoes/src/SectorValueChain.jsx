import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './TechnologyIntegrationDiagram.css'
import './ResearchedSectorStudy.css'

// Texto nativo e listas ordenadas: a leitura não depende da imagem ou das setas.
export default function SectorValueChain({ diagram, title }) {
  const [paused, setPaused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [laser, setLaser] = useState(false)
  const [scale, setScale] = useState(1)
  const figureRef = useRef(null)
  const maximizeRef = useRef(null)
  const laserRef = useRef(null)
  const pointerRef = useRef(null)
  const wasExpanded = useRef(false)
  useLayoutEffect(() => {
    if (!expanded) return
    const fit = () => {
      const figure = figureRef.current
      if (figure) {
        if (window.innerWidth > 600) figure.parentElement.scrollTop = 0
        setScale(Math.min((window.innerWidth - 24) / figure.offsetWidth, (window.innerHeight - 72) / figure.offsetHeight, 1.5))
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(figureRef.current)
    window.addEventListener('resize', fit)
    return () => { observer.disconnect(); window.removeEventListener('resize', fit) }
  }, [expanded])
  useEffect(() => {
    if (!expanded) {
      if (wasExpanded.current) maximizeRef.current?.focus()
      wasExpanded.current = false
      return
    }
    wasExpanded.current = true
    window.history.pushState({ ...window.history.state, sectorDiagramFullscreen: true }, '')
    const onBack = () => { setExpanded(false); setLaser(false) }
    window.addEventListener('popstate', onBack)
    const appRoot = document.getElementById('root')
    const previousInert = appRoot?.inert
    if (appRoot) appRoot.inert = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    laserRef.current?.focus()
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setExpanded(false); setLaser(false) }
      if (event.key === 'Tab') { event.preventDefault(); laserRef.current?.focus() }
      if (event.key.toLowerCase() === 'p') { event.preventDefault(); setPaused(value => !value) }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      if (appRoot) appRoot.inert = previousInert
      window.removeEventListener('popstate', onBack)
      if (window.history.state?.sectorDiagramFullscreen) window.history.back()
    }
  }, [expanded])
  const figure = <figure ref={figureRef} className="tic-flow researched-flow"  data-paused={paused} style={expanded ? { '--sector-flow-transform': `translate(-50%, -50%) scale(${scale})` } : undefined} aria-labelledby="sector-flow-title" aria-describedby="sector-flow-note">
    <h4 id="sector-flow-title">Como funciona: <span>{title}</span></h4>
    <div className="tic-flow-controls">
      <p>O destaque percorre os participantes da cadeia. As relações estão descritas abaixo.</p>
      <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Retomar animação do diagrama' : 'Pausar animação do diagrama'}>{paused ? 'Retomar animação' : 'Pausar animação'}</button>
      <button ref={maximizeRef} className="tic-flow-maximize" type="button" aria-label="Maximizar diagrama" title="Maximizar diagrama" onClick={() => { setPaused(false); setExpanded(true) }}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button>
      <span className="tic-flow-reduced">Animação desativada pela preferência de movimento reduzido.</span>
    </div>
    <ol className="sector-chain-nodes" style={{ '--chain-duration': `${diagram.nodes.length * 1.8}s` }}>{diagram.nodes.map((node, index) => <li key={node.id} className="sector-chain-node" style={{ '--chain-step': index }}><span className="sector-chain-number" aria-hidden="true">{index + 1}</span><strong>{node.label}</strong><p>{node.detail}</p></li>)}</ol>
    <ul className="sector-chain-edges" aria-label="Relações da cadeia">{diagram.edges.map((edge, index) => <li key={`${edge.from}-${edge.to}-${index}`}><strong>{diagram.nodes.find(node => node.id === edge.from)?.label}</strong><span aria-hidden="true"> → </span><span className="tic-flow-sr-only"> para </span><strong>{diagram.nodes.find(node => node.id === edge.to)?.label}</strong><span>: {edge.label}</span></li>)}</ul>
    <figcaption id="sector-flow-note">Mapa conceitual do subsetor. As relações representam fluxos de produtos, serviços ou recursos; a ordem dos blocos não estabelece uma sequência obrigatória.</figcaption>
  </figure>
  if (!expanded) return figure
  return createPortal(<div className="tic-flow-fullscreen researched-flow-fullscreen" role="dialog" aria-modal="true" aria-label="Diagrama em tela cheia" aria-describedby="sector-flow-fullscreen-help" onPointerMove={event => {
    if (pointerRef.current) {
      pointerRef.current.style.left = `${event.clientX}px`
      pointerRef.current.style.top = `${event.clientY}px`
    }
  }}>
    <p id="sector-flow-fullscreen-help" className="tic-flow-sr-only">Pressione Escape ou use Voltar do navegador para sair. Pressione P para pausar ou retomar a animação. Ative o laser e mova o ponteiro para destacar uma região.</p>
    <button ref={laserRef} className="tic-flow-laser-toggle" type="button" aria-pressed={laser} onClick={() => setLaser(value => !value)}>{laser ? 'Desativar laser' : 'Ativar laser'} <span aria-hidden="true">⊙</span></button>
    {figure}
    {laser && <span ref={pointerRef} className="tic-flow-laser" aria-hidden="true" />}
  </div>, document.body)
}
