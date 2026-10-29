import { useMemo, useState } from 'react'
import { Aviso } from './Avisos.jsx'
import { FilterScope } from './ChartFilters.jsx'
import SeriesChart from './BndesChart.jsx'
import { Panel } from './TerminalDesk.jsx'
import { useDataFile } from './useDataFile.js'
import { GROUPS, MOEDAS_DEFINICAO, TFC_DEFINICAO, dmy, groupRows, pointsOf } from './moedas.js'

const stamp = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const Delta = ({ c }) => (c ? <span className={`bn-delta bn-${c.dir}`} title={`em relação a ${dmy(c.ref)}`}>{c.text}</span> : <span className="muted">—</span>)
const decimalsOf = (s) => (s.kind === 'level' ? (s.id === '143' ? 6 : 4) : 2)

// Tabela de um grupo de séries do BNDES (TFC ou moedas contratuais) com o histórico da série escolhida.
function GroupPanel({ group, title, note, definition, aviso, data, loading, error }) {
  const rows = useMemo(() => groupRows(data, group), [data, group])
  const [id, setId] = useState(GROUPS[group][0].id)
  const sel = GROUPS[group].find((s) => s.id === id) ?? GROUPS[group][0]
  const list = useMemo(() => pointsOf(data, sel.id).map(([period, value]) => ({ period, value })), [data, sel.id])
  const name = `${sel.name} (${sel.id})`
  return (
    <Panel title={title} note={note} refresh={['moedas.json']}>
      {error && !data ? <p className="status">Série indisponível agora ({error}). Ela volta na próxima coleta.</p> : (
        <div className="bn-scroll bn-grp" role="region" aria-label={`${title}; role para ver todas as colunas`} tabIndex={0}>
          <table className="bn-table">
            <thead><tr><th scope="col">Série</th><th scope="col">Valor</th><th scope="col">Dia</th><th scope="col">Mês</th><th scope="col">Ano</th><th scope="col">Data</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.id === sel.id ? 'bn-on' : undefined}>
                  <th scope="row"><button type="button" className="bn-pick" aria-pressed={r.id === sel.id} aria-label={`Ver histórico: ${r.name} (${r.id})`} onClick={() => setId(r.id)}>{r.name}<small>{r.id} · {r.unit}</small></button></th>
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
      <p className="bn-def">{definition}</p>
      <FilterScope>
        <h3 className="bn-sub">Histórico · {name}</h3>
        <SeriesChart list={list} name={name} code={`moeda-${sel.id}`} label={group === 'tfc' ? 'TFC' : 'série'} kind="sparse" loading={loading} decimals={decimalsOf(sel)} unit={sel.unit} />
      </FilterScope>
      <Aviso title={title}><p className="bn-def">{aviso}</p></Aviso>
    </Panel>
  )
}

// Painéis da TFC e das moedas contratuais do BNDES (arquivo moedas.json).
export function MoedasPanels() {
  const file = useDataFile('moedas.json')
  const loading = file.status === 'loading'
  const error = file.status === 'error' ? file.error : null
  return (
    <>
      <GroupPanel group="tfc" title="TFC · BNDES" note="Moedas Contratuais · % a.a." definition={TFC_DEFINICAO} data={file.data} loading={loading} error={error}
        aviso="Fonte: arquivos de cotação das Moedas Contratuais do BNDES (códigos C01 a C26; C19 e C21 não existem na tabela). Uma cotação por dia útil, com histórico a partir de 2025 ou 2026, conforme a série. Variações em pontos percentuais contra o dia útil anterior e as datas de um mês e um ano antes (ou a mais próxima anterior; sem histórico suficiente, a coluna fica vazia). Atualizado a cada coleta horária." />
      <GroupPanel group="moedas" title="Moedas contratuais · BNDES" note="dólar, Selic, TLP-IPCA e TFB baseada em TR" definition={MOEDAS_DEFINICAO} data={file.data} loading={loading} error={error}
        aviso="Fonte: arquivos de cotação das Moedas Contratuais do BNDES. O dólar (604) e a Selic acumulada (143) variam em %; sobretaxa, TLP-IPCA e TFBTR variam em pontos percentuais. A TFBTR (TR1 e TR2) tem um valor por mês. O arquivo da Selic acumulada traz também a data seguinte, já calculada pelo BNDES. A TLP (777) fica no painel próprio, mais abaixo. Atualizado a cada coleta horária." />
    </>
  )
}
