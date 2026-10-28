import { Aviso } from './Avisos.jsx'
import { useEffect, useRef } from 'react'
import { CONCEITOS, CONEXAO } from './educacao.js'
import { Panel } from './TerminalDesk.jsx'

// Aba Aprender: lista de conceitos à esquerda; o conceito escolhido abre à direita (frase, explicação simples, lacunas, versão precisa, exemplo, teste).
function Concept({ c, goto }) {
  return (
    <div className="learn-card is-focus">
      <Panel title={c.nome}>
        <div className="learn-body">
          <p className="learn-sentence"><span className="learn-tag">Em uma frase</span>{c.frase}</p>

          <h3>Explicação simples</h3>
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
  const chosen = CONCEITOS.find((c) => c.id === view)
  const detail = useRef(null)
  // no celular a explicação fica abaixo da lista: leva a tela até ela ao escolher um conceito
  useEffect(() => {
    if (chosen && detail.current && window.matchMedia?.('(max-width: 999px)').matches) {
      detail.current.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [chosen?.id])
  return (
    <div className="learn">
      <Aviso title="Aprender · exemplos didáticos"><p>Os exemplos usam números redondos para facilitar a conta; não são cotações de mercado.</p></Aviso>
      <div className="learn-split">
        <nav className="learn-list" aria-label="Conceitos">
          <h2 className="learn-list-title">Conceitos</h2>
          <ul>
            {CONCEITOS.map((c) => (
              <li key={c.id}>
                <button type="button" className={view === c.id ? 'on' : ''} aria-current={view === c.id ? 'true' : undefined} onClick={() => goto('aprender', c.id)}>
                  <b>{c.nome.replace(/ \(.*\)/, '')}</b>
                  <small>{c.frase.length > 70 ? `${c.frase.slice(0, 68).trimEnd()}…` : c.frase}</small>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <section className="learn-detail" ref={detail} aria-live="polite" aria-label="Explicação do conceito">
          {chosen ? <Concept key={chosen.id} c={chosen} goto={goto} /> : (
            <Panel title={CONEXAO.titulo} note="escolha um conceito ao lado">
              <div className="learn-body">
                <ul className="learn-links">
                  {CONEXAO.itens.map(([k, d]) => <li key={k}><strong>{k}</strong> {d}</li>)}
                </ul>
                <p className="learn-note">Escolha um conceito na lista para abrir a explicação.</p>
              </div>
            </Panel>
          )}
        </section>
      </div>
    </div>
  )
}
