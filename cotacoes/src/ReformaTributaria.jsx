import { useMemo } from 'react'
import { useDataFile } from './useDataFile.js'
import { normalizeReforma } from './reforma.js'
import NoticiasPorDia from './NoticiasPorDia.jsx'

// Resumo › "Reforma tributária": o que a imprensa publicou sobre o tema na semana, por dia, com busca.
export default function ReformaTributaria() {
  const file = useDataFile('reforma-tributaria.json')
  const data = useMemo(() => { try { return file.data ? normalizeReforma(file.data) : null } catch { return null } }, [file.data])
  return (
    <>
      {file.status === 'loading' && <p className="status" role="status">Carregando a reforma tributária…</p>}
      {file.status === 'error' && !data && <p className="status" role="status">Reforma tributária indisponível no momento.</p>}
      {file.data && !data && <p className="status" role="status">Arquivo da reforma tributária em formato inesperado.</p>}
      {data && <NoticiasPorDia data={data} ariaLabel="Reforma tributária: matérias da semana" />}
    </>
  )
}
