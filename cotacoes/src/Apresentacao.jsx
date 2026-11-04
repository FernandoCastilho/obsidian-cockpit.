import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './Apresentacao.css'
import { Panel } from './TerminalDesk.jsx'
import Estado from './Estado.jsx'
import Sparkline from './Sparkline.jsx'
import { useDataFile } from './useDataFile.js'
import { useCentralDaily } from './useHistory.js'
import { normalizeTemas } from './reforma.js'
import { fadeIn } from './motion.js'
import { GRUPOS_SETORES, PERIODOS, SETORES_APRESENTACAO, buscarCapa, itensDaMontagem, itensPadrao, montarRoteiro, setorPorId, sinal, tom } from './apresentacao.js'

const MARK = { up: '▲', down: '▼', flat: '■' }
const dataHora = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).replace(',', ' ·')
const dia = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
const hora = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

// Apresentar: monta uma apresentação para o cliente a partir do setor e dos itens de mercado escolhidos, com os dados que o painel já tem.
// Nada é guardado: fechar a apresentação descarta a montagem.
export default function Apresentacao({ quotes, macro }) {
  const [site, setSite] = useState('')
  const [nome, setNome] = useState('')
  const [capa, setCapa] = useState(null) // { titulo, descricao, logo, imagem, dominio }
  const [capaEstado, setCapaEstado] = useState('') // '', 'lendo', 'ok', 'erro'
  const [setorId, setSetorId] = useState(SETORES_APRESENTACAO[0].id)
  const [itens, setItens] = useState(() => itensPadrao(SETORES_APRESENTACAO[0].id))
  const [periodo, setPeriodo] = useState(PERIODOS[1])
  const [aberta, setAberta] = useState(null) // roteiro em exibição, ou null
  const hist = useCentralDaily()
  const comm = useDataFile('commodities.json')
  const diario = useDataFile('insumos-precos.json')
  const temasFile = useDataFile('temas.json')
  const oil = useDataFile('oil.json')
  const ipca = useDataFile('ipca.json')
  const frete = useDataFile('freight.json')
  const temas = useMemo(() => { try { return temasFile.data ? normalizeTemas(temasFile.data) : {} } catch { return {} } }, [temasFile.data])
  const setor = setorPorId(setorId)
  const lista = itensDaMontagem(setorId)
  const escolherSetor = (id) => { setSetorId(id); setItens(itensPadrao(id)) }
  const alternar = (id) => setItens((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const lerSite = async () => {
    if (!site.trim()) return
    setCapaEstado('lendo')
    try { setCapa(await buscarCapa(site.trim())); setCapaEstado('ok') } catch { setCapa(null); setCapaEstado('erro') }
  }
  const dados = { quotes, hist: hist.data, commodities: comm.data?.commodities ?? [], diario: diario.data, oil: oil.data, frete: frete.data?.series, temas, macro: macro?.data, ipca: ipca.data?.series, agora: Date.now() }
  const pronto = (capa?.titulo || nome.trim()) && itens.length > 0
  // O roteiro é montado na hora de apresentar, com os dados daquele momento; fechar descarta.
  const apresentar = () => setAberta(montarRoteiro({ nome: nome.trim(), site, capa, setorId, itens, periodo }, dados))
  return (
    <div className="apr">
      <Panel title="Montar apresentação" note="Escolha o cliente, o setor e os itens: os slides saem dos dados do painel. Nada fica guardado." semAtualizar>
        <div className="apr-form">
          <section className="apr-bloco" aria-labelledby="apr-cliente">
            <h3 id="apr-cliente">1. Cliente</h3>
            <div className="apr-site">
              <label>Site da empresa
                <input type="url" inputMode="url" value={site} onChange={(e) => { setSite(e.target.value); setCapaEstado(''); setCapa(null) }} placeholder="empresa.com.br" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), lerSite())} />
              </label>
              <button type="button" className="apr-btn" onClick={lerSite} disabled={!site.trim() || capaEstado === 'lendo'}>{capaEstado === 'lendo' ? 'Lendo…' : 'Ler site'}</button>
            </div>
            {capaEstado === 'ok' && capa && <Estado>Capa com os dados do site: <b>{capa.titulo}</b>{capa.descricao ? ` · ${capa.descricao.slice(0, 90)}${capa.descricao.length > 90 ? '…' : ''}` : ''}</Estado>}
            {capaEstado === 'erro' && <Estado tipo="aviso">Não consegui ler o site; a capa usa o nome digitado abaixo.</Estado>}
            <label className="apr-nome">Nome da empresa {capa?.titulo ? <small className="muted">(opcional: o site já informou)</small> : <small className="muted">(usado na capa quando não há site)</small>}
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Metalúrgica Exemplo" />
            </label>
          </section>
          <section className="apr-bloco" aria-labelledby="apr-setor">
            <h3 id="apr-setor">2. Setor</h3>
            {GRUPOS_SETORES.map((g) => (
              <div key={g} className="apr-grupo">
                <span className="apr-grupo-nome">{g}</span>
                <div className="chips" role="group" aria-label={g}>
                  {SETORES_APRESENTACAO.filter((s) => s.grupo === g).map((s) => (
                    <button key={s.id} type="button" aria-pressed={s.id === setorId} onClick={() => escolherSetor(s.id)}>{s.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </section>
          <section className="apr-bloco" aria-labelledby="apr-itens">
            <h3 id="apr-itens">3. Itens de mercado <small className="muted">· os do setor já vêm marcados</small></h3>
            <div className="chips apr-itens" role="group" aria-label="Itens da apresentação">
              {lista.map((i) => (
                <button key={i.id} type="button" aria-pressed={itens.includes(i.id)} disabled={i.tipo === 'planejado'} title={i.tipo === 'planejado' ? 'Coleta ainda não existe no painel' : undefined} onClick={() => alternar(i.id)}>
                  {i.label}{i.tipo === 'planejado' && <small> · em breve</small>}{i.tipo === 'noticia' && <small> · só matérias</small>}
                </button>
              ))}
            </div>
            <p className="muted apr-dica">Selic, CDI, IPCA e o Focus entram sempre, no slide de cenário.</p>
          </section>
          <section className="apr-bloco" aria-labelledby="apr-periodo">
            <h3 id="apr-periodo">4. Período de comparação</h3>
            <div className="seg" role="group" aria-label="Período">
              {PERIODOS.map((p) => <button key={p.dias} type="button" aria-pressed={p.dias === periodo.dias} onClick={() => setPeriodo(p)}>{p.label}</button>)}
            </div>
          </section>
          <div className="apr-acoes">
            <button type="button" className="apr-btn apr-btn-primario" disabled={!pronto} onClick={apresentar}>Apresentar</button>
            <span className="muted">{setor.label} · {itens.length} {itens.length === 1 ? 'item' : 'itens'} · {periodo.label}{!pronto && ' · informe o site ou o nome da empresa'}</span>
          </div>
        </div>
      </Panel>
      {aberta && <Player roteiro={aberta} onClose={() => setAberta(null)} />}
    </div>
  )
}

// Apresentação em tela: um slide por vez, setas do teclado, toque (deslizar) e botões; Escape sai. Tela cheia opcional.
function Player({ roteiro, onClose }) {
  const [i, setI] = useState(0)
  const ref = useRef(null)
  const slideRef = useRef(null)
  const anim = useRef(null)
  const n = roteiro.length
  const ir = (k) => setI((cur) => Math.max(0, Math.min(n - 1, typeof k === 'function' ? k(cur) : k)))
  useEffect(() => {
    const el = ref.current
    el?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous; if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }
  }, [])
  useLayoutEffect(() => { anim.current = fadeIn(slideRef.current, anim.current) }, [i])
  const onKey = (e) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); ir((c) => c + 1) }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); ir((c) => c - 1) }
    else if (e.key === 'Home') ir(0)
    else if (e.key === 'End') ir(n - 1)
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }
  const touch = useRef(null)
  const onPointerDown = (e) => { touch.current = { x: e.clientX, y: e.clientY } }
  const onPointerUp = (e) => {
    const t = touch.current; touch.current = null
    if (!t) return
    const dx = e.clientX - t.x, dy = e.clientY - t.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) ir((c) => c + (dx < 0 ? 1 : -1))
  }
  const telaCheia = () => { const el = ref.current; if (!el) return; if (document.fullscreenElement) document.exitFullscreen?.(); else el.requestFullscreen?.().catch(() => {}) }
  const s = roteiro[i]
  return (
    <div className="apr-player" role="dialog" aria-modal="true" aria-label="Apresentação" tabIndex={-1} ref={ref} onKeyDown={onKey} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div className={`apr-slide apr-s-${s.kind}`} ref={slideRef} key={i} aria-live="polite" aria-atomic="true">
        <Slide s={s} />
      </div>
      <div className="apr-barra">
        <button type="button" onClick={() => ir((c) => c - 1)} disabled={i === 0} aria-label="Slide anterior">‹</button>
        <span className="apr-contador" aria-label={`Slide ${i + 1} de ${n}`}>{i + 1} / {n}</span>
        <button type="button" onClick={() => ir((c) => c + 1)} disabled={i === n - 1} aria-label="Próximo slide">›</button>
        <span className="apr-barra-sep" />
        <button type="button" onClick={telaCheia}>Tela cheia</button>
        <button type="button" onClick={onClose}>Sair</button>
      </div>
    </div>
  )
}

