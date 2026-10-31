import { mensagemErro } from './erro.js'

// Estado de carregamento, vazio, aviso ou erro de um painel: uma linha pequena com marcador de cor, sem competir com o dado.
// tipo: 'erro' (vermelho), 'aviso' (âmbar), 'info' (neutro). `erro` (opcional) vira o motivo curto em linguagem simples; o texto técnico fica só no title.
export default function Estado({ tipo = 'info', erro, children }) {
  const motivo = erro != null ? mensagemErro(erro) : null
  return (
    <p className={`estado estado-${tipo}`} role="status" title={erro != null && erro !== '' ? String(erro?.message ?? erro) : undefined}>
      <span className="estado-ponto" aria-hidden="true" />
      <span>{children}{motivo ? <small> · {motivo}</small> : null}</span>
    </p>
  )
}
