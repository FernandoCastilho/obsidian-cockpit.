import { useMemo } from 'react'
import Flag from './Flag.jsx'
import { CURRENCIES } from './useQuotes.js'
import { useDataFile } from './useDataFile.js'
import { juntarMoedas, normalizeReforma, normalizeTemas } from './reforma.js'
import NoticiasPorDia from './NoticiasPorDia.jsx'
import Estado from './Estado.jsx'

// Resumo › "Reforma tributária": o que a imprensa publicou sobre o tema na semana, por dia, com busca.
export default function ReformaTributaria({ simples = false }) {
  const file = useDataFile('reforma-tributaria.json')
  const data = useMemo(() => { try { return file.data ? normalizeReforma(file.data) : null } catch { return null } }, [file.data])
  return (
    <>
      {file.status === 'loading' && <Estado>Carregando a reforma tributária…</Estado>}
      {file.status === 'error' && !data && <Estado tipo="erro" erro={file.error}>Reforma tributária indisponível no momento.</Estado>}
      {file.data && !data && <Estado tipo="erro">Arquivo da reforma tributária em formato inesperado.</Estado>}
      {data && <NoticiasPorDia data={data} simples={simples} ariaLabel="Reforma tributária: matérias da semana" />}
    </>
  )
}

// Resumo › "Eleições EUA" (e outros temas de temas.json): matérias da semana, por dia, com busca.
export function TemaNoticias({ id, simples = false }) {
  const file = useDataFile('temas.json')
  const tema = useMemo(() => { try { return file.data ? normalizeTemas(file.data)[id] ?? null : null } catch { return null } }, [file.data, id])
  return (
    <>
      {file.status === 'loading' && <Estado>Carregando as matérias…</Estado>}
      {file.status === 'error' && !tema && <Estado tipo="erro" erro={file.error}>Matérias indisponíveis no momento.</Estado>}
      {file.data && !tema && file.status !== 'loading' && <Estado>Ainda não há matérias coletadas para este assunto; a coleta é de hora em hora.</Estado>}
      {tema && <NoticiasPorDia key={id} data={tema} simples={simples} ariaLabel={`${tema.label}: matérias da semana`} />}
    </>
  )
}

// Resumo › "Moedas": as matérias da semana sobre dólar, euro, iene e yuan numa só linha do tempo, com a bandeira da moeda.
export function MoedasNoticias() {
  const file = useDataFile('temas.json')
  const data = useMemo(() => {
    try {
      const t = file.data ? normalizeTemas(file.data) : null
      return t ? { items: juntarMoedas(t), windowDays: 7, stale: Object.keys(t).some((k) => k.startsWith('moeda-') && t[k].stale) } : null
    } catch { return null }
  }, [file.data])
  const nome = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.name]))
  return (
    <>
      {file.status === 'loading' && <Estado>Carregando as matérias…</Estado>}
      {file.status === 'error' && !data && <Estado tipo="erro" erro={file.error}>Matérias indisponíveis no momento.</Estado>}
      {data && <NoticiasPorDia data={data} simples ariaLabel="Moedas: matérias da semana" prefixo={(n) => <span className="news-flags" role="img" aria-label={`Moedas: ${n.codes.map((c) => nome[c]).join(', ')}`}>{n.codes.map((c) => <Flag key={c} code={c} width={18} height={12} />)}</span>} />}
    </>
  )
}
