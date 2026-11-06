import { PORTER_FORCES, SECTOR_PROFILES } from './sectorProfiles.js'
import './SectorProfile.css'

const editorialDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value.split('-').reverse().join('/') : 'não informada'

// Roteiro de investigação da atividade, não diagnóstico ou rating do cliente.
export default function SectorProfile({ id, label }) {
  const profile = SECTOR_PROFILES[id]
  if (!profile) return <p role="status">Ficha analítica ainda indisponível para este tema.</p>
  const prefix = `sector-profile-${id}`
  return (
    <section className="sector-profile" aria-labelledby={`${prefix}-title`}>
      <header className="sector-profile-header">
        <h3 id={`${prefix}-title`}>Preparar a visita · {label}</h3>
        <p className="setores-note">Revisão editorial: <time dateTime={profile.reviewedAt}>{editorialDate(profile.reviewedAt)}</time>. Esta data não é a data das notícias nem de indicadores.</p>
        <p><strong>Recorte analisado:</strong> {profile.scope}</p>
        {profile.scopeNote && <p>{profile.scopeNote}</p>}
        <p className="sector-profile-disclaimer">Hipóteses editoriais para validar na visita. Não constituem diagnóstico da empresa, classificação de risco, recomendação de crédito ou análise empírica concluída do setor.</p>
      </header>
      {profile.materialCuts?.length > 0 && <details aria-labelledby={`${prefix}-materials`}>
        <summary id={`${prefix}-materials`}>Materiais e elos: escolha o recorte</summary>
        <ul className="sector-profile-materials">{profile.materialCuts.map(material => <li key={material.id}><strong>{material.label}</strong><p>{material.scope}</p><p>{material.validation}</p></li>)}</ul>
      </details>}
      <div className="sector-profile-columns">
        <section aria-labelledby={`${prefix}-questions`}>
          <h4 id={`${prefix}-questions`}>Cinco perguntas específicas</h4>
          <ol className="sector-profile-questions">{profile.questions.map((question, index) => <li id={`${prefix}-question-${index + 1}`} tabIndex={-1} key={question}>{question}</li>)}</ol>
        </section>
        <section aria-labelledby={`${prefix}-sensitive`}>
          <h4 id={`${prefix}-sensitive`}>Pontos sensíveis a verificar</h4>
          <ul className="sector-profile-sensitive">{profile.sensitivePoints.map(point => <li key={point.id}><strong>{point.title}</strong><p>{point.signal}</p><button type="button" onClick={() => { const target = document.getElementById(`${prefix}-question-${point.questionIndex + 1}`); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'center' }) }}>Ver pergunta {point.questionIndex + 1}</button></li>)}</ul>
        </section>
      </div>
      {profile.criticalInputs?.length > 0 && <details aria-labelledby={`${prefix}-inputs`}>
        <summary id={`${prefix}-inputs`}>Insumos e serviços críticos</summary>
        <p className="setores-note">Verifique a aplicabilidade por material e etapa. Métricas para a visita, sem cotações ou valores estimados.</p>
        <ul className="sector-profile-inputs">{profile.criticalInputs.map(input => <li key={input.id}><strong>{input.label}</strong><p>{input.applicability}</p><p><strong>Medir:</strong> {input.metric}</p><p><strong>Limite:</strong> {input.limit}</p></li>)}</ul>
      </details>}
      <details className="sector-profile-forces">
        <summary>Cinco forças de Porter · aplicação ao recorte</summary>
        <p className="setores-note">Mecanismos qualitativos propostos para investigação, sem pontuação de intensidade. Regulação, juros, câmbio e clima são contexto, não uma sexta força.</p>
        <p className="setores-note">Produtos equivalentes, inclusive importados, disputam rivalidade. Substitutos atendem à mesma necessidade por uma solução fora do mercado delimitado. Poder de fornecedores exige um mecanismo de negociação ou dependência, não apenas um custo elevado.</p>
        <dl>{profile.forces.map(force => <div key={force.id}><dt>{PORTER_FORCES[force.id]}</dt><dd><p>{force.mechanism}</p><p><strong>Como validar:</strong> {force.validateWith}</p></dd></div>)}</dl>
      </details>
      <details className="sector-profile-sources">
        <summary>Fontes de contexto e limites da ficha</summary>
        <p className="setores-note">Referências para consulta e validação do recorte. Os links não comprovam, por si, as hipóteses acima e não significam que exista indicador atualizado para cada atividade.</p>
        <ul>{profile.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a> · {source.purpose}</li>)}</ul>
        <ul>{profile.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
        <p className="setores-note">Método: aplicação editorial própria das <a href="https://www.isc.hbs.edu/strategy/business-strategy/Pages/the-five-forces.aspx" target="_blank" rel="noopener noreferrer">cinco forças de Porter, descritas pela Harvard Business School</a>. Não há vínculo ou endosso institucional.</p>
      </details>
    </section>
  )
}
