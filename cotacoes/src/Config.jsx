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
import { ATRASO_H, FONTES, NAVEGADOR, REGRAS, RESUMO } from './governanca.js'

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
  const bndes = useDataFile('bndes.json')
  const moedas = useDataFile('moedas.json')
  const ipca = useDataFile('ipca.json')
  const estr = useDataFile('estr.json')
  const euroCurve = useDataFile('euro-curve.json')
  const divida = useDataFile('divida.json')
  const calendar = useDataFile('calendar.json')
  const ipcaGroups = useDataFile('ipca-groups.json')
  const freightJp = useDataFile('freight-jp.json')
  const rows = dataStatus(
    [
      { key: 'quotes', label: `Câmbio${quotesVia ? ` · ${quotesVia === 'central' ? 'coleta central' : quotesVia === 'direto' ? 'consulta direta' : 'fonte reserva'}` : ''}`, at: quotesAt ? new Date(quotesAt).getTime() : null, maxAge: centralMaxAge(), weekdays: false },
      { key: 'macro', label: 'Juros e Focus (Banco Central, NY Fed)', at: macro.data?.generatedAt, maxAge: ATRASO_H.macro * H, weekdays: true },
      { key: 'curves', label: 'Curvas DI x pré, cupom e Treasuries', at: curves.data?.generatedAt, maxAge: ATRASO_H.curves * H, weekdays: true },
      { key: 'news', label: 'Notícias', at: news.data?.generatedAt, maxAge: ATRASO_H.news * H, weekdays: true },
      { key: 'policy', label: 'Juros de política monetária (Fed, BCE, BoJ)', at: policy.data?.generatedAt, maxAge: ATRASO_H.policy * H, weekdays: true },
      { key: 'euro-curve', label: 'Curva de juros do euro (Banco Central Europeu)', at: euroCurve.data?.generatedAt, maxAge: ATRASO_H['euro-curve'] * H, weekdays: true },
      { key: 'estr', label: 'Taxa €STR (Banco Central Europeu)', at: estr.data?.generatedAt, maxAge: ATRASO_H.estr * H, weekdays: true },
      { key: 'indexadores', label: 'Indexadores TR, TBF e TLP (Banco Central e BNDES)', at: indexadores.data?.generatedAt, maxAge: ATRASO_H.indexadores * H, weekdays: true },
      { key: 'bndes', label: 'Taxa Fixa do BNDES (TFB)', at: bndes.data?.generatedAt, maxAge: ATRASO_H.bndes * H, weekdays: true },
      { key: 'moedas', label: 'TFC e moedas contratuais (BNDES)', at: moedas.data?.generatedAt, maxAge: ATRASO_H.moedas * H, weekdays: true },
      { key: 'oil', label: 'Petróleo Brent (EIA)', at: oil.data?.generatedAt, maxAge: ATRASO_H.oil * H, weekdays: true },
      { key: 'commodities', label: 'Commodities (EIA e Banco Mundial)', at: commodities.data?.generatedAt, maxAge: ATRASO_H.commodities * H, weekdays: true },
      { key: 'freight', label: 'Transporte marítimo (BLS)', at: freight.data?.generatedAt, maxAge: ATRASO_H.freight * H, weekdays: true },
      { key: 'freight-jp', label: 'Transporte marítimo Japão (Banco do Japão)', at: freightJp.data?.generatedAt, maxAge: ATRASO_H['freight-jp'] * H, weekdays: true },
      { key: 'ipca', label: 'IPCA (IBGE)', at: ipca.data?.generatedAt, maxAge: ATRASO_H.ipca * H, weekdays: true },
      { key: 'divida', label: 'Dívida bruta do governo geral (Banco Central)', at: divida.data?.generatedAt, maxAge: ATRASO_H.divida * H, weekdays: true },
      { key: 'ipca-groups', label: 'IPCA por grupos (IBGE)', at: ipcaGroups.data?.generatedAt, maxAge: ATRASO_H['ipca-groups'] * H, weekdays: true },
      { key: 'calendar', label: 'Calendário econômico', at: calendar.data?.generatedAt, maxAge: ATRASO_H.calendar * H, weekdays: true },
    ],
    Date.now(),
    isWeekendBR(),
  )
  return (
    <div className="config-desk">
      <Panel title="Estado dos dados" note="última coleta de cada fonte" refresh={['macro.json', 'curves.json', 'news.json', 'policy-rates.json', 'estr.json', 'euro-curve.json', 'indexadores.json', 'bndes.json', 'moedas.json', 'oil.json', 'commodities.json', 'freight.json', 'freight-jp.json', 'ipca.json', 'divida.json', 'ipca-groups.json', 'calendar.json']}>
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
      <Panel title="Governança dos dados" note="de onde vêm, com que frequência e quando atrasam" className="config-wide">
        <h3 className="config-sub">Em resumo</h3>
        <ul className="config-list config-resumo">{RESUMO.map((t) => <li key={t}>{t}</li>)}</ul>
        <h3 className="config-sub">Fonte por fonte</h3>
        <div className="config-scroll" role="region" aria-label="Frequência de atualização de cada fonte" tabIndex={0}><table className="config-table config-gov">
          <thead><tr><th scope="col">Fonte</th><th scope="col">Origem</th><th scope="col">Coleta</th><th scope="col">Quando o dado muda</th><th scope="col">Atrasado após</th></tr></thead>
          <tbody>
            {FONTES.map((f) => (
              <tr key={f.id}>
                <th scope="row">{f.nome}</th>
                <td data-label="Origem">{f.origem}</td>
                <td data-label="Coleta">{f.coleta}</td>
                <td data-label="Quando o dado muda">{f.muda}</td>
                <td data-label="Atrasado após">{f.atraso}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <h3 className="config-sub">No seu navegador</h3>
        <ul className="config-list">{NAVEGADOR.map((t) => <li key={t}>{t}</li>)}</ul>
        <h3 className="config-sub">Regras</h3>
        <ul className="config-list">{REGRAS.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="config-note">Horários em Brasília. Coleta é a consulta do app às fontes; o dado só muda quando o órgão de origem publica.</p>
      </Panel>
      <div className="config-side">
        <Panel title="Atalhos" note="teclado">
          <div className="config-scroll" role="region" aria-label="Atalhos de teclado" tabIndex={0}><table className="config-table">
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
