import { createContext, useContext, useState } from 'react'

// Filtros de um gráfico ampliado, num só bloco no topo: período (e datas) e escala dos pontos.
// O gráfico encaixa o seletor de escala no mesmo bloco, para não haver dois conjuntos de filtros na tela.
const Scope = createContext({ slot: null, setSlot: () => {} })
export const useFilterSlot = () => useContext(Scope).slot

// Envolve o conteúdo da tela ampliada: liga o bloco de filtros aos gráficos que estão dentro dela.
export function FilterScope({ children }) {
  const [slot, setSlot] = useState(null)
  return <Scope.Provider value={{ slot, setSlot }}>{children}</Scope.Provider>
}

export default function ChartFilters({ children, label = 'Filtros do gráfico' }) {
  const { setSlot } = useContext(Scope)
  return (
    <section className="chart-filters" aria-label={label}>
      <div className="cf-row"><span className="cf-label" aria-hidden="true">Período</span><div className="cf-body">{children}</div></div>
      <div className="cf-row cf-scale"><span className="cf-label" aria-hidden="true">Escala</span><div className="cf-body" ref={setSlot} /></div>
    </section>
  )
}
