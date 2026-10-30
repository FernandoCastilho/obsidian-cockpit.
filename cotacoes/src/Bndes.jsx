import { useMemo, useState } from 'react'
import { Aviso } from './Avisos.jsx'
import { FilterScope } from './ChartFilters.jsx'
import SeriesChart from './BndesChart.jsx'
import { Panel } from './TerminalDesk.jsx'
import { useDataFile } from './useDataFile.js'
import { dmy } from './bndes.js'
import { DEFAULT_SELECTION, FAMILIES, familyRows, seriesFor } from './bndesView.js'
import './Bndes.css'

const stamp = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const Delta = ({ c }) => (c ? <><span className={`bn-delta bn-${c.dir}`} title={`em relação a ${dmy(c.ref)}`}>{c.text}</span>{c.jump && <span className="bn-jump" role="img" aria-label={`salto: ${c.hint}`} title={c.hint}>salto</span>}</> : <span className="muted">—</span>)

// Aba BNDES: uma só área de trabalho. Abas por família (TFB, TLP, TFC, Moedas) escolhem a tabela; clicar numa linha troca a série do gráfico;
// o período (atalhos e datas) é único e vale para todas as séries; as observações do período ficam recolhidas.
export default function Bndes() {
  const bndes = useDataFile('bndes.json')
  const moedas = useDataFile('moedas.json')
  const [family, setFamily] = useState('tfb')
  const [picked, setPicked] = useState(DEFAULT_SELECTION)
  const [preset, setPreset] = useState(12)
  const [custom, setCustom] = useState(null)
  const fam = FAMILIES.find((f) => f.id === family)
  const own = family === 'tfb' || family === 'tlp' ? bndes : moedas
  const rows = useMemo(() => familyRows(family, bndes.data, moedas.data), [family, bndes.data, moedas.data])
  const id = rows.some((r) => r.id === picked[family]) ? picked[family] : rows[0].id
  const series = useMemo(() => seriesFor(family, id, bndes.data, moedas.data), [family, id, bndes.data, moedas.data])
  const loading = own.status === 'loading'
  const error = own.status === 'error' && !own.data ? own.error : null
  const next = rows[0]?.nextRelease

  return (
    <div className="bn">
      <Panel title="BNDES · taxas e moedas contratuais" note="BNDES" refresh={['bndes.json', 'moedas.json']}>
        <div className="seg bn-fam" role="group" aria-label="Família de séries">
          {FAMILIES.map((f) => <button key={f.id} type="button" aria-pressed={family === f.id} onClick={() => setFamily(f.id)}>{f.label}</button>)}
        </div>
        <h3 className="bn-sub">{fam.title}</h3>
        {error ? <p className="status">Séries indisponíveis agora ({error}). Elas voltam na próxima coleta.</p> : (
          <div className={`bn-scroll ${rows.length > 8 ? 'bn-grp' : ''}`} role="region" aria-label={`${fam.title}; role para ver todas as colunas`} tabIndex={0}>
            <table className="bn-table">
              <thead><tr><th scope="col">Série</th><th scope="col">Valor</th><th scope="col">Dia</th><th scope="col">Mês</th><th scope="col">Ano</th><th scope="col">Data</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.id === id ? 'bn-on' : undefined}>
                    <th scope="row"><button type="button" className="bn-pick" aria-pressed={r.id === id} aria-label={`Ver histórico: ${r.name} (${r.id})`} onClick={() => setPicked({ ...picked, [family]: r.id })}>{r.name}<small>{r.sub}</small></button></th>
                    {r.missing ? <td colSpan={5} className="muted">{loading ? 'carregando' : 'indisponível'}</td> : (
                      <>
                        <td className="num">{r.text}{r.stale && <em className="old"> · dado anterior ({stamp(r.stale)})</em>}</td>
                        <td><Delta c={r.day} /></td><td><Delta c={r.month} /></td><td><Delta c={r.year} /></td>
                        <td>{dmy(r.date)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {next && <p className="bn-def">Próxima divulgação da TLP: {dmy(next)}.</p>}

        <FilterScope>
          <h3 className="bn-sub">Histórico · {series.name}</h3>
          <SeriesChart list={series.list} name={series.name} code={series.code} label="série" kind={series.kind} loading={loading} decimals={series.decimals} unit={series.unit} period={{ preset, setPreset, custom, setCustom }} />
        </FilterScope>

        <details className="bn-src">
          <summary>Definição e fonte · {fam.label}</summary>
          <p className="bn-def">{fam.definition}</p>
          <p className="bn-def">{fam.source} Variações em pontos percentuais (dólar e Selic acumulada, em %) contra o dia útil anterior e as datas de um mês e um ano antes, ou a mais próxima anterior; sem histórico suficiente, a coluna fica vazia. Atualizado a cada coleta horária.</p>
        </details>
        <Aviso title="BNDES · taxas e moedas"><p className="bn-def">O BNDES não detalha a sigla TFC na consulta de Moedas Contratuais; os nomes e códigos seguem a tabela do banco. A TFB (taxa fixa) e a TFC são séries diferentes. O período escolhido vale para todas as séries; séries que começam depois do início do período mostram só o que existe.</p></Aviso>
      </Panel>
    </div>
  )
}