function Slide({ s }) {
  if (s.kind === 'capa') return <Capa s={s} />
  if (s.kind === 'cenario') return <Cenario s={s} />
  if (s.kind === 'cadeia') return <Cadeia s={s} />
  if (s.kind === 'item') return <Item s={s} />
  if (s.kind === 'agenda') return <Agenda s={s} />
  if (s.kind === 'perguntas') return <Perguntas s={s} />
  return <Fim s={s} />
}

const Rodape = ({ children }) => <footer className="apr-rodape">{children}</footer>

function Capa({ s }) {
  return (
    <div className="apr-capa-grade">
      <div className="apr-capa-texto">
        <p className="apr-kicker">Cenário de mercado para</p>
        <h1>{s.nome}</h1>
        {s.capa?.descricao && <p className="apr-capa-desc">{s.capa.descricao}</p>}
        <p className="apr-capa-setor">{s.setor.label}{s.capa?.dominio ? ` · ${s.capa.dominio}` : ''}</p>
      </div>
      {s.capa?.logo && <img className="apr-capa-logo" src={s.capa.logo} alt={`Logotipo de ${s.nome}`} />}
      <Rodape>Dados de {dataHora(s.agora)} · comparações de {s.periodo.label} · fontes públicas, conferir antes de decidir</Rodape>
    </div>
  )
}

