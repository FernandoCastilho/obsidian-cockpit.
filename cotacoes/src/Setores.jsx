import { useMemo } from 'react'
import { Panel } from './TerminalDesk.jsx'
import NoticiasPorDia from './NoticiasPorDia.jsx'
import Estado from './Estado.jsx'
import { useDataFile } from './useDataFile.js'
import { normalizeTemas } from './reforma.js'
import { INSUMOS, SETORES, parseSetor } from './insumos.js'
import { dataTimestamp } from './dataTimestamp.js'

const num = (v, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}%`
const unitBr = (u) => ({ 'USD/tonelada': 'R$/tonelada', 'USD/tonelada seca': 'R$/tonelada seca', 'USD/barril': 'R$/barril', 'USD/galão': 'R$/galão' })[u]

// Cartão de preço do insumo: valor em US$ (e em R$ pelo dólar de hoje) e a variação sobre a observação anterior.
function Preco({ item, usd, diario }) {
  const brl = unitBr(item.unit) && usd ? item.value * usd : null
  const d = item.decimals ?? 2
  return (
    <div className="setor-preco">
      <b>{item.label}</b> <small className="muted">{item.nature} · {item.benchmark}</small>
      <p className="setor-valor">{num(item.value, d)} <small>{item.unit}</small>{item.variationPct != null && <span className={`pct ${item.variationPct > 0 ? 'up' : item.variationPct < 0 ? 'down' : 'flat'}`}> {pct(item.variationPct)} <small className="muted">({item.variationBasis})</small></span>}</p>
      {brl != null && <p className="muted">≈ R$ {num(brl, 0)} {unitBr(item.unit).replace('R$', '')} · dólar de hoje R$ {num(usd, 4)}. Conversão simples, sem prêmio, frete nem impostos.</p>}
      <small className="muted">Referência de {item.period.split('-').reverse().join('/')} · coletado em {dataTimestamp(item.checkedAt)}</small>
      {diario && <p className="muted">Preço diário aproximado (contrato futuro COMEX, atrasado e não oficial): <b>{num(diario.points.at(-1)[1], 0)} {diario.unit}</b> em {new Date(diario.points.at(-1)[0]).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.</p>}
    </div>
  )
}

// Aba Setores: escolha um setor ou insumo e veja o que a imprensa publicou na semana, por dia; nos insumos, o preço, o que mexe nele e a ficha da visita.
export default function Setores({ view = '', onView = () => {}, quotes }) {
  const id = parseSetor(view)
  const temas = useDataFile('temas.json')
  const comm = useDataFile('commodities.json')
  const diario = useDataFile('insumos-precos.json')
  const todos = useMemo(() => { try { return temas.data ? normalizeTemas(temas.data) : {} } catch { return {} } }, [temas.data])
  const insumo = INSUMOS.find((i) => i.id === id)
  const tema = todos[id]
  const usd = quotes?.USD?.bid
  const itens = insumo ? (comm.data?.commodities ?? []).filter((c) => insumo.commodity.includes(c.id) && Number.isFinite(c.value)) : []
  const serie = insumo?.daily ? diario.data?.series?.[insumo.daily] : null
  const tabs = [...SETORES.map((t) => ({ id: t.id, label: t.label, grupo: 'Setores' })), ...INSUMOS.map((t) => ({ id: t.id, label: t.label, grupo: 'Insumos' }))]
  return (
    <div className="setores">
      <Panel title="Setores e insumos" tabs={tabs} tab={id} onTab={(t) => onView(t)} refresh={['temas.json', 'commodities.json', 'insumos-precos.json']}>
        {insumo && (
          <div className="setor-insumo">
            {itens.length > 0 ? itens.map((c) => <Preco key={c.id} item={c} usd={usd} diario={serie} />) : <Estado tipo="aviso">{insumo.id === 'aco' ? 'O aço não tem série de preço pública diária neste painel; acompanhe pelas matérias e pelo minério de ferro.' : 'Preço indisponível no momento.'}</Estado>}
            <div className="setor-cols">
              <section aria-label="O que mexe no preço"><h3>O que mexe no preço</h3><ul>{insumo.move.map((m) => <li key={m}>{m}</li>)}</ul></section>
              <section aria-label="Ficha da visita"><h3>Ficha da visita</h3><ul>{insumo.visita.map((m) => <li key={m}>{m}</li>)}</ul></section>
            </div>
          </div>
        )}
        {temas.status === 'loading' && <Estado>Carregando as matérias…</Estado>}
        {temas.status === 'error' && !tema && <Estado tipo="erro" erro={temas.error}>Matérias indisponíveis no momento.</Estado>}
        {tema && <NoticiasPorDia data={tema} ariaLabel={`${tema.label}: matérias da semana`} />}
        {temas.data && !tema && temas.status !== 'loading' && <Estado>Ainda não há matérias coletadas para este assunto.</Estado>}
      </Panel>
    </div>
  )
}
