import { useMemo } from 'react'
import { Aviso } from './Avisos.jsx'
import { FilterScope } from './ChartFilters.jsx'
import SeriesChart from './BndesChart.jsx'
import { Panel } from './TerminalDesk.jsx'
import { useDataFile } from './useDataFile.js'
import { useCurves } from './useCurves.js'
import { dmy } from './bndes.js'
import { FAMILIES, familyRows, seriesFor } from './bndesView.js'
import { buildRoute, parseRoute } from './bndesRoute.js'
import './Bndes.css'

const stamp = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const Delta = ({ c }) => (c ? <><span className={`bn-delta bn-${c.dir}`} title={`em relação a ${dmy(c.ref)}`}>{c.text}</span>{c.jump && <span className="bn-jump" role="img" aria-label={`salto: ${c.hint}`} title={c.hint}>salto</span>}</> : <span className="muted">—</span>)

// Cartões do topo: "como está hoje" em poucos segundos; tocar leva ao histórico da série.
const CSV = [['tfb.csv', 'TFB (8 séries)'], ['tlp.csv', 'TLP'], ['tfc.csv', 'TFC (24 séries)'], ['moedas.csv', 'Moedas contratuais']]
const CARDS = [['tfb', 'TFB_60_90', 'TFB 60 meses · 90 dias', 'day'], ['tlp', 'TLP', 'TLP', 'month'], ['tfc', 'C01', 'TFC_60.90', 'day'], ['moedas', '604', 'Dólar contratual', 'day']]

