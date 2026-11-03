import { useState } from 'react'
import { useDataFile } from './useDataFile.js'
import { TREND_GROUPS, exploreUrl } from './trends.js'
import { TREND_SNAPSHOT, SNAPSHOT_AT, SNAPSHOT_START } from './trendsSnapshot.js'
import './GoogleTrends.css'
const stamp = value => value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'Ainda sem coleta válida'
function HistoricalSnapshot({ group }) {
  const series = TREND_SNAPSHOT[group]
  if (!series) return <p role="status">Série histórica local ainda indisponível para este tema. Consulte o gráfico na fonte.</p>
  const date = i => new Date(Date.parse(SNAPSHOT_START) + i * 86400000).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  const points = series.values.map((v, i) => `${36 + i / (series.values.length - 1) * 548},${174 - v * 1.5}`).join(' ')
  return <figure className="trends-snapshot"><figcaption><strong>{series.term}</strong> · Brasil · interesse relativo (0–100)</figcaption>
    <svg viewBox="0 0 600 205" role="img" aria-label={`Interesse em ${series.term}, de 03/08 a 02/11/2026. Valores na tabela abaixo.`}>
      {[0,50,100].map(v => <g key={v}><line x1="36" x2="584" y1={174-v*1.5} y2={174-v*1.5} stroke="currentColor" opacity=".15" /><text x="3" y={179-v*1.5} fill="currentColor" fontSize="12">{v}</text></g>)}
      <polyline points={points} fill="none" stroke="var(--amber)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <text x="36" y="199" fill="currentColor" fontSize="12">03/08/2026</text><text x="584" y="199" textAnchor="end" fill="currentColor" fontSize="12">02/11/2026</text>
    </svg>
    <p className="trends-status">Snapshot histórico consultado em {stamp(SNAPSHOT_AT)} (Brasília). Não atualiza automaticamente. Último dia parcial excluído. Escalas independentes entre termos; zero pode indicar volume insuficiente.</p>
    <details><summary>Ver valores diários</summary><div className="trends-values"><table><thead><tr><th>Data (UTC)</th><th>Índice</th></tr></thead><tbody>{series.values.map((v,i) => <tr key={i}><td>{date(i)}</td><td>{v}</td></tr>)}</tbody></table></div></details>
  </figure>
}
export default function GoogleTrends() {
  const file = useDataFile('trends.json')
  const [group, setGroup] = useState('credito')
  const [period, setPeriod] = useState('today 3-m')
  const active = TREND_GROUPS.find(g => g.id === group)
  const data = file.data
  const highlights = (data?.items ?? []).filter(i => i.groups?.length).slice(0, 3)
  const old = data?.generatedAt && Date.now() - data.generatedAt > 25 * 3600000
  return <section className="google-trends" aria-label="Google Trends">
    <header><h3>O que está despertando atenção</h3><p>Brasil · Google Trends · consultas programadas às 8h e 15h (Brasília).</p></header>
    <p className="trends-status">Última coleta válida: {stamp(data?.generatedAt)}{data?.generatedAt ? ' (Brasília)' : ''}</p>
    {(file.error || data?.stale || old) && <p role="status">Atualização indisponível ou atrasada. {data?.generatedAt ? 'Exibindo a última coleta válida, com a data original.' : 'Aguardando uma coleta válida.'}</p>}
    <h4>Em alta agora</h4>
    <p>Até três buscas do feed Em alta relacionadas aos temas comerciais. A seleção usa palavras do título; valide o contexto na fonte.</p>
    {!highlights.length && <p role="status">{file.status === 'loading' ? 'Carregando tendências…' : data?.generatedAt ? 'Nenhuma busca relacionada aos temas comerciais nesta coleta.' : 'Tendências ainda indisponíveis.'}</p>}
    <div className="trends-highlights">{highlights.map(i => <article key={i.title}><a href={exploreUrl([i.title], 'now 1-d')} target="_blank" rel="noopener noreferrer">{i.title} ↗</a><p>{i.traffic ? `${i.traffic} buscas aproximadas · ` : ''}{stamp(i.publishedAt)} (Brasília)</p><small>{i.groups.map(id => TREND_GROUPS.find(g => g.id === id)?.label).join(' · ')}</small></article>)}</div>
    <a href="https://trends.google.com/trending?geo=BR" target="_blank" rel="noopener noreferrer">Ver Em alta no Google Trends ↗</a>
    <h4>Temas acompanhados</h4>
    <div className="trends-groups" role="group" aria-label="Tema acompanhado">{TREND_GROUPS.map(g => <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>{g.label}</button>)}</div>
    <article className="trends-theme"><h4>{active.label}</h4><p>{active.terms.join(' · ')}</p>
      <label>Período <select value={period} onChange={e => setPeriod(e.target.value)}><option value="today 3-m">90 dias</option><option value="today 12-m">12 meses</option></select></label>
      <p>Brasil · Pesquisa na Web · Fonte: Google Trends Explore</p>
      {period === 'today 3-m' ? <HistoricalSnapshot group={group} /> : <p>Série de 12 meses disponível na fonte; sem snapshot local deste período.</p>}
      <a className="trends-chart-link" href={exploreUrl(active.terms, period)} target="_blank" rel="noopener noreferrer">Abrir gráfico no Google Trends ↗</a>
      <p className="trends-status">Série histórica consultada na fonte ao abrir o gráfico. A atualização das 8h e 15h abrange o feed Em alta; séries dos termos escolhidos ainda não têm coleta automática disponível neste painel.</p>
      <aside><strong>Hipótese para a conversa</strong><p>{active.question}</p><small>Interesse de busca não comprova demanda de crédito nem intenção de compra.</small></aside>
    </article>
    <details><summary>Como interpretar</summary><p>Explore mostra interesse relativo de 0 a 100 dentro do recorte. O feed Em alta traz buscas com aumento recente e volume aproximado, sem fornecer a série histórica dos temas escolhidos. O feed pode não conter nenhum dos temas acompanhados.</p></details>
  </section>
}
