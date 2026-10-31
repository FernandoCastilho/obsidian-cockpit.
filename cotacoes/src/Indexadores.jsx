import { Aviso } from './Avisos.jsx'
import { useDataFile } from './useDataFile.js'
import { Panel } from './TerminalDesk.jsx'
import { indexRows } from './indexadores.js'
import Explain from './Explain.jsx'

const dmy = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

// Indexadores TR e TBF (Banco Central) e TLP (BNDES): valor vigente, período de vigência e equivalente anual.
export default function Indexadores({ onBndes }) {
  const file = useDataFile('indexadores.json')
  const rows = indexRows(file.data)
  const loading = file.status === 'loading'
  return (
    <Panel title="Indexadores · TR · TBF · TLP" refresh={['indexadores.json']}>
      {file.status === 'error' && !file.data ? (
        <p className="status">Indexadores indisponíveis agora ({file.error}). Eles voltam na próxima coleta.</p>
      ) : (
        <div className="idx-scroll" role="region" aria-label="Indexadores TR, TBF e TLP" tabIndex={0}>
          <table className="idx-table">
            <thead>
              <tr><th scope="col">Indexador</th><th scope="col">Valor vigente</th><th scope="col">Equivalente</th><th scope="col">Vigência</th><th scope="col">Divulgação</th><th scope="col">Fonte</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row"><b>{r.key}</b><Explain id={r.key.toLowerCase()} /><small>{r.name}</small>{r.key === 'TLP' && onBndes && <small><button type="button" className="idx-link" onClick={onBndes}>Histórico na aba BNDES</button></small>}</th>
                  <td className="num">{r.missing ? (loading ? 'carregando' : 'indisponível') : r.text}</td>
                  <td className="num">{r.annualText ?? '—'}</td>
                  <td>{r.missing ? '—' : r.period}</td>
                  <td className="idx-rel">{r.release.rule}<small>{r.release.detail ?? r.release.norm}</small>{r.release.detail && <small>{r.release.norm}</small>}</td>
                  <td>{r.missing ? '—' : <>{r.sourceText}{r.stale && <em className="old"> · dado anterior ({dmy(r.stale)})</em>}</>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <dl className="idx-defs">
        {rows.filter((r, i) => rows.findIndex((x) => x.family === r.family) === i).map((r) => (
          <div key={r.family}><dt>{r.family}</dt><dd>{r.definition}</dd></div>
        ))}
      </dl>
      <Aviso title="Indexadores · TR, TBF e TLP"><p className="idx-note">TR e TBF vêm em % ao mês; o equivalente anual é a composição de 12 meses iguais. A TLP vem em % ao ano. A coluna Divulgação traz a regra de publicação (Res. CMN 4.624/2018 para TR e TBF; 4.600/2017 para a TLP) e as datas calculadas com o calendário de feriados do Brasil. A Taxa Fixa do BNDES (TFB) fica na aba BNDES.</p></Aviso>
    </Panel>
  )
}
