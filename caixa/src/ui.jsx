import { partes } from './format.js'

export const Icone = ({ nome }) => {
  const p = {
    esq: 'M14 6l-6 6 6 6', dir: 'M10 6l6 6-6 6', atualizar: 'M20 11a8 8 0 10-2.3 5.7M20 5v6h-6', sair: 'M10 5H6v14h4M15 8l4 4-4 4M9 12h10',
    ok: 'M5 12.5l4.5 4.5L19 7.5', busca: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4', fechar: 'M6 6l12 12M18 6L6 18',
  }[nome]
  return <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d={p} /></svg>
}

// Reais em destaque; "R$" e centavos discretos; algarismos tabulares.
export function Dinheiro({ valor, grande, sinal }) {
  const { neg, inteiro, centavos } = partes(valor)
  return (
    <span className={`din${grande ? ' grande' : ''}${neg ? ' neg' : ''}`}>
      {neg && <span className="din-sinal">−</span>}
      {!neg && sinal && valor > 0 && <span className="din-sinal">+</span>}
      <span className="din-rs">R$</span>
      <span className="din-int">{inteiro}</span>
      <span className="din-cent">,{centavos}</span>
    </span>
  )
}

export const Segmentos = ({ opcoes, valor, onChange }) => (
  <div className="seg" role="tablist">
    {opcoes.map((o) => (
      <button key={o.id} role="tab" aria-selected={valor === o.id} className={valor === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>{o.nome}</button>
    ))}
  </div>
)

export const Vazio = ({ children }) => <p className="vazio">{children}</p>
