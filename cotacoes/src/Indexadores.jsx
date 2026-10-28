import { Aviso } from './Avisos.jsx'
import { useDataFile } from './useDataFile.js'
import { Panel } from './TerminalDesk.jsx'
import { indexRows } from './indexadores.js'

const dmy = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

// Indexadores TR, TBF, TLP (Banco Central) e TFB (BNDES): valor vigente, período de vigência e equivalente anual.
export default function Indexadores() {
  const file = useDataFile('indexadores.json')
  const rows = indexRows(file.data)
  const loading = file.status === 'loading'
  return (
    <Panel title="Indexadores · TR · TBF · TLP · TFB" note="Banco Central e BNDES">
      {file.status === 'error' && !file.data ? (
        <p className="status">Indexadores indisponíveis agora ({file.error}). Eles voltam na próxima coleta.</p>
      ) : (
        <div className="idx-scroll" role="region" aria-label="Indexadores TR, TBF, TLP e TFB" tabIndex={0}>
          <table className="idx-table">
            <thead>
              <tr><th scope="col">Indexador</th><th scope="col">Valor vigente</th><th scope="col">Equivalente</th><th scope="col">Vigência</th><th scope="col">Fonte</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row"><b>{r.key}</b><small>{r.name}</small></th>
                  <td className="num">{r.missing ? (loading ? 'carregando' : 'indisponível') : r.text}</td>
                  <td className="num">{r.annualText ?? '—'}</td>
                  <td>{r.missing ? '—' : r.period}</td>
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
      <Aviso title="Indexadores · TR, TBF, TLP e TFB"><p className="idx-note">TR e TBF vêm em % ao mês; o equivalente anual é a composição de 12 meses iguais. TLP e TFB vêm em % ao ano. TR, TBF e TLP: Banco Central (SGS). TFB: serviço de taxas do BNDES (códigos TFB_36_30 a TFB_120_30; liberação em até 30 dias); o BNDES não publica TFC por esse serviço. Atualizado a cada coleta horária.</p></Aviso>
    </Panel>
  )
}
