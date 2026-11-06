import HeavyVehicles from './HeavyVehicles.jsx'
import { Panel } from './TerminalDesk.jsx'
import SectorNews from './SectorNews.jsx'
import Estado from './Estado.jsx'
import { useDataFile } from './useDataFile.js'
import { INSUMOS, parseSetor } from './insumos.js'
import { latestDailyPoint, referencePeriod } from './insumoPresentation.js'
import { sectorItems, sectorSection } from './setoresNavigation.js'
import { resolveBankingTopic } from './bankingSectors.js'
import './Setores.css'

const num = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}%`
const unitBr = (u) => ({ 'USD/tonelada': 'R$/tonelada', 'USD/tonelada seca': 'R$/tonelada seca', 'USD/barril': 'R$/barril', 'USD/galão': 'R$/galão' })[u]

// Cartão de preço do insumo: valor em US$ (e em R$ pelo dólar de hoje) e a variação sobre a observação anterior.
function Preco({ item, usd, usdLabel }) {
  const brl = unitBr(item.unit) && Number.isFinite(usd) && usd > 0 ? item.value * usd : null
  const d = item.decimals ?? 2
  return (
    <div className="setor-preco">
      <b>{item.label}</b> <small className="muted">{item.nature} · {item.benchmark}</small>
      <p className="setor-valor">{num(item.value, d)} <small>{item.unit}</small>{item.variationPct != null && <span className={`pct ${item.variationPct > 0 ? 'up' : item.variationPct < 0 ? 'down' : 'flat'}`}> {pct(item.variationPct)} <small className="muted">({item.variationBasis})</small></span>}</p>
      {brl != null && <p className="muted">≈ R$ {num(brl, 0)} {unitBr(item.unit).replace('R$', '')} · {usdLabel} R$ {num(usd, 4)}. Conversão simples, sem prêmio, frete nem impostos.</p>}
      <small className="muted">Referência: {referencePeriod(item.period)}{item.stale ? ' · última referência disponível' : ''}</small>

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
  const usdLabel = q?.fallback ? 'dólar de referência (dia anterior)' : q?.stale ? 'última cotação do dólar disponível' : 'dólar disponível no painel'
  const itens = insumo ? (comm.data?.commodities ?? []).filter((c) => insumo.commodity.includes(c.id) && Number.isFinite(c.value)) : []
  const serie = insumo?.daily ? diario.data?.series?.[insumo.daily] : null
  const dailyPoint = latestDailyPoint(serie)
  const missingPrices = insumo?.commodity.filter(key => !itens.some(item => item.id === key)) ?? []
  const secao = sectorSection(id)
  const current = sectorItems(secao).find(item => item.id === id)
  return (
    <div className="setores">
      <Panel title={current?.label ?? insumo?.label ?? 'Conteúdo setorial'} refresh={id==='veiculos-pesados' ? ['sector-news.json','heavy-vehicles.json'] : secao === 'insumos' ? ['sector-news.json', 'commodities.json', 'insumos-precos.json'] : ['sector-news.json']}>
        {id==='veiculos-pesados' && <HeavyVehicles/>}
        {insumo && (
          <div className="setor-insumo">
            <p className="setores-note">Referências de mercado para acompanhar {insumo.label.toLowerCase()}. Compare período, unidade e especificação antes de avaliar o custo de compra.</p>
            <section aria-labelledby={`insumo-precos-${id}`}>
              <h3 id={`insumo-precos-${id}`}>Cotações e referências</h3>
              <div className="insumo-precos-grid">
                {dailyPoint && <div className="setor-preco"><b>Cobre · referência diária</b><p className="setor-valor">{num(dailyPoint[1], 0)} <small>{serie.unit}</small></p><p className="setores-note">Contrato futuro COMEX. Valor aproximado, atrasado e não oficial; não é preço de compra à vista.</p><small className="muted">Referência: {new Date(dailyPoint[0]).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{serie.stale ? ' · último fechamento disponível' : ''}</small></div>}
                {itens.map(c => <Preco key={c.id} item={c} usd={usd} usdLabel={usdLabel} />)}
              </div>
              {comm.status === 'loading' && !itens.length && !dailyPoint ? <Estado>Carregando cotações…</Estado> : missingPrices.length > 0 && <p className="setores-note" role="status">{insumo.id === 'petroleo' ? `Referência de ${missingPrices.length > 1 ? 'WTI e diesel' : missingPrices.includes('wti') ? 'WTI' : 'diesel'} ainda não disponível no painel.` : !itens.length && !dailyPoint ? 'Cotação ainda não disponível no painel.' : 'Referência mensal ainda não disponível no painel.'}</p>}
              {insumo.id === 'aco' && <p className="setores-note">O preço do aço depende do produto, da especificação e da negociação. Este painel ainda não tem uma série comparável; o minério de ferro não substitui a cotação do aço.</p>}
              {(itens.length > 0 || dailyPoint) && <p className="setores-note">Cada valor mantém sua data de referência. Médias mensais e fechamentos anteriores não representam uma cotação em tempo real.</p>}
              {comm.stale && <p className="setores-note" role="status">Exibindo as últimas referências disponíveis.</p>}
            </section>
            <section className="insumo-drivers" aria-labelledby={`insumo-drivers-${id}`}><h3 id={`insumo-drivers-${id}`}>O que influencia a cotação</h3><ul>{insumo.move.map(text => <li key={text}>{text}</li>)}</ul></section>
          </div>
        )}
        <SectorNews key={`news-${id}`} id={id} label={current?.label ?? insumo?.label ?? id} insumo={Boolean(insumo)} />
      </Panel>

    </div>
  )
}