// Aba BNDES: uma só área de trabalho. Abas por família (TFB, TLP, TFC, Moedas) escolhem a tabela; clicar numa linha ou num cartão troca a série
// do gráfico; o período (atalhos e datas) é único e vale para todas as séries; as observações ficam recolhidas. Tudo mora no endereço
// (#bndes/<família>/<série>?p=<período>), então dá para copiar o link e abrir igual em outro lugar.
export default function Bndes({ view = '', onView = () => {} }) {
  const bndes = useDataFile('bndes.json')
  const moedas = useDataFile('moedas.json')
  const curves = useCurves()
  const br = curves.data?.br ?? null
  const rowsByFamily = useMemo(() => Object.fromEntries(FAMILIES.map((f) => [f.id, familyRows(f.id, bndes.data, moedas.data, Date.now(), br)])), [bndes.data, moedas.data, br])
  const ids = useMemo(() => Object.fromEntries(FAMILIES.map((f) => [f.id, rowsByFamily[f.id].map((r) => r.id)])), [rowsByFamily])
  const route = parseRoute(view, ids)
  const { family, id, preset, custom } = route
  const go = (patch, replace = false) => onView(buildRoute({ ...route, ...patch }), replace)
  const fam = FAMILIES.find((f) => f.id === family)
  const rows = rowsByFamily[family]
  const series = useMemo(() => seriesFor(family, id, bndes.data, moedas.data), [family, id, bndes.data, moedas.data])
  const own = family === 'tfb' || family === 'tlp' ? bndes : moedas
  const loading = own.status === 'loading'
  const error = own.status === 'error' && !own.data ? own.error : null
  const next = rows[0]?.nextRelease
  const hasSpread = !!rows[0]?.hasSpread
  const spreadDate = rows.find((r) => r.spread)?.spread.curveDate
  const sel = rows.find((r) => r.id === id)
  const period = { preset, custom, setPreset: (v) => go({ preset: v, custom: null }, true), setCustom: (c) => go({ custom: c }, true) }

  return (
    <div className="bn">
      <div className="bn-cards" role="group" aria-label="Resumo do dia">
        {CARDS.map(([f, cid, label, col]) => {
          const r = rowsByFamily[f].find((x) => x.id === cid)
          const c = r && !r.missing ? (col === 'month' ? r.month : r.day) : null
          return (
            <button key={cid} type="button" className={`bn-card${family === f && id === cid ? ' bn-on' : ''}`} aria-pressed={family === f && id === cid} aria-label={`Ver histórico: ${label}`} onClick={() => go({ family: f, id: cid })}>
              <span className="bn-card-l">{label}</span>
              <b className="bn-card-v">{r?.missing || !r ? '—' : r.text}</b>
              <span className="bn-card-d">{c ? <Delta c={c} /> : <span className="muted">{r?.missing ? 'indisponível' : '—'}</span>}</span>
              <small className="bn-card-t">{r && !r.missing ? `${col === 'month' ? 'vs mês anterior · ' : ''}${dmy(r.date)}` : ''}</small>
            </button>
          )
        })}
      </div>

      <Panel title="BNDES · taxas e moedas contratuais" note="BNDES" refresh={['bndes.json', 'moedas.json']}>
        <div className="seg bn-fam" role="group" aria-label="Família de séries">
          {FAMILIES.map((f) => <button key={f.id} type="button" aria-pressed={family === f.id} onClick={() => go({ family: f.id, id: undefined })}>{f.label}</button>)}
        </div>
        <h3 className="bn-sub">{fam.title}</h3>
        {error ? <p className="status">Séries indisponíveis agora ({error}). Elas voltam na próxima coleta.</p> : (
          <div className={`bn-scroll ${rows.length > 8 ? 'bn-grp' : ''}`} role="region" aria-label={`${fam.title}; role para ver todas as colunas`} tabIndex={0}>
            <table className="bn-table bn-main">
              <thead><tr><th scope="col">Série</th><th scope="col">Valor</th><th scope="col">Dia</th><th scope="col" className="bn-wide">Mês</th><th scope="col" className="bn-wide">Ano</th>{hasSpread && <th scope="col" className="bn-wide" title="TFB menos a taxa DI x pré (B3) do mesmo prazo e do mesmo dia da curva">Spread DI</th>}<th scope="col">Data</th></tr></thead>
              <tbody>
                {rows.flatMap((r) => [
                  <tr key={r.id} className={r.id === id ? 'bn-on' : undefined}>
                    <th scope="row"><button type="button" className="bn-pick" aria-pressed={r.id === id} aria-label={`Ver histórico: ${r.name} (${r.id})`} onClick={() => go({ id: r.id })}>{r.name}<small>{r.sub}</small></button></th>
                    {r.missing ? <td colSpan={hasSpread ? 6 : 5} className="muted">{loading ? 'carregando' : 'indisponível'}</td> : (
                      <>
                        <td className="num">{r.text}{r.stale && <em className="old"> · dado anterior ({stamp(r.stale)})</em>}</td>
                        <td><Delta c={r.day} /></td><td className="bn-wide"><Delta c={r.month} /></td><td className="bn-wide"><Delta c={r.year} /></td>
                        {hasSpread && <td className="bn-wide">{r.spread ? <span className="bn-spread" title={`TFB ${r.spread.tfb.toLocaleString('pt-BR')}% (${dmy(r.spread.tfbDate)}) menos DI ${r.spread.di.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% no vértice de ${r.spread.du} dias úteis (${dmy(r.spread.curveDate)})`}>{r.spread.text}</span> : <span className="muted">—</span>}</td>}
                        <td>{dmy(r.date).slice(0, 5)}<span className="bn-yr">{dmy(r.date).slice(5)}</span></td>
                      </>
                    )}
                  </tr>,
                  // celular: Mês e Ano saem da tabela e aparecem sob a linha tocada
                  r.id === id && !r.missing ? <tr key={`${r.id}-x`} className="bn-extra"><td colSpan={4}><span>Mês <Delta c={r.month} /></span><span>Ano <Delta c={r.year} /></span>{hasSpread && r.spread && <span>Spread DI {r.spread.text}</span>}</td></tr> : null,
                ])}
              </tbody>
            </table>
          </div>
        )}
        {next && <p className="bn-def">Próxima divulgação da TLP: {dmy(next)}.</p>}
        {hasSpread && <p className="bn-def">{spreadDate ? `Spread DI: TFB de ${dmy(spreadDate)} menos a taxa DI x pré da B3 do mesmo dia, no vértice de mesmo prazo (36, 60, 84 e 120 meses ≈ 21 dias úteis por mês). Aproximação: o prazo médio do financiamento é menor que o prazo final.` : 'Spread DI indisponível: sem curva DI x pré da B3 ou sem TFB no dia da curva.'}</p>}

        <FilterScope>
          <h3 className="bn-sub">Histórico · {series.name}</h3>
          <SeriesChart list={series.list} name={series.name} code={series.code} label="série" kind={series.kind} loading={loading} decimals={series.decimals} unit={series.unit} period={period} />
        </FilterScope>

        <details className="bn-src">
          <summary>Dados para o Excel (CSV)</summary>
          <p className="bn-def">Arquivos com endereço fixo, atualizados a cada coleta horária, com as mesmas séries da tela. Colunas: serie, nome, data (AAAA-MM-DD), valor (ponto decimal) e unidade. No Excel: Dados &gt; Obter Dados &gt; Da Web, cole o endereço; se o valor vier como texto, mude a localidade da coluna para Inglês (EUA).</p>
          <ul className="bn-csv">
            {CSV.map(([file, label]) => { const url = new URL(`./csv/${file}`, window.location.href).href; return <li key={file}><a href={`./csv/${file}`} download>{label}</a> <code>{url}</code></li> })}
          </ul>
        </details>
        <details className="bn-src">
          <summary>Definição e fonte · {fam.label}</summary>
          <p className="bn-def">{fam.definition}</p>
          <p className="bn-def">{fam.source} Variações em pontos percentuais (dólar e Selic acumulada, em %) contra o dia útil anterior e as datas de um mês e um ano antes, ou a mais próxima anterior; sem histórico suficiente, a coluna fica vazia. Atualizado a cada coleta horária.</p>
        </details>
        <Aviso title="BNDES · taxas e moedas"><p className="bn-def">O BNDES não detalha a sigla TFC na consulta de Moedas Contratuais; os nomes e códigos seguem a tabela do banco. A TFB (taxa fixa) e a TFC são séries diferentes. O período escolhido vale para todas as séries; séries que começam depois do início do período mostram só o que existe. O endereço da página guarda a série e o período: copie-o para compartilhar{sel ? ` (${sel.name})` : ''}.</p></Aviso>
      </Panel>
    </div>
  )
}
