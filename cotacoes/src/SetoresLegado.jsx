import HeavyVehicles from './HeavyVehicles.jsx'
import { Panel } from './TerminalDesk.jsx'
import SectorNews from './SectorNews.jsx'
import Estado from './Estado.jsx'
import { useDataFile } from './useDataFile.js'
import { INSUMOS, parseSetor } from './insumos.js'
import { dataTimestamp } from './dataTimestamp.js'
import { sectorItems, sectorSection } from './setoresNavigation.js'
import { resolveBankingTopic } from './bankingSectors.js'
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

// Aba Setores e Insumos: escolha Setores ou Insumos e depois o assunto e veja o que a imprensa publicou na semana, por dia; nos insumos, o preço e o que mexe nele.
export default function Setores({ view = '', quotes }) {
  const route = typeof view === 'string' ? view : ''
  const id = resolveBankingTopic(route) || parseSetor(route)
  const comm = useDataFile('commodities.json')
  const diario = useDataFile('insumos-precos.json')
  const insumo = INSUMOS.find((i) => i.id === id)
  const q = quotes?.USD, usd = q?.bid
  // O dólar da conversão pode ser a referência de reserva (BCE, dia anterior) ou a última cotação mantida quando a fonte falha: o texto diz qual é.
  const usdLabel = q?.fallback ? 'dólar de referência (dia anterior)' : q?.stale ? 'última cotação do dólar disponível' : 'dólar de hoje'
  const itens = insumo ? (comm.data?.commodities ?? []).filter((c) => insumo.commodity.includes(c.id) && Number.isFinite(c.value)) : []
  const serie = insumo?.daily ? diario.data?.series?.[insumo.daily] : null
  const secao = sectorSection(id)
  const current = sectorItems(secao).find(item => item.id === id)
  return (
    <div className="setores">
      <Panel title={current?.label ?? insumo?.label ?? 'Conteúdo setorial'} refresh={id==='veiculos-pesados' ? ['sector-news.json','heavy-vehicles.json'] : secao === 'insumos' ? ['sector-news.json', 'commodities.json', 'insumos-precos.json'] : ['sector-news.json']}>
        {id==='veiculos-pesados' && <HeavyVehicles/>}
        {insumo && (
          <div className="setor-insumo">
            {itens.length > 0 ? itens.map((c) => <Preco key={c.id} item={c} usd={usd} usdLabel={usdLabel} diario={serie} />) : comm.status === 'loading' ? <Estado>Carregando o preço…</Estado> : <Estado tipo="aviso">{insumo.id === 'aco' ? 'O aço não tem série de preço pública diária neste painel; acompanhe pelas matérias e pelo minério de ferro.' : 'Preço indisponível no momento.'}</Estado>}
          </div>
        )}
        <SectorNews key={`news-${id}`} id={id} label={current?.label ?? insumo?.label ?? id} />
      </Panel>

    </div>
  )
}
