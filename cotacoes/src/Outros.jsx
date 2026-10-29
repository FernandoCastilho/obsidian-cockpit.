import { useMemo, useState } from 'react'
import { Aviso } from './Avisos.jsx'
import IndicatorHistory from './IndicatorHistory.jsx'
import InflacaoPesos from './InflacaoPesos.jsx'
import IndicatorTable from './IndicatorTable.jsx'
import RefreshButton from './RefreshButton.jsx'
import { useDataFile } from './useDataFile.js'
import { IPCA_METRICS, ipcaRows, ipcaSeries, normalizeIpca } from './ipca.js'

const nf = (v, d) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const sgn = (v, d, unit = '') => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d) + unit
const monthName = (period) => new Date(`${period}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '')

// Cenários › Outros: quadro de indicadores que não cabem nos demais assuntos. Hoje: IPCA oficial do IBGE, com o histórico completo.
export default function Outros({ macro }) {
  const file = useDataFile('ipca.json')
  const parsed = useMemo(() => { try { return file.data ? normalizeIpca(file.data) : null } catch { return null } }, [file.data])
  const rows = useMemo(() => (parsed ? ipcaRows(parsed) : []), [parsed])
  const [openId, setOpenId] = useState(null)
  const row = rows.find((r) => r.metric.id === openId)
  const failed = file.status === 'error' || (file.status === 'ok' && !parsed)
  const fmt = (r, v) => nf(v, r.metric.decimals)
  const tableRows = rows.map((r) => {
    const pct = r.metric.rate
    return {
      id: r.metric.id, flag: 'BRL', name: r.metric.label, sub: pct ? 'IPCA · IBGE' : 'IPCA · IBGE · base dez/1993',
      cells: [
        { text: r.last ? `${fmt(r, r.last.value)}${pct ? '%' : ''}` : '—' },
        { text: r.prev ? `${fmt(r, r.prev.value)}${pct ? '%' : ''}` : '—' },
        r.delta == null ? { text: '—' } : pct ? { text: sgn(r.delta, 2, ' p.p.') } : { text: sgn(r.pct, 2, '%') },
        { text: r.yearAgo ? `${fmt(r, r.yearAgo.value)}${pct ? '%' : ''}` : '—' },
        { text: r.last ? monthName(r.last.period) : '—' },
      ],
    }
  })
  return (
    <div className="outros" aria-labelledby="outros-title" role="region">
      <div className="ctx-head"><h2 id="outros-title">Outros</h2><RefreshButton files={['ipca.json', 'ipca-groups.json', 'oil.json', 'commodities.json', 'macro.json']} label="Inflação" /></div>
      <h3>Inflação · IPCA</h3>
      {!parsed && <p role="status">{failed ? 'Não foi possível carregar o IPCA. Tente novamente mais tarde.' : 'Carregando IPCA…'}</p>}
      {parsed && (
        <>
          <IndicatorTable
            caption={`IPCA oficial · último mês divulgado: ${rows[0]?.last ? monthName(rows[0].last.period) : '—'}`}
            ariaLabel="Tabela do IPCA; role para ver todas as colunas"
            columns={[{ label: 'Último' }, { label: 'Mês anterior' }, { label: 'Variação', small: '(vs mês ant.)' }, { label: 'Ano anterior', small: '(mesmo mês)' }, { label: 'Referência' }]}
            rows={tableRows}
            onOpen={setOpenId}
          />
          {parsed.stale && <p className="status stale" role="status">Última série disponível; a atualização do IBGE não foi confirmada.</p>}
          <Aviso title="IPCA · fonte e método"><p className="ind-note">IPCA do IBGE (Sistema Nacional de Índices de Preços ao Consumidor Amplo), tabela 1737 do SIDRA, série completa desde dez/1979. Variação mensal, acumulados no ano e em 12 meses e número-índice (dez/1993 = 100) são os valores divulgados pelo IBGE, sem recálculo. Em Variação, os percentuais são diferença em pontos percentuais; no número-índice, variação relativa. Conferência: {new Date(parsed.checkedAt).toLocaleDateString('pt-BR')}. <a href={parsed.sourceUrl} target="_blank" rel="noopener noreferrer">Fonte: IBGE ↗</a></p></Aviso>
        </>
      )}
      <InflacaoPesos macro={macro} />
      {row && (
        <IndicatorHistory
          item={{ id: row.metric.id, label: `IPCA · ${row.metric.label}`, unit: row.metric.unit, decimals: row.metric.decimals, sourceUrl: parsed.sourceUrl, sourceName: parsed.sourceName, checkedAt: parsed.checkedAt }}
          series={{ id: row.metric.id, unit: row.metric.unit, frequency: 'monthly', points: ipcaSeries(parsed, row.metric), sourceName: parsed.sourceName, sourceUrl: parsed.sourceUrl, checkedAt: parsed.checkedAt, revisionNote: 'O IBGE pode revisar divulgações anteriores em casos excepcionais; o painel mostra o que está na tabela 1737 do SIDRA.' }}
          failed={!!parsed.stale}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}
