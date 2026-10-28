import { useMemo, useState } from 'react'
import './CupomLeitura.css'
import { Aviso } from './Avisos.jsx'
import { Plot, useWidth } from './HistoryChart.jsx'
import { VERTICES, formaDoMovimento, leitura, matchUsDate, resumoTexto, serieDoVertice, variacaoPorVertice } from './cupom.js'

const f2 = (v) => (v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const sg = (v, d = 2) => (v == null ? '—' : `${Math.round(Math.abs(v) * 10 ** d) === 0 ? '' : v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}`)
const dm = (iso) => iso.split('-').reverse().slice(0, 2).join('/')
const duLabel = (du) => (du < 21 ? `${du} d.u.` : du < 252 ? `${Math.round(du / 21)} m` : `${(du / 252).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} a`)
const KEY = new Set([21, 63, 126, 252, 504, 756, 1260, 2520]) // vértices exibidos nas barras (os demais só poluem)
const TABS = [['resumo', 'Resumo'], ['variacao', 'Variação por vértice'], ['tempo', 'Cupom no tempo']]

// Leitura do cupom cambial para análise de cenário: onde está, o que embute e como se moveu.
// Usa só as curvas já coletadas (DI pré, cupom e Treasuries); nenhuma fonte nova.
export default function CupomLeitura({ curves }) {
  const { br, cc, us } = curves ?? {}
  const [tab, setTab] = useState('resumo')
  const compare = cc?.compare ?? []
  const [from, setFrom] = useState(compare[1]?.date ?? compare[0]?.date)
  const [du, setDu] = useState(252)
  const [ref, width] = useWidth()
  const last = compare[0]?.date
  const rows = useMemo(() => (last ? leitura({ br, cc, us }, last, matchUsDate(us, last)) : []), [br, cc, us, last])
  const frases = useMemo(() => resumoTexto({ br, cc, us }), [br, cc, us])
  const changes = useMemo(() => (last && from ? variacaoPorVertice(cc, from, last) : []), [cc, from, last])
  const shape = useMemo(() => formaDoMovimento(changes), [changes])
  const serie = useMemo(() => serieDoVertice(cc, du), [cc, du])
  if (!cc || !br || !last) return null
  const max = Math.max(1, ...changes.map((c) => Math.abs(c.bps)))
  const plot = serie.map((p) => ({ t: Date.parse(`${p.date}T12:00:00`), bid: p.value }))
  return (
    <section className="cupom-leitura" aria-labelledby="cupom-leitura-h">
      <h3 id="cupom-leitura-h">Cupom cambial · leitura de cenário</h3>
      <div className="seg" role="group" aria-label="Visão da leitura do cupom">
        {TABS.map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'resumo' && (
        <>
          {frases.length > 0 && <ul className="cl-frases">{frases.map((t) => <li key={t}>{t}</li>)}</ul>}
          <div className="cl-wrap" role="region" aria-label="Tabela da leitura do cupom por prazo" tabIndex={0}>
            <table className="cl-table">
              <caption>Curvas de {dm(last)} · % a.a.</caption>
              <thead><tr><th scope="col">Prazo</th><th scope="col">DI pré</th><th scope="col">Cupom</th><th scope="col" title="Desvalorização do real que DI e cupom embutem, a.a.">Desvalorização implícita</th><th scope="col" title="Cupom (efetivo) menos o Treasury do mesmo prazo, em p.p.">Cupom − UST</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.du}><th scope="row">{r.label}</th><td>{f2(r.pre)}%</td><td>{f2(r.cupom)}%</td><td>{r.depreciacao == null ? '—' : `${f2(r.depreciacao)}%`}</td><td>{r.premio ? `${sg(r.premio.spread)} p.p.` : '—'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'variacao' && (
        <>
          <label className="cl-label">Comparar o último dia ({dm(last)}) com{' '}
            <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data de comparação do cupom">
              {compare.slice(1).map((c) => <option key={c.date} value={c.date}>{c.label} · {dm(c.date)}</option>)}
            </select>
          </label>
          {changes.length ? (
            <>
              <div className="cl-bars" role="group" aria-label="Variação do cupom por prazo, em bps">
                {changes.filter((c) => KEY.has(c.du)).map((c) => (
                  <div className="cl-bar" key={c.du}>
                    <span className="cl-bar-label">{duLabel(c.du)}</span>
                    <span className="cl-bar-track" aria-hidden="true"><i className={c.bps >= 0 ? 'up' : 'down'} style={{ width: `${Math.max(2, (Math.abs(c.bps) / max) * 100)}%` }} /></span>
                    <b className="cl-bar-val">{sg(c.bps, 0)} bps</b>
                  </div>
                ))}
              </div>
              {shape && <p className="status">Movimento: <b>{shape.kind}</b> · nível médio {sg(shape.level, 0)} bps · inclinação (longo − curto) {sg(shape.slope, 0)} bps. Vértices a partir de 3 meses.</p>}
            </>
          ) : <p className="status">Sem vértices comuns entre as duas datas.</p>}
        </>
      )}
      {tab === 'tempo' && (
        <>
          <div className="seg" role="group" aria-label="Vértice do cupom">
            {VERTICES.map((v) => <button key={v.du} type="button" aria-pressed={du === v.du} onClick={() => setDu(v.du)}>{v.label}</button>)}
          </div>
          {serie.length > 1 ? (
            <div ref={ref}>
              <Plot points={plot} width={width} color="#4aa3a2" code={`cupom-${du}`} intraday={false} scales={false} fmt={(v) => `${f2(v)}%`} vfmt={(v) => f2(v)} label={`Cupom cambial · ${VERTICES.find((v) => v.du === du)?.label}`} nice rate labels />
            </div>
          ) : <p className="status">Sem pontos suficientes para este prazo.</p>}
          <p className="status">Pontos = datas de comparação disponíveis ({serie.map((p) => dm(p.date)).join(', ')}); não é série diária.</p>
        </>
      )}
      <Aviso title="Cupom cambial · como ler">
        <p className="status">DI pré e cupom (B3) e Treasuries (Tesouro dos EUA) já coletados. Convenções aproximadas: cupom é linear em 360 dias corridos (dias corridos ≈ dias úteis × 365/252) e é convertido em taxa efetiva anual para ser comparado ao DI e ao Treasury. <b>Desvalorização implícita</b> = (1 + DI) ÷ (1 + cupom efetivo) − 1: o que a taxa de juros em reais e o cupom, juntos, embutem para o dólar em 12 meses (não é previsão). <b>Cupom − UST</b>: prêmio de risco Brasil em dólar. Leitura descritiva, sem recomendação.</p>
      </Aviso>
    </section>
  )
}
