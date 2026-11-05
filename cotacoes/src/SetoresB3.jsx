import { B3_CLASSIFICATION, B3_SECTORS } from './b3Classification.js'

export default function SetoresB3({ selected, onSelect }) {
  return <section className="desk-panel setores-b3" aria-labelledby="setores-b3-title">
    <header><h2 id="setores-b3-title">B3: referência e cobertura</h2></header>
    <div className="desk-panel-body">
      <p>A classificação das empresas listadas segue <strong>Setor → Subsetor → Segmento</strong>. Os 11 setores econômicos abaixo foram conferidos em fontes oficiais; a árvore integral vigente de subsetores e segmentos ainda não foi validada.</p>
      <nav className="setores-choices setores-b3-list" aria-label="Setores econômicos da B3">{B3_SECTORS.map(sector=><button key={sector.id} type="button" aria-pressed={selected?.id===sector.id} onClick={()=>onSelect(sector.id)}>{sector.label}</button>)}</nav>
      {selected && <section className="setores-b3-detail" aria-labelledby="setores-b3-selected"><h3 id="setores-b3-selected">{selected.label}</h3><p><strong>Nível: setor econômico.</strong> Subsetores e segmentos: ainda não incorporados; não se presume uma lista vazia ou completa.</p><p role="status">Indicadores e notícias específicos desta categoria B3 ainda não estão integrados ao painel. Os atalhos editoriais continuam disponíveis em Visão bancária.</p></section>}
      <p>Veículos pesados e os demais temas atuais são atalhos editoriais, sem correspondência automática com os ramos oficiais da bolsa. A classificação B3 não cobre toda a economia nem é uma lista de índices ou de segmentos de governança.</p>
      <details><summary>Fonte, data e cobertura</summary><p><a href={B3_CLASSIFICATION.criteriaUrl} target="_blank" rel="noreferrer">B3: critério de classificação</a> · <a href={B3_CLASSIFICATION.sourceUrl} target="_blank" rel="noreferrer">B3: consulta de classificação setorial</a>.</p><p>Nomes dos setores conferidos em 05/11/2026. Esta data é de conferência, não uma data de vigência informada pela B3. A consulta oficial informa atualização semanal; a lista deste painel não recebe atualização automática. Cobertura: nomes dos setores econômicos, sem emissores, subsetores, segmentos ou indicadores associados.</p></details>
    </div>
  </section>
}
