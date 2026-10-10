import Help from './Help.jsx'
import { GLOSSARY } from './glossary.js'

// Botão "?" com a explicação do indicador ou gráfico (texto em glossary.js).
export default function Explain({ id, align = 'left' }) {
  const g = GLOSSARY[id]
  if (!g) return null
  return (
    <Help label={`O que é: ${g.t}`} align={align} wide>
      <b className="ex-t">{g.t}</b>
      <span className="ex">{g.a}</span>
      <span className="ex"><i>Exemplo:</i> {g.b}</span>
      <span className="ex"><i>Na prática:</i> {g.c}</span>
    </Help>
  )
}
