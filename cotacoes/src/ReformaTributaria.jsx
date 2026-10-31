import { useMemo } from 'react'
import { useDataFile } from './useDataFile.js'
import { normalizeReforma } from './reforma.js'
import NoticiasPorDia from './NoticiasPorDia.jsx'
import Estado from './Estado.jsx'

// Resumo › "Reforma tributária": o que a imprensa publicou sobre o tema na semana, por dia, com busca.
export default function ReformaTributaria() {
  const file = useDataFile('reforma-tributaria.json')
  const data = useMemo(() => { try { return file.data ? normalizeReforma(file.data) : null } catch { return null } }, [file.data])
  return (
    <>
      {file.status === 'loading' && <Estado>Carregando a reforma tributária…</Estado>}
      {file.status === 'error' && !data && <Estado tipo="erro" erro={file.error}>Reforma tributária indisponível no momento.</Estado>}
      {file.data && !data && <Estado tipo="erro">Arquivo da reforma tributária em formato inesperado.</Estado>}
      {data && <NoticiasPorDia data={data} ariaLabel="Reforma tributária: matérias da semana" />}
    </>
  )
}
