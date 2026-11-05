import HeavyVehicles from './HeavyVehicles.jsx'
import { useEffect, useMemo, useRef } from 'react'
import { Panel } from './TerminalDesk.jsx'
import NoticiasPorDia from './NoticiasPorDia.jsx'
import Estado from './Estado.jsx'
import { useDataFile } from './useDataFile.js'
import { normalizeTemas } from './reforma.js'
import { INSUMOS, parseSetor } from './insumos.js'
import { dataTimestamp } from './dataTimestamp.js'
import { readSectorMemory, writeSectorMemory, sectorItems, sectorGroups, sectorSection, rememberSector, rememberedSector } from './setoresNavigation.js'
import SetoresB3 from './SetoresB3.jsx'
import { resolveBankingTopic, BANKING_VISIT_QUESTIONS } from './bankingSectors.js'
import { b3SectorFromRoute } from './b3Classification.js'
import './Setores.css'

const num = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}%`
const unitBr = (u) => ({ 'USD/tonelada': 'R$/tonelada', 'USD/tonelada seca': 'R$/tonelada seca', 'USD/barril': 'R$/barril', 'USD/galão': 'R$/galão' })[u]

// Cartão de preço do insumo: valor em US$ (e em R$ pelo dólar de hoje) e a variação sobre a observação anterior.
function Preco({ item, usd, usdLabel, diario }) {
  const brl = unitBr(item.unit) && usd ? item.value * usd : null
  const d = item.decimals ?? 2
  return (
    <div className="setor-preco">
      <b>{item.label}</b> <small className="muted">{item.nature} · {item.benchmark}</small>
      <p className="setor-valor">{num(item.value, d)} <small>{item.unit}</small>{item.variationPct != null && <span className={`pct ${item.variationPct > 0 ? 'up' : item.variationPct < 0 ? 'down' : 'flat'}`}> {pct(item.variationPct)} <small className="muted">({item.variationBasis})</small></span>}</p>
      {brl != null && <p className="muted">≈ R$ {num(brl, 0)} {unitBr(item.unit).replace('R$', '')} · {usdLabel} R$ {num(usd, 4)}. Conversão simples, sem prêmio, frete nem impostos.</p>}
      {item.stale && <Estado tipo="aviso">Fonte sem atualização na última coleta; mantido o último preço publicado.</Estado>}
      <small className="muted">Referência de {item.period.split('-').reverse().join('/')} · coletado em {dataTimestamp(item.checkedAt)}</small>
      {diario?.stale && <Estado tipo="aviso">Preço diário sem atualização na última coleta; mantido o último fechamento.</Estado>}
      {diario && <p className="muted">Preço diário aproximado (contrato futuro COMEX, atrasado e não oficial): <b>{num(diario.points.at(-1)[1], 0)} {diario.unit}</b> em {new Date(diario.points.at(-1)[0]).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.</p>}
    </div>
  )
}

// Aba Setores e Insumos: escolha Setores ou Insumos e depois o assunto e veja o que a imprensa publicou na semana, por dia; nos insumos, o preço, o que mexe nele e a ficha da visita.
export default function Setores({ view = '', onView = () => {}, quotes }) {
  const memory = useRef(null)
  if (!memory.current) memory.current = readSectorMemory({getItem: key => sessionStorage.getItem(key)})
  const route = typeof view==='string'&&view ? view : typeof memory.current.active==='string' ? memory.current.active : ''
  const rememberedB3 = typeof memory.current.b3==='string' && (memory.current.b3==='b3'||b3SectorFromRoute(memory.current.b3)) ? memory.current.b3 : 'b3'
  const isB3 = route === 'b3' || route.startsWith('b3/')
  const b3Sector = b3SectorFromRoute(route)
  const id = resolveBankingTopic(route) || parseSetor(route)
  const temas = useDataFile('temas.json')
  const comm = useDataFile('commodities.json')
  const diario = useDataFile('insumos-precos.json')
  const todos = useMemo(() => { try { return temas.data ? normalizeTemas(temas.data) : {} } catch { return {} } }, [temas.data])
  const insumo = INSUMOS.find((i) => i.id === id)
  const tema = todos[id]
  const q = quotes?.USD, usd = q?.bid
  // O dólar da conversão pode ser a referência de reserva (BCE, dia anterior) ou a última cotação mantida quando a fonte falha: o texto diz qual é.
  const usdLabel = q?.fallback ? 'dólar de referência (dia anterior)' : q?.stale ? 'última cotação do dólar disponível' : 'dólar de hoje'
  const itens = insumo ? (comm.data?.commodities ?? []).filter((c) => insumo.commodity.includes(c.id) && Number.isFinite(c.value)) : []
  const serie = insumo?.daily ? diario.data?.series?.[insumo.daily] : null
  const secao = isB3 ? 'setores' : sectorSection(id)
  const current = sectorItems(secao).find(item => item.id === id)
  const group = current?.grupo
  const tabs = sectorItems(secao).filter(item => item.grupo === group).map(item => ({id:item.id,label:item.label}))
  useEffect(() => {
    memory.current = isB3 ? {...memory.current,active:route,b3:route,mode:'b3'} : {...rememberSector(memory.current,id),...(secao==='setores'?{mode:'editorial'}:{})}
    writeSectorMemory({setItem:(key,value)=>sessionStorage.setItem(key,value)},memory.current)
  },[id,isB3,secao,route])
  const path = isB3 ? ['Setores','Referência B3',...(b3Sector?[b3Sector.label]:[])] : [secao==='insumos'?'Insumos':'Setores',...(secao==='setores'?['Visão bancária']:[]),group,current?.label]
  return (
    <div className="setores">
      <nav className="setores-choices setores-secao" aria-label="Setores ou insumos">
        {['setores','insumos'].map(section => <button key={section} type="button" aria-pressed={secao===section} onClick={()=>secao!==section && onView(section==='setores'&&memory.current.mode==='b3'?rememberedB3:rememberedSector(memory.current,section))}>{section==='setores'?'Setores':'Insumos'}</button>)}
      </nav>
      {secao==='setores' && <nav className="setores-choices" aria-label="Organização dos setores"><button type="button" aria-pressed={!isB3} onClick={()=>isB3&&onView(rememberedSector(memory.current,'setores'))}>Visão bancária</button><button type="button" aria-pressed={isB3} onClick={()=>!isB3&&onView(rememberedB3)}>Referência B3</button></nav>}
      {!isB3 && <section className="setores-level" aria-labelledby="setores-group-title"><h2 id="setores-group-title">{secao==='setores'?'Grupos editoriais':'Grupos de insumos'}</h2><nav className="setores-choices" aria-label={secao==='setores'?'Grupos editoriais':'Grupos de insumos'}>{sectorGroups(secao).map(name=><button key={name} type="button" aria-pressed={group===name} onClick={()=>group!==name&&onView(rememberedSector(memory.current,secao,name))}>{name}</button>)}</nav></section>}
      <nav className="setores-path" aria-label="Caminho selecionado"><ol>{path.map((label,index)=><li key={index} aria-current={index===path.length-1?'page':undefined}>{label}</li>)}</ol></nav>
      {isB3 ? <SetoresB3 selected={b3Sector} onSelect={sector=>onView('b3/'+sector)}/> : <>
      {secao==='setores'&&<p className="setores-note">Proposta editorial para atendimento a empresas brasileiras, inclusive não listadas. Grupos e atividades não constituem uma classificação oficial nem uma cobertura completa da economia. A B3 é uma referência, sem correspondência automática entre categorias.</p>}
      <Panel title={secao === 'insumos' ? 'Insumos: '+group : 'Temas: '+group} tabs={tabs} tab={id} onTab={(t) => onView(t)} refresh={secao==='setores'&&current?.available===false ? undefined : id==='veiculos-pesados' ? ['temas.json','heavy-vehicles.json'] : secao === 'insumos' ? ['temas.json', 'commodities.json', 'insumos-precos.json'] : ['temas.json']}>
        {secao==='setores' && current?.available===false && <section className="setores-coverage" aria-label="Cobertura deste tema"><Estado tipo="aviso">Indicadores e notícias específicos deste tema ainda não estão integrados. Esta categoria organiza a navegação; não representa uma série estatística disponível.</Estado><h3>Perguntas para preparar a visita</h3><p className="setores-note">Roteiro geral de atendimento PJ; precisa ser adaptado à atividade e ao caso da empresa.</p><ul>{BANKING_VISIT_QUESTIONS.map(question=><li key={question}>{question}</li>)}</ul></section>}
        {id==='veiculos-pesados' && <><HeavyVehicles/><div className="setor-cols"><section aria-label="O que move o setor"><h3>O que move o setor</h3><ul><li>Frete, utilização da frota, safra, infraestrutura e atividade econômica.</li><li>Juros, prazo de financiamento, diesel, manutenção e câmbio dos componentes.</li><li>Renovação da frota, encomendas de ônibus e regras de emissões.</li></ul></section><section aria-label="Ficha da visita"><h3>Ficha da visita</h3><ul><li>A compra amplia a frota ou substitui veículos? Qual a utilização e a receita por veículo?</li><li>Qual a necessidade de entrada, carência, prazo e capital de giro até o veículo gerar caixa?</li><li>Como diesel, manutenção, seguro e reajustes do frete afetam a margem?</li></ul></section></div></>}
        {insumo && (
          <div className="setor-insumo">
            {itens.length > 0 ? itens.map((c) => <Preco key={c.id} item={c} usd={usd} usdLabel={usdLabel} diario={serie} />) : comm.status === 'loading' ? <Estado>Carregando o preço…</Estado> : <Estado tipo="aviso">{insumo.id === 'aco' ? 'O aço não tem série de preço pública diária neste painel; acompanhe pelas matérias e pelo minério de ferro.' : 'Preço indisponível no momento.'}</Estado>}
            <div className="setor-cols">
              <section aria-label="O que mexe no preço"><h3>O que mexe no preço</h3><ul>{insumo.move.map((m) => <li key={m}>{m}</li>)}</ul></section>
              <section aria-label="Ficha da visita"><h3>Ficha da visita</h3><ul>{insumo.visita.map((m) => <li key={m}>{m}</li>)}</ul></section>
            </div>
          </div>
        )}
        {current?.available!==false && temas.status === 'loading' && <Estado>Carregando as matérias…</Estado>}
        {current?.available!==false && temas.status === 'error' && !tema && <Estado tipo="erro" erro={temas.error}>Matérias indisponíveis no momento.</Estado>}
        {tema && <NoticiasPorDia key={id} data={tema} ariaLabel={`${tema.label}: matérias da semana`} />}
        {current?.available!==false && temas.data && !tema && temas.status !== 'loading' && <Estado>Ainda não há matérias coletadas para este assunto.</Estado>}
      </Panel>
      </>}
    </div>
  )
}
