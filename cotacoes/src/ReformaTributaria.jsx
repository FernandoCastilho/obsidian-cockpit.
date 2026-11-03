import { useMemo } from 'react'
import { useDataFile } from './useDataFile.js'
import { normalizeReforma, normalizeTemas } from './reforma.js'
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

// Resumo › "Eleições EUA" (e outros temas de temas.json): matérias da semana, por dia, com busca.
export function TemaNoticias({ id }) {
  const file = useDataFile('temas.json')
  const tema = useMemo(() => { try { return file.data ? normalizeTemas(file.data)[id] ?? null : null } catch { return null } }, [file.data, id])
  return (
    <>
      {file.status === 'loading' && <Estado>Carregando as matérias…</Estado>}
      {file.status === 'error' && !tema && <Estado tipo="erro" erro={file.error}>Matérias indisponíveis no momento.</Estado>}
      {file.data && !tema && file.status !== 'loading' && <Estado>Ainda não há matérias coletadas para este assunto; a coleta é de hora em hora.</Estado>}
      {tema && <NoticiasPorDia key={id} data={tema} ariaLabel={`${tema.label}: matérias da semana`} />}
    </>
  )
}
