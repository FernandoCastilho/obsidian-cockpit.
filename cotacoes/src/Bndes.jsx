import { useMemo, useState } from 'react'
import { Aviso } from './Avisos.jsx'
import { FilterScope } from './ChartFilters.jsx'
import SeriesChart from './BndesChart.jsx'
import { Panel } from './TerminalDesk.jsx'
import { useDataFile } from './useDataFile.js'
import { MoedasPanels } from './Moedas.jsx'
import { LIBERACOES, PRAZOS, PRAZO_LABEL, TFB_DEFINICAO, TLP_DEFINICAO, bndesRows, dmy, keyOf, pointsOf, tlpView } from './bndes.js'
import './Bndes.css'

const nf = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const stamp = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const Delta = ({ c }) => (c ? <span className={`bn-delta bn-${c.dir}`} title={`em relação a ${dmy(c.ref)}`}>{c.text}</span> : <span className="muted">—</span>)

// Aba BNDES: Taxa Fixa do BNDES (TFB) por prazo e liberação e TLP, com variação e histórico.
export default function Bndes() {
  const file = useDataFile('bndes.json')
  const rows = useMemo(() => bndesRows(file.data), [file.data])
  const tlp = useMemo(() => tlpView(file.data), [file.data])
  const loading = file.status === 'loading'
  const [prazo, setPrazo] = useState(60)
  const [liberacao, setLiberacao] = useState(90)
  const key = keyOf(prazo, liberacao)
  const list = useMemo(() => pointsOf(file.data, key).map(([period, value]) => ({ period, value })), [file.data, key])
  const tlpList = useMemo(() => (tlp?.points ?? []).map(([period, value]) => ({ period, value })), [tlp])
  const name = `TFB · ${PRAZO_LABEL[prazo]} · liberação em ${liberacao} dias`

  return (
    <div className="bn">
      <Panel title="Taxa Fixa do BNDES (TFB)" note="BNDES · % a.a." refresh={['bndes.json']}>
        {file.status === 'error' && !file.data ? (
          <p className="status">TFB indisponível agora ({file.error}). Ela volta na próxima coleta.</p>
        ) : (
          <div className="bn-scroll" role="region" aria-label="TFB por prazo e liberação; role para ver todas as colunas" tabIndex={0}>
            <table className="bn-table">
              <thead><tr><th scope="col">Prazo do financiamento</th><th scope="col">Liberação</th><th scope="col">Taxa</th><th scope="col">Dia</th><th scope="col">Mês</th><th scope="col">Ano</th><th scope="col">Data</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className={r.prazo === prazo && r.liberacao === liberacao ? 'bn-on' : undefined}>
                    <th scope="row"><button type="button" className="bn-pick" aria-pressed={r.prazo === prazo && r.liberacao === liberacao} aria-label={`Ver histórico: ${r.label}, liberação em ${r.liberacao} dias`} onClick={() => { setPrazo(r.prazo); setLiberacao(r.liberacao) }}>{r.label}<small>{r.prazo} meses</small></button></th>
                    <td>{r.liberacao} dias</td>
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
        <p className="bn-def">{TFB_DEFINICAO}</p>
      </Panel>

      <Panel title="Histórico da TFB" note={name} refresh={['bndes.json']}>
        <FilterScope>
          <div className="bn-pickers">
            <div className="seg" role="group" aria-label="Prazo do financiamento">{PRAZOS.map((p) => <button key={p} type="button" aria-pressed={prazo === p} onClick={() => setPrazo(p)}>{PRAZO_LABEL[p]}</button>)}</div>
            <div className="seg" role="group" aria-label="Liberação dos recursos">{LIBERACOES.map((l) => <button key={l} type="button" aria-pressed={liberacao === l} onClick={() => setLiberacao(l)}>Liberação em {l} dias</button>)}</div>
          </div>
          <SeriesChart list={list} name={name} code={`tfb-${key}`} label="TFB" kind="day" loading={loading} />
        </FilterScope>
        <Aviso title="TFB · BNDES"><p className="bn-def">Fonte: serviço público de taxas do BNDES (arquivos TFB_prazo_liberação). O BNDES publica uma cotação por dia útil, que já está disponível no próprio dia (prática observada nas coletas; não há norma publicada sobre o horário). O serviço traz as faixas de 36, 60, 84 e 120 meses com liberação em 30 e 90 dias; não há série para outras liberações. A TFC e as moedas contratuais estão nos painéis abaixo. Variações em pontos percentuais contra o dia útil anterior e as datas de um mês e um ano antes (ou a mais próxima anterior). Atualizado a cada coleta horária.</p></Aviso>
      </Panel>

      <MoedasPanels />

      <Panel title="Taxa de Longo Prazo (TLP)" note="Banco Central (SGS 27572) · % a.a." refresh={['bndes.json']}>
        {!tlp ? <p className="status">{loading ? 'Carregando a TLP…' : 'TLP indisponível agora. Ela volta na próxima coleta.'}</p> : (
          <>
            <div className="bn-scroll" role="region" aria-label="TLP vigente" tabIndex={0}>
              <table className="bn-table bn-tlp">
                <thead><tr><th scope="col">Vigência desde</th><th scope="col">Taxa</th><th scope="col">Mês</th><th scope="col">12 meses</th><th scope="col">Próxima divulgação</th></tr></thead>
                <tbody><tr>
                  <td>{dmy(tlp.date)}</td>
                  <td className="num">{tlp.text}{tlp.stale && <em className="old"> · dado anterior ({stamp(tlp.stale)})</em>}</td>
                  <td><Delta c={tlp.month} /></td><td><Delta c={tlp.year} /></td>
                  <td>{dmy(tlp.nextRelease)}</td>
                </tr></tbody>
              </table>
            </div>
            <FilterScope>
              <SeriesChart list={tlpList} name="TLP · % a.a." code="tlp-bndes" label="TLP" kind="month" loading={loading} />
            </FilterScope>
          </>
        )}
        <p className="bn-def">{TLP_DEFINICAO}</p>
        <Aviso title="TLP · divulgação"><p className="bn-def">A TLP é divulgada pelo Banco Central no último dia útil do mês anterior ao da vigência (Res. CMN 4.600/2017); a próxima data é calculada com o calendário de feriados do Brasil. O histórico começa em 2018, quando a TLP substituiu a TJLP nos contratos do BNDES. Os valores vêm do SGS, série 27572.</p></Aviso>
      </Panel>
    </div>
  )
}
