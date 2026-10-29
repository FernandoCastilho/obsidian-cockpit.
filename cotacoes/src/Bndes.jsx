import { useMemo, useState } from 'react'
import { Aviso } from './Avisos.jsx'
import ChartFilters, { FilterScope } from './ChartFilters.jsx'
import DateRangePicker from './DateRangePicker.jsx'
import { Plot, useWidth } from './HistoryChart.jsx'
import { Panel } from './TerminalDesk.jsx'
import { useDataFile } from './useDataFile.js'
import { LIBERACOES, PRAZOS, PRAZO_LABEL, TFB_DEFINICAO, bndesRows, dmy, keyOf, pointsOf } from './bndes.js'
import './Bndes.css'

const PRESETS = [[3, '3 meses'], [6, '6 meses'], [12, '12 meses'], [24, '2 anos'], [60, '5 anos'], ['all', 'Tudo']]
const tOf = (iso) => Date.parse(`${iso}T12:00:00Z`)
const nf = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const startFor = (last, months) => { const d = new Date(tOf(last)); d.setUTCMonth(d.getUTCMonth() - months); return d.toISOString().slice(0, 10) }
const stamp = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const Delta = ({ c }) => (c ? <span className={`bn-delta bn-${c.dir}`} title={`em relação a ${dmy(c.ref)}`}>{c.text}</span> : <span className="muted">—</span>)

// Aba BNDES: Taxa Fixa do BNDES (TFB) por prazo e liberação, com variação e histórico diário.
export default function Bndes() {
  const file = useDataFile('bndes.json')
  const rows = useMemo(() => bndesRows(file.data), [file.data])
  const loading = file.status === 'loading'
  const [prazo, setPrazo] = useState(60)
  const [liberacao, setLiberacao] = useState(90)
  const [preset, setPreset] = useState(12)
  const [custom, setCustom] = useState(null)
  const [ref, width] = useWidth()
  const key = keyOf(prazo, liberacao)
  const list = useMemo(() => pointsOf(file.data, key).map(([period, value]) => ({ period, value })), [file.data, key])
  const range = custom ?? (list.length ? { start: preset === 'all' ? list[0].period : startFor(list.at(-1).period, preset), end: list.at(-1).period } : null)
  const bad = range && range.start > range.end
  const shown = useMemo(() => (range && !bad ? list.filter((p) => p.period >= range.start && p.period <= range.end) : []), [list, range?.start, range?.end, bad])
  const plot = useMemo(() => shown.map((p) => ({ t: tOf(p.period), bid: p.value })), [shown])
  const history = useMemo(() => list.map((p) => ({ t: tOf(p.period), bid: p.value })), [list])
  const first = shown[0], last = shown.at(-1)
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
                    <th scope="row"><button type="button" className="bn-pick" aria-pressed={r.prazo === prazo && r.liberacao === liberacao} aria-label={`Ver histórico: ${r.label}, liberação em ${r.liberacao} dias`} onClick={() => { setPrazo(r.prazo); setLiberacao(r.liberacao); setCustom(null) }}>{r.label}<small>{r.prazo} meses</small></button></th>
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
          {!list.length ? <p role="status">{loading ? 'Carregando a série…' : 'Série indisponível agora. Ausência de dado não significa taxa zero.'}</p> : (
            <>
              <ChartFilters label="Período da TFB">
                <div className="summary-period-controls">
                  <div className="seg" role="group" aria-label="Período da TFB">{PRESETS.map(([v, l]) => <button key={v} type="button" aria-pressed={!custom && preset === v} onClick={() => { setCustom(null); setPreset(v) }}>{l}</button>)}</div>
                  <DateRangePicker label="Período da TFB" mode="day" start={range.start} end={range.end} min={list[0].period} max={list.at(-1).period} onChange={(start, end) => setCustom({ start, end })} />
                </div>
                {bad && <p role="alert">O início não pode ser posterior ao fim.</p>}
              </ChartFilters>
              <p className="muted">Cobertura: {dmy(list[0].period)} a {dmy(list.at(-1).period)} · {list.length} observações diárias (dias úteis). Dias sem cotação não são preenchidos.</p>
              {plot.length > 1
                ? <>
                  <p className="bn-range">No período: {dmy(first.period)} {nf(first.value)}% → {dmy(last.period)} {nf(last.value)}% a.a. ({last.value - first.value >= 0 ? '+' : '−'}{nf(Math.abs(last.value - first.value))} p.p.).</p>
                  <div ref={ref}><Plot points={plot} history={history} width={width} color="#ca9c49" code={`tfb-${key}`} intraday={false} fmt={(v) => `${nf(v)}% a.a.`} vfmt={(v) => nf(v)} label={name} labels /></div>
                </>
                : <p role="status">{bad ? 'Ajuste o período.' : 'Poucas observações no período; escolha um intervalo maior.'}</p>}
              <div className="bn-scroll bn-obs" role="region" aria-label="Observações do período" tabIndex={0}>
                <table className="bn-table"><caption>{name} · observações do período (mais recentes primeiro, até 250)</caption>
                  <thead><tr><th scope="col">Data</th><th scope="col">% a.a.</th></tr></thead>
                  <tbody>{[...shown].reverse().slice(0, 250).map((p) => <tr key={p.period}><th scope="row">{dmy(p.period)}</th><td className="num">{nf(p.value)}</td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
        </FilterScope>
        <Aviso title="TFB · BNDES"><p className="bn-def">Fonte: serviço público de taxas do BNDES (arquivos TFB_prazo_liberação). O BNDES publica uma cotação por dia útil, que já está disponível no próprio dia (prática observada nas coletas; não há norma publicada sobre o horário). O serviço traz as faixas de 36, 60, 84 e 120 meses com liberação em 30 e 90 dias; não há série para outras liberações nem a TFC. Variações em pontos percentuais contra o dia útil anterior e as datas de um mês e um ano antes (ou a mais próxima anterior). Atualizado a cada coleta horária.</p></Aviso>
      </Panel>
    </div>
  )
}