function Cenario({ s }) {
  return (
    <>
      <h2>O cenário em uma linha</h2>
      {s.linhas.length ? (
        <ul className="apr-cenario">
          {s.linhas.map((l) => <li key={l.key}><span className="apr-cen-label">{l.label}</span><b className="apr-cen-valor">{l.valor}</b><small>{l.nota}</small></li>)}
        </ul>
      ) : <p className="apr-vazio">Indicadores indisponíveis no momento.</p>}
      <Rodape>Juros, inflação, câmbio e mediana do Focus · dados de {dataHora(s.agora)}</Rodape>
    </>
  )
}

function Cadeia({ s }) {
  const c = s.setor.cadeia
  return (
    <>
      <h2>A cadeia de {s.setor.label.toLowerCase()}</h2>
      <div className="apr-cadeia">
        <div className="apr-cad-col"><span className="apr-cad-titulo">O que entra</span>{c.entradas.map((e) => <span key={e} className="apr-cad-chip">{e}</span>)}</div>
        <span className="apr-cad-seta" aria-hidden="true">→</span>
        <div className="apr-cad-col apr-cad-meio"><span className="apr-cad-titulo">A empresa</span><span className="apr-cad-chip apr-cad-chip-forte">{c.processo}</span></div>
        <span className="apr-cad-seta" aria-hidden="true">→</span>
        <div className="apr-cad-col"><span className="apr-cad-titulo">Para quem vende</span>{c.saidas.map((e) => <span key={e} className="apr-cad-chip">{e}</span>)}</div>
      </div>
      <p className="apr-cad-trans"><b>Atravessam toda a cadeia:</b> {s.transversais.join(' · ')}</p>
      <Rodape>Cadeia típica do setor; a conversa com o cliente ajusta o que pesa mais.</Rodape>
    </>
  )
}

