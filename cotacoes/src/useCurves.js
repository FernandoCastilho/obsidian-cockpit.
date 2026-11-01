import { useMemo } from 'react'
import { useDataFile } from './useDataFile.js'

// Uma comparação com os mesmos vértices do último dia não é comparação: é a fonte devolvendo a curva mais recente
// para uma data antiga. Some do gráfico, da legenda e da leitura do cupom em vez de sugerir "curva parada".
export function semCopias(set) {
  if (!set?.compare?.length || !set.curves) return set
  const [first, ...rest] = set.compare
  const base = JSON.stringify(set.curves[first.date])
  const compare = [first, ...rest.filter((c) => JSON.stringify(set.curves[c.date]) !== base)]
  return compare.length === set.compare.length ? set : { ...set, compare }
}

export function useCurves() {
  const file = useDataFile('curves.json')
  return useMemo(() => (file.data ? { ...file, data: { ...file.data, br: semCopias(file.data.br), cc: semCopias(file.data.cc), us: semCopias(file.data.us) } } : file), [file])
}
