import { useMemo } from 'react'
import { useDataFile } from './useDataFile.js'
import { useNewsClock } from './useNewsClock.js'
import { CURADORIA_TOPICS, normalizeCuradoria } from './curadoria.js'
import NoticiasPorDia from './NoticiasPorDia.jsx'
import Estado from './Estado.jsx'

const stamp = value => Number.isFinite(value) ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'não confirmada'
export default function CuradoriaNoticias({ id }) {
  const now = useNewsClock()
  const file = useDataFile('curadoria-noticias.json')
  const data = useMemo(() => normalizeCuradoria(file.data, id, now), [file.data, id, now])
  const label = CURADORIA_TOPICS.find(topic => topic.id === id)?.label ?? 'Notícias'
  return <div className="curadoria-noticias">
    <h3>{label}</h3>
    <p className="muted">Curadoria automática de fontes oficiais e imprensa selecionada: títulos relacionados ao tema, com links e títulos repetidos removidos. Cobertura não exaustiva; consulte a matéria para distinguir proposta, opinião e regra em vigor.</p>
    {file.status === 'loading' && !data && <Estado>Carregando a curadoria…</Estado>}
    {!data && file.status !== 'loading' && <Estado tipo="erro">Curadoria indisponível no momento. Não foi possível confirmar as publicações dos últimos sete dias.</Estado>}
    {data && <>
      <p className="muted">Última consulta: {stamp(data.checkedAt)} · Última coleta completa: {stamp(data.lastSuccessAt)} (Brasília).</p>
      <NoticiasPorDia key={id} data={{ ...data, stale: data.stale || file.stale || file.status === 'error' }} windowDays={7} simples ariaLabel={`${label}: notícias dos últimos sete dias`} />
    </>}
  </div>
}