function Item({ s }) {
  const { item, dado, move, manchetes, periodo } = s
  const pontos = (dado.pontos ?? []).map((p) => ({ t: p.t, bid: p.v }))
  const per = dado.periodo
  return (
    <>
      <h2>{item.label}</h2>
      <div className="apr-item">
        <div className="apr-item-num">
          {dado.indisponivel ? <p className="apr-vazio">{dado.indisponivel}</p> : dado.semSerie ? <p className="apr-vazio">{dado.semSerie}</p> : (
            <>
              <p className="apr-valor">{dado.valorTexto}{dado.unidade && <small> {dado.unidade.replace('US$/', '/')}</small>}</p>
              <p className="apr-quando">{dado.quando}{dado.stale ? ' · sem atualização na última coleta' : ''}</p>
              <ul className="apr-vars">
                {Number.isFinite(dado.dia) && <li className={tom(dado.dia)}><span aria-hidden="true">{MARK[tom(dado.dia)]}</span> {sinal(dado.dia, 2)} <small>hoje</small></li>}
                {Number.isFinite(dado.mes) && <li className={tom(dado.mes)}><span aria-hidden="true">{MARK[tom(dado.mes)]}</span> {sinal(dado.mes)} <small>mês anterior</small></li>}
                <li className={per ? tom(per.pct) : 'flat'}><span aria-hidden="true">{MARK[per ? tom(per.pct) : 'flat']}</span> {per ? sinal(per.pct) : '—'} <small>{periodo.label}{dado.emReais != null ? '' : ''}</small></li>
                {dado.emReais != null && <li className={tom(dado.emReais)}><span aria-hidden="true">{MARK[tom(dado.emReais)]}</span> {sinal(dado.emReais)} <small>{periodo.label} em reais</small></li>}
              </ul>
              {pontos.length > 1 && <div className="apr-spark"><Sparkline points={pontos} tone={per ? tom(per.pct) : 'flat'} height={60} /><small>{dado.pontosNota ?? 'cotação diária'} · {periodo.label}</small></div>}
            </>
          )}
          <p className="apr-frase">{dado.frase}</p>
        </div>
        <div className="apr-item-texto">
          {move.length > 0 && <section><h3>O que mexe no preço</h3><ul>{move.slice(0, 4).map((m) => <li key={m}>{m}</li>)}</ul></section>}
          <section><h3>Na imprensa esta semana</h3>
            {manchetes.length ? <ul className="apr-manchetes">{manchetes.map((m) => <li key={m.link}><time dateTime={new Date(m.t).toISOString()}>{dia(m.t)} {hora(m.t)}</time> {m.title} <small>{m.source}</small></li>)}</ul> : <p className="apr-vazio">Sem matérias coletadas para este item nos últimos dias.</p>}
          </section>
        </div>
      </div>
      <Rodape>Matérias: títulos da imprensa, sem resumo nem análise{dado.emReais != null ? ' · em reais: conversão simples pelo dólar do período, sem prêmio, frete nem impostos' : ''}</Rodape>
    </>
  )
}

function Agenda({ s }) {
  return (
    <>
      <h2>O que pode mexer nas próximas semanas</h2>
      {s.eventos.length ? (
        <ul className="apr-agenda">
          {s.eventos.map((e) => <li key={e.kind + e.t}><time dateTime={new Date(e.t).toISOString()}>{dia(e.t)} <b>{hora(e.t)}</b></time><span className="apr-tag">{e.kind}</span><span>{e.label}</span></li>)}
        </ul>
      ) : <p className="apr-vazio">Sem eventos na agenda dos próximos 30 dias.</p>}
      <Rodape>Horário de Brasília · datas conferidas nas fontes oficiais; "previsto" ainda depende de confirmação</Rodape>
    </>
  )
}

function Perguntas({ s }) {
  return (
    <>
      <h2>Para a conversa</h2>
      <ol className="apr-perguntas">{s.perguntas.map((p) => <li key={p}>{p}</li>)}</ol>
      <Rodape>Perguntas de partida; o cliente diz o que pesa de verdade.</Rodape>
    </>
  )
}

function Fim({ s }) {
  return (
    <div className="apr-capa-grade">
      <div className="apr-capa-texto">
        <p className="apr-kicker">Em resumo</p>
        {s.pontos.length ? <ul className="apr-fim-pontos">{s.pontos.map((p) => <li key={p}>{p}</li>)}</ul> : <p className="apr-capa-desc">Os dados de período não estavam disponíveis para resumir.</p>}
        <p className="apr-capa-setor">Próximo passo: medir o que o cenário muda no caixa de {s.nome}.</p>
      </div>
      <Rodape>Conteúdo informativo, com fontes públicas; não é recomendação. Dados de {dataHora(s.agora)}.</Rodape>
    </div>
  )
}
