// Aviso discreto: mostra "valores lembrados" só quando algum campo foge do padrão.
export default function CalcMemory({ mem }) {
  if (!mem.dirty) return null
  return (
    <p className="calc-memory">
      Últimos valores lembrados neste navegador.
      <button type="button" className="more" onClick={() => mem.reset()}>Restaurar padrões</button>
    </p>
  )
}
