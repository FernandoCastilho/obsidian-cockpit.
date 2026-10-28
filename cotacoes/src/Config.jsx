import InstallApp from './InstallApp.jsx'
import Novidades from './Novidades.jsx'
import { Panel } from './TerminalDesk.jsx'
import { centralMaxAge } from './useQuotes.js'
import { useMacro } from './useMacro.js'
import { useCurves } from './useCurves.js'
import { useNews } from './useNews.js'
import { useDataFile } from './useDataFile.js'
import { isWeekendBR } from './market.js'
import { dataTimestamp } from './dataTimestamp.js'
import { SHORTCUTS, ageText, dataStatus } from './terminal.js'

const H = 3600e3
const STATE = { ok: ['Atualizado', 'up'], old: ['Atrasado', 'down'], missing: ['Indisponível', 'flat'] }

// Configurações: atalhos, estado de cada fonte de dados, aparência, instalação e histórico de mudanças.
export default function Config({ quotesAt, quotesVia, fx, setFx }) {
  const macro = useMacro()
  const curves = useCurves()
  const news = useNews()
  const policy = useDataFile('policy-rates.json')
  const oil = useDataFile('oil.json')
  const indexadores = useDataFile('indexadores.json')
  const commodities = useDataFile('commodities.json')
  const freight = useDataFile('freight.json')
  const rows = dataStatus(
    [
      { key: 'quotes', label: `Câmbio${quotesVia ? ` · ${quotesVia === 'central' ? 'coleta central' : quotesVia === 'direto' ? 'consulta direta' : 'fonte reserva'}` : ''}`, at: quotesAt ? new Date(quotesAt).getTime() : null, maxAge: centralMaxAge(), weekdays: false },
      { key: 'macro', label: 'Juros e Focus (Banco Central, NY Fed)', at: macro.data?.generatedAt, maxAge: 6 * H, weekdays: true },
      { key: 'curves', label: 'Curvas DI x pré, cupom e Treasuries', at: curves.data?.generatedAt, maxAge: 6 * H, weekdays: true },
      { key: 'news', label: 'Notícias', at: news.data?.generatedAt, maxAge: 6 * H, weekdays: true },
      { key: 'policy', label: 'Juros de política monetária (Fed, BCE, BoE, BoJ)', at: policy.data?.generatedAt, maxAge: 36 * H, weekdays: true },
      { key: 'indexadores', label: 'Indexadores TR, TBF, TLP e TFB (Banco Central e BNDES)', at: indexadores.data?.generatedAt, maxAge: 6 * H, weekdays: true },
      { key: 'oil', label: 'Petróleo Brent (EIA)', at: oil.data?.generatedAt, maxAge: 72 * H, weekdays: true },
      { key: 'commodities', label: 'Commodities (EIA e Banco Mundial)', at: commodities.data?.generatedAt, maxAge: 72 * H, weekdays: true },
      { key: 'freight', label: 'Transporte marítimo (BLS)', at: freight.data?.generatedAt, maxAge: 72 * H, weekdays: true },
    ],
    Date.now(),
    isWeekendBR(),
  )
  return (
    <div className="config-desk">
      <Panel title="Estado dos dados" note="última coleta de cada fonte">
        <div className="config-scroll" role="region" aria-label="Estado de cada fonte de dados" tabIndex={0}><table className="config-table">
          <thead><tr><th scope="col">Fonte</th><th scope="col">Última coleta</th><th scope="col">Idade</th><th scope="col">Estado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                <td>{r.at ? dataTimestamp(r.at) : '—'}</td>
                <td>{ageText(r.ageMs)}</td>
                <td><span className={`chip ${STATE[r.state][1]}`}>{STATE[r.state][0]}</span></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="config-note">As coletas rodam em dias úteis; no fim de semana o app mostra o último dado publicado. "Atrasado" indica que a fonte está sem atualização acima do esperado, não que o número esteja errado.</p>
      </Panel>
      <div className="config-side">
        <Panel title="Atalhos e comandos" note="teclado">
          <div className="config-scroll" role="region" aria-label="Atalhos de teclado e comandos" tabIndex={0}><table className="config-table">
            <tbody>{SHORTCUTS.map(([k, d]) => <tr key={k}><th scope="row"><kbd>{k}</kbd></th><td>{d}</td></tr>)}</tbody>
          </table></div>
        </Panel>
        <Panel title="Aparência" note="só neste navegador">
          <div className="config-row">
            <button type="button" className="fx-toggle" aria-pressed={fx === 'neon'} onClick={() => setFx(fx === 'neon' ? 'off' : 'neon')}>Efeitos: {fx === 'neon' ? 'brilho ligado' : 'desligados'}</button>
            <span>Brilho discreto nas linhas dos gráficos.</span>
          </div>
        </Panel>
        <Panel title="Aplicativo" note="instalação">
          <p className="config-hint">Instale para abrir em tela cheia e offline. No Chrome e no Edge, use o botão de instalar quando ele aparecer; no iPhone e no iPad, Compartilhar e Adicionar à Tela de Início.</p>
          <div className="config-row"><InstallApp /></div>
        </Panel>
      </div>
      <Panel title="O que há de novo" className="config-wide"><Novidades open /></Panel>
    </div>
  )
}
