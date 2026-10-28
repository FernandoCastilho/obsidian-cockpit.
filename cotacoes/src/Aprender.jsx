import { Aviso } from './Avisos.jsx'
import { useEffect, useRef } from 'react'
import { CONCEITOS, CONEXAO, METODO } from './educacao.js'
import { Panel } from './TerminalDesk.jsx'

// Aba Aprender: cada conceito segue o método Feynman (frase, explicação simples, lacunas, versão precisa, exemplo, teste).
function Concept({ c, goto, focus }) {
  const ref = useRef(null)
  useEffect(() => {
    if (focus && ref.current) {
      ref.current.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [focus])
  return (
    <div id={c.id} ref={ref} className={`learn-card${focus ? ' is-focus' : ''}`} tabIndex={-1}>
      <Panel title={c.nome} note="método Feynman">
        <div className="learn-body">
          <p className="learn-sentence"><span className="learn-tag">Em uma frase</span>{c.frase}</p>

          <h3>Explique como a uma criança de 12 anos</h3>
          {c.crianca.map((t) => <p key={t}>{t}</p>)}
          <p className="learn-analogy"><span className="learn-tag">Analogia</span>{c.analogia}</p>

          <details open>
            <summary>Onde você pode travar</summary>
            <ul>{c.lacunas.map((t) => <li key={t}>{t}</li>)}</ul>
          </details>

          <details>
            <summary>Versão precisa</summary>
            <p>{c.preciso.texto}</p>
            <p className="learn-formula" role="math" aria-label={c.preciso.formula}>{c.preciso.formula}</p>
          </details>

          <details open>
            <summary>Exemplo numérico · {c.exemplo.titulo}</summary>
            <ol>{c.exemplo.passos.map((t) => <li key={t}>{t}</li>)}</ol>
            <p className="learn-result"><strong>Resultado:</strong> {c.exemplo.resultado}</p>
            
          </details>

          <details>
            <summary>Teste: explique com as suas palavras</summary>
            <p><strong>{c.teste.pergunta}</strong></p>
            <details className="learn-answer">
              <summary>Ver resposta</summary>
              <p>{c.teste.resposta}</p>
            </details>
          </details>

          <p className="learn-app">
            <span className="learn-tag">No app</span>{c.noApp.texto}{' '}
            <button type="button" className="learn-go" onClick={() => goto(c.noApp.tab)}>Abrir ›</button>
          </p>
        </div>
      </Panel>
    </div>
  )
}

export default function Aprender({ view = '', goto }) {
  return (
    <div className="learn">
      <Aviso title="Aprender · exemplos didáticos"><p>Os exemplos usam números redondos para facilitar a conta; não são cotações de mercado.</p></Aviso>
      <div className="learn-top">
        <Panel title={METODO.titulo} note="como estudar aqui">
          <div className="learn-body">
            <p>{METODO.intro}</p>
            <ol className="learn-steps">
              {METODO.passos.map(([t, d]) => <li key={t}><strong>{t}.</strong> {d}</li>)}
            </ol>
          </div>
        </Panel>
        <Panel title={CONEXAO.titulo} note="visão geral">
          <div className="learn-body">
            <ul className="learn-links">
              {CONEXAO.itens.map(([k, d]) => <li key={k}><strong>{k}</strong> {d}</li>)}
            </ul>
          </div>
        </Panel>
      </div>
      <nav className="learn-nav" aria-label="Conceitos">
        {CONCEITOS.map((c) => (
          <button key={c.id} type="button" className={view === c.id ? 'on' : ''} aria-current={view === c.id ? 'true' : undefined} onClick={() => goto('aprender', c.id)}>{c.nome.replace(/ \(.*\)/, '')}</button>
        ))}
      </nav>
      <div className="learn-grid">
        {CONCEITOS.map((c) => <Concept key={c.id} c={c} goto={goto} focus={view === c.id} />)}
      </div>
    </div>
  )
}
