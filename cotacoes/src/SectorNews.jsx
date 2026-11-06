import { NEWS_WINDOW_MS } from './newsWindow.js'
import { useEffect, useMemo, useState } from 'react'
import { useDataFile } from './useDataFile.js'
import { startVisiblePolling, DATA_POLL_MS } from './visiblePolling.js'
import { normalizeSectorNews } from './sectorNews.js'
import Estado from './Estado.jsx'

const dateTime = value => {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'não disponível'
}
const STATUS_LABELS = {
  ok: 'Há publicações nas fontes consultadas. A cobertura não é exaustiva.',
  partial: 'Cobertura parcial: há fontes ou verificações pendentes.',
  empty: 'Nenhuma publicação relevante encontrada na janela, nas fontes consultadas.',
  failed: 'A coleta deste tema falhou. Isso não significa ausência de notícias.',
  unavailable: 'Cobertura ainda indisponível: não há fonte homologada e consultada para este tema.',
}
const TYPE_LABELS = { comunicado: 'Comunicado institucional', estatistica: 'Divulgação estatística', imprensa: 'Imprensa independente', official: 'Comunicado oficial', statistics: 'Divulgação estatística', news: 'Notícia', association: 'Entidade representativa', opinion: 'Opinião', company: 'Comunicado de empresa' }
const SOURCE_STATUS_LABELS = { ok: 'consulta concluída', empty: 'sem resultado na janela', partial: 'consulta parcial', failed: 'falha de consulta', unavailable: 'não disponível', disabled: 'não habilitada', pending: 'validação pendente' }
const publicationLabel = item => item.datePrecision === 'day' ? `${String(item.publishedAt).slice(0, 10).split('-').reverse().join('/')} · horário não informado pela fonte` : dateTime(item.t)

// Reavalia as 120 horas enquanto a tela está aberta, além do filtro na coleta.
export default function SectorNews({ id, label }) {
  const resource = useDataFile('sector-news.json')
  const [now, setNow] = useState(Date.now)
  useEffect(() => startVisiblePolling(() => setNow(Date.now()), DATA_POLL_MS), [])
  const normalized = useMemo(() => {
    try { return resource.data ? normalizeSectorNews(resource.data, now) : null } catch { return null }
  }, [resource.data, now])
  const topic = normalized?.topics?.[id]
  const items = topic?.items ?? []
  return <section className="sector-news" aria-labelledby={`sector-news-${id}`}>
    <h3 id={`sector-news-${id}`} className="sector-news-heading">Notícias e comunicados · últimos 5 dias</h3>
    <p className="sector-news-meta">Janela móvel de 120 horas: {dateTime(now - NEWS_WINDOW_MS)} a {dateTime(now)}, horário de Brasília. Só títulos originais com fonte e link. Sem resumo nem inferência do conteúdo.</p>
    <p className="sector-news-status">Coleta externa desabilitada neste candidato, inclusive para execução local. Somente a janela do snapshot existente é revalidada; consulte a data da última verificação de cada fonte.</p>
    {resource.status === 'loading' && !topic ? <Estado>Carregando a cobertura de {label}…</Estado> : <>
      {(resource.status === 'error' || resource.stale) && <Estado tipo="aviso">Arquivo de notícias sem atualização nesta leitura. {resource.data ? 'Somente publicações ainda dentro da janela são mantidas.' : 'Não foi possível verificar a cobertura.'}</Estado>}
      {resource.data && !normalized && <Estado tipo="erro">Arquivo de notícias inválido. Não é possível verificar a cobertura.</Estado>}
      <p className="sector-news-status" role="status">{topic?.coverageNote || STATUS_LABELS[topic?.status] || STATUS_LABELS.unavailable}</p>
      {topic && <p className="sector-news-meta">Tentativa de coleta: {dateTime(topic.checkedAt)} · último sucesso: {dateTime(topic.lastSuccessAt)}. A data de geração do arquivo não prova que cada fonte tenha atualizado.</p>}
      {items.length > 0 && <ol className="sector-news-list" aria-label={`${label}: publicações na janela`}>{items.map(item => <li key={item.link}>
        <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
        <small>{item.source} · {TYPE_LABELS[item.type] ?? item.type ?? 'Tipo não informado'}</small>
        {item.author && <small>Autoria indicada na origem: {item.author}</small>}
        {item.relevanceNote && <small>Recorte editorial: {item.relevanceNote}</small>}
        <small>Publicação: <time dateTime={item.datePrecision === 'day' ? item.publishedAt : new Date(item.t).toISOString()}>{publicationLabel(item)}</time> · coleta: {dateTime(item.collectedAt)}</small>
        {item.licenseUrl && <small><a href={item.licenseUrl} target="_blank" rel="noopener noreferrer">Licença de uso da fonte</a> · título original, sem adaptação.</small>}
      </li>)}</ol>}
      <details><summary>Fontes consultadas e limites da cobertura</summary>
        <p className="sector-news-meta">Comunicados refletem a posição do órgão emissor. A cobertura do tema pode abranger elos diferentes do recorte da ficha de visita. Uma notícia não comprova o desempenho de todas as empresas do setor. Não há quantidade mínima artificial de matérias.</p>
        {topic?.sources?.length ? <ul>{topic.sources.map((source, index) => <li key={source.id ?? index}>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label ?? source.name ?? source.id}</a> : source.label ?? source.name ?? source.id}{source.status ? ` · ${SOURCE_STATUS_LABELS[source.status] ?? 'ver detalhes da fonte'}` : ''}{source.reason ? ` · ${source.reason}` : ''}{source.lastSuccessAt && <span> · último sucesso: {dateTime(source.lastSuccessAt)}</span>}</li>)}</ul> : <p className="sector-news-meta">Nenhuma fonte homologada registrada para este recorte.</p>}
      </details>
    </>}
  </section>
}
