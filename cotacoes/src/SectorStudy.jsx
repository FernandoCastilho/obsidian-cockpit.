import { useState } from 'react'
import { TIC_STUDY } from './ticStudy.js'
import { TIC_CANVAS_QUESTIONS } from './ticCanvasQuestions.js'
import './SectorStudy.css'
import TechnologyIntegrationDiagram from './TechnologyIntegrationDiagram.jsx'
import { publicAgencySources } from './sectorSourceVisibility.js'
import SectorPodcast from './SectorPodcast.jsx'

const link = source => <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>

function StudyChart({ chart }) {
  const [seriesIndex, setSeriesIndex] = useState(0)
  const series = chart.series[seriesIndex]
  const max = chart.max || Math.ceil(Math.max(...series.values) * 1.15)
  return <section className="study-chart" aria-labelledby={`chart-${chart.id}`}>
    <h4 id={`chart-${chart.id}`}>{chart.title}</h4>
    {chart.series.length > 1 && <label>Série<select value={seriesIndex} onChange={event => setSeriesIndex(Number(event.target.value))}>{chart.series.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}</select></label>}
    <p>{series.label} · {chart.unit}. {chart.scope}</p>
    <div className="study-bars" role="img" aria-label={`${chart.title}. ${series.label}. Valores na tabela abaixo.`}>{chart.years.map((year, index) => <div className="study-bar-row" key={year}><span>{year}</span><span className="study-bar-track"><span className="study-bar" style={{ width: `${series.values[index] / max * 100}%` }} /></span><strong>{series.values[index].toLocaleString('pt-BR')}</strong></div>)}</div>
    <details><summary>Ver todos os dados e método</summary><div className="study-table-wrap"><table><caption>{chart.title} · {chart.unit}</caption><thead><tr><th scope="col">Ano</th>{chart.series.map(item => <th scope="col" key={item.label}>{item.label}</th>)}</tr></thead><tbody>{chart.years.map((year, index) => <tr key={year}><th scope="row">{year}</th>{chart.series.map(item => <td key={item.label}>{item.values[index].toLocaleString('pt-BR')}</td>)}</tr>)}</tbody></table></div><p>{chart.method}</p></details>
    <p className="central-note">{publicAgencySources([chart.source]).length > 0 && <>Fonte: {link(chart.source)} · </>}Referência: {chart.period} · consulta: 06/11/2026.</p>
  </section>
}

export default function SectorStudy() {
  const study = TIC_STUDY
  return <article className="sector-study" aria-labelledby="tic-study-title">
    <p className="central-kicker">ESTUDO SETORIAL · TIC</p><h3 id="tic-study-title">{study.title}</h3>
    <p className="central-note">Pesquisa pública revisada em <time dateTime="2026-11-06">06/11/2026</time>. Dados têm períodos próprios; atualização não é automática.</p>
    <div className="study-callout"><h4>Resumo executivo</h4>{study.summary.map(text => <p key={text}>{text}</p>)}</div>
    <aside className="study-callout study-canvas-callout" aria-labelledby="tic-canvas-title">
      <p className="central-kicker">CONVERSA COM A EMPRESA · INTEGRAÇÃO DE TI</p>
      <h4 id="tic-canvas-title">6 perguntas-chave para conhecer o negócio</h4>
      <p className="study-canvas-intro">Roteiro inspirado no Business Model Canvas. Peça números e um contrato real para sustentar as respostas.</p>
      <ol className="study-canvas-questions">{TIC_CANVAS_QUESTIONS.map(item => <li key={item.dimension}><strong>{item.dimension}</strong><p>{item.question}</p></li>)}</ol>
    </aside>
    <SectorPodcast />
    <nav className="study-nav" aria-label="Capítulos do estudo">{study.sections.map(section => <button type="button" key={section.id} onClick={() => { const target = document.getElementById(`tic-${section.id}`); if (target) { target.open = true; target.querySelector('summary')?.focus({ preventScroll: true }); target.scrollIntoView({ block: 'start' }) } }}>{section.title}</button>)}</nav>
    {study.sections.map(section => <details className="study-section" id={`tic-${section.id}`} key={section.id} open={section.id === 'negocio' || section.id === 'indicadores' || undefined}><summary>{section.title}</summary>{section.id === 'negocio' && <TechnologyIntegrationDiagram />}{section.paragraphs?.map(text => <p key={text}>{text}</p>)}{section.rows && <div className="study-table-wrap"><table><caption>{section.tableTitle || section.title}</caption><thead><tr>{section.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{section.rows.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div>}{section.bullets && <ul>{section.bullets.map(text => <li key={text}>{text}</li>)}</ul>}{section.id === 'indicadores' && study.charts.map(chart => <StudyChart key={chart.id} chart={chart} />)}{publicAgencySources(section.sources).length > 0 && <p className="central-note">Fontes: {publicAgencySources(section.sources).map((source, index) => <span key={source.url}>{index > 0 ? ' · ' : ''}{link(source)}</span>)}</p>}</details>)}
    <details className="study-section"><summary>Fontes, método e limitações</summary><p>{study.method}</p><ul>{publicAgencySources(study.sources).map(source => <li key={source.url}>{link(source)} — {source.purpose}</li>)}</ul><ul>{study.limitations.map(text => <li key={text}>{text}</li>)}</ul></details>
  </article>
}
