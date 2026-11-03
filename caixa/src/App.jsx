import { useCallback, useEffect, useRef, useState } from 'react'
import { buildData, mesesDisponiveis, tipoParaSub } from './model.js'
import { carregar, gravarRegistro, esquecerPendencia, pendingOperationId, ErroSessao, ErroConflito, ErroGravacaoIncerta } from './sheets.js'
import { TABLES, recordKey, periodFor } from './journal.js'
import { entrar, esquecerToken, lerToken, sair } from './auth.js'
import { tabsDemo } from './demo.js'
import { CLIENT_ID, SHEET_ID } from './config.js'
import { deslocarMes, mesAtual, rotuloMes } from './format.js'
import { Icone, Segmentos } from './ui.jsx'
import Entrada from './Entrada.jsx'
import Hoje from './Hoje.jsx'
import Lancamentos from './Lancamentos.jsx'
import Fixas from './Fixas.jsx'
import Classificar from './Classificar.jsx'
import Conflitos from './Conflitos.jsx'

const ABAS = [{ id: 'hoje', nome: 'Hoje' }, { id: 'lanc', nome: 'Lançamentos' }, { id: 'fixas', nome: 'Contas fixas' }]
const PLANILHA_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit'
const conflitosAtuais = (meta) => Object.values(meta?.records ?? {}).filter((r) => r.conflict && r.active !== false && r.periodo === periodFor(r.aba))

export default function App() {
  const tabs = useRef(null)
  const token = useRef(null)
  const operacaoEmCurso = useRef(false)
  const pendencia = useRef(null)
  const [data, setData] = useState(null)
  const [sync, setSync] = useState(null)
  const [demo, setDemo] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [somenteConsulta, setSomenteConsulta] = useState(false)
  const [aba, setAba] = useState('hoje')
  const [mes, setMes] = useState(mesAtual())
  const [pessoa, setPessoa] = useState('todos')
  const [filtro, setFiltro] = useState('todos')
  const [aberto, setAberto] = useState(null)
  const [revisando, setRevisando] = useState(false)

  const aplicar = useCallback((t) => {
    const d = buildData(t)
    let meta = t._caixa ?? null
    if (meta?.pendingOperationId && ['accepted', 'conflict'].includes(meta.pendingStatus)) {
      const outcome = meta.operations?.[meta.pendingOperationId]
      esquecerPendencia(SHEET_ID, meta.pendingOperationId)
      if (meta.pendingStatus === 'accepted') setSucesso('Alteração confirmada.')
      else setErro(outcome?.accepted
        ? 'A versão foi registrada no Caixa, mas a planilha mudou. Revise os valores para continuar.'
        : 'Outra alteração foi confirmada antes. Os dados foram atualizados; revise antes de tentar novamente.')
      meta = { ...meta, pendingOperationId: null, pendingStatus: null }
    }
    pendencia.current = meta?.pendingOperationId ?? null
    for (const [nome, lista] of [['Lancamentos', 'lancamentos'], ['ContasFixas', 'fixas']]) {
      const periodo = meta?.state?.periods?.[nome] ?? periodFor(nome)
      d[lista] = d[lista].map((item) => {
        const registro = meta?.records?.[recordKey(nome, item.id, periodo)]
        return registro ? { ...item, _conflito: Boolean(registro.conflict), _gravacao: { revision: registro.revision, periodo: registro.periodo, esperado: [TABLES[nome].headers.slice(), registro.row.slice()] } } : item
      })
    }
    const meses = mesesDisponiveis(d.lancamentos)
    tabs.current = t
    setSync(meta)
    setSomenteConsulta(!meta?.configured || Object.keys(TABLES).some((nome) => meta?.state?.periods?.[nome] && meta.state.periods[nome] !== periodFor(nome)))
    setData(d)
    if (!conflitosAtuais(meta).length) setRevisando(false)
    setMes((m) => (meses.length && !meses.includes(m) && m === mesAtual() ? meses[0] : m))
  }, [])

  const voltar = useCallback((msg = '') => {
    esquecerToken()
    token.current = null
    tabs.current = null
    setData(null)
    setSync(null)
    setDemo(false)
    setAberto(null)
    setRevisando(false)
    setSomenteConsulta(false)
    setSucesso('')
    setErro(msg)
  }, [])

  const executar = useCallback(async (fn) => {
    if (operacaoEmCurso.current) return false
    operacaoEmCurso.current = true
    setOcupado(true)
    setErro('')
    setSucesso('')
    try { return (await fn()) !== false } catch (e) {
      if (e instanceof ErroSessao) voltar(e.message)
      else {
        setSomenteConsulta(true)
        if (e instanceof ErroGravacaoIncerta) {
          tabs.current = null
          pendencia.current = e.operationId ?? pendencia.current
          setSync((m) => ({ ...(m ?? {}), pendingOperationId: pendencia.current, pendingStatus: 'pending' }))
        } else if (e instanceof ErroConflito && token.current) {
          const sessao = token.current
          try {
            const atuais = e.tabs ?? await carregar(sessao, SHEET_ID)
            if (token.current === sessao) aplicar(atuais)
          } catch { /* A última consulta permanece visível, sem permitir nova escrita. */ }
        }
        setErro(e.message || 'Não foi possível concluir. Atualize os dados antes de alterar novamente.')
      }
      return false
    } finally { operacaoEmCurso.current = false; setOcupado(false) }
  }, [aplicar, voltar])

  const carregarTudo = useCallback(() => executar(async () => {
    const sessao = token.current
    const atuais = await carregar(sessao, SHEET_ID)
    if (token.current !== sessao) return false
    aplicar(atuais)
    return true
  }), [executar, aplicar])

  useEffect(() => { const t = lerToken(); if (t) { token.current = t; carregarTudo() } }, [carregarTudo])

  const clicarEntrar = () => executar(async () => {
    const sessao = await entrar(CLIENT_ID)
    token.current = sessao
    const atuais = await carregar(sessao, SHEET_ID)
    if (token.current !== sessao) return false
    aplicar(atuais)
    return true
  })
  const verDemo = () => {
    if (operacaoEmCurso.current) return
    token.current = null
    setDemo(true)
    setErro('')
    setSucesso('')
    aplicar(tabsDemo())
  }
  const sairAgora = () => {
    if (operacaoEmCurso.current) return
    const id = pendencia.current ?? sync?.pendingOperationId ?? pendingOperationId(SHEET_ID)
    if (id) esquecerPendencia(SHEET_ID, id)
    pendencia.current = null
    if (!demo) sair()
    voltar()
  }

  const pedido = (item, nome, mudancas) => {
    if (!demo && !item._gravacao) throw new ErroConflito('Atualize os dados antes de alterar este registro.')
    return { aba: nome, id: item.id, revision: item._gravacao?.revision ?? '', periodo: item._gravacao?.periodo ?? periodFor(nome), esperado: item._gravacao?.esperado, mudancas, mode: 'edit' }
  }
  const escrever = async (p) => {
    if (demo) return true
    if (somenteConsulta || !tabs.current || !sync?.configured || pendencia.current) throw new ErroConflito('Atualize os dados antes de fazer outra alteração.')
    const sessao = token.current
    const resultado = await gravarRegistro(sessao, SHEET_ID, p)
    if (token.current !== sessao) return false
    aplicar(resultado.tabs)
    setSucesso('Alteração salva.')
    return true
  }
  const trocar = (lista, id, mudanca) => lista.map((x) => (x.id === id ? { ...x, ...mudanca } : x))

  const acoes = {
    classificar: (l, subId) => executar(async () => {
      const sub = data.subcategorias.find((s) => s.id === subId)
      const cat = sub && data.categorias.find((c) => c.id === sub.categoria)
      if (!sub || !cat) throw new ErroConflito('A categoria mudou. Atualize os dados e escolha novamente.')
      const tipo = tipoParaSub(subId, cat)
      if (!await escrever(pedido(l, 'Lancamentos', { subcategoria_id: subId, tipo, revisado: 'Sim' }))) return false
      if (demo) setData((d) => d ? { ...d, lancamentos: trocar(d.lancamentos, l.id, { sub: subId, subNome: sub.nome, categoria: cat.id, categoriaNome: cat.nome, semCategoria: false, tipo, revisado: true }) } : d)
      setAberto(null)
      return true
    }),
    marcarPago: (f, pago) => executar(async () => {
      if (!await escrever(pedido(f, 'ContasFixas', { pago: pago ? 'Sim' : 'Não' }))) return false
      if (demo) setData((d) => d ? { ...d, fixas: trocar(d.fixas, f.id, { pago }) } : d)
      return true
    }),
    valorMes: (f, valor) => executar(async () => {
      if (!await escrever(pedido(f, 'ContasFixas', { valor_mes: valor }))) return false
      if (demo) setData((d) => d ? { ...d, fixas: trocar(d.fixas, f.id, { mes: valor }) } : d)
      return true
    }),
  }
  const resolver = (r, mode) => executar(async () => {
    if (!r.sourceRow) throw new ErroConflito('Corrija o registro na planilha e atualize os dados antes de continuar.')
    const ok = await escrever({ aba: r.aba, id: r.id, revision: r.revision, periodo: r.periodo, esperado: [TABLES[r.aba].headers.slice(), r.row.slice()], fonteEsperada: r.sourceRow.slice(), mudancas: {}, mode })
    if (ok) setRevisando(false)
    return ok
  })

  if (!data) return <Entrada onEntrar={clicarEntrar} onDemo={verDemo} erro={erro} ocupado={ocupado} />

  const meses = mesesDisponiveis(data.lancamentos)
  const limiteMax = [mesAtual(), meses[0]].filter(Boolean).sort().at(-1)
  const limiteMin = meses.at(-1) ?? mesAtual()
  const pessoas = [{ id: 'todos', nome: 'Todos' }, ...data.pessoas]
  const conflitos = conflitosAtuais(sync)
  const pendente = !demo && (sync?.pendingStatus === 'pending' || Boolean(pendencia.current))
  const bloqueado = ocupado || (!demo && (somenteConsulta || !sync?.configured || pendente))
  const conflitoAberto = aberto?._gravacao && sync?.records?.[recordKey('Lancamentos', aberto.id, aberto._gravacao.periodo)]?.conflict

  return (
    <div className="app">
      <header className="topo">
        <div className="topo-linha">
          <span className="logo">Caixa{demo && <em>exemplo</em>}</span>
          <span className="topo-acoes">
            {!demo && <button className="icone" onClick={carregarTudo} disabled={ocupado} aria-label="Atualizar dados"><Icone nome="atualizar" /></button>}
            <button className="icone" onClick={sairAgora} disabled={ocupado} aria-label="Sair e apagar dados deste aparelho"><Icone nome="sair" /></button>
          </span>
        </div>
        <div className="topo-linha">
          {aba !== 'fixas' ? (
            <span className="meses">
              <button className="icone" onClick={() => setMes(deslocarMes(mes, -1))} disabled={mes <= limiteMin} aria-label="Mês anterior"><Icone nome="esq" /></button>
              <b>{rotuloMes(mes).replace(/^./, (c) => c.toUpperCase())}</b>
              <button className="icone" onClick={() => setMes(deslocarMes(mes, 1))} disabled={mes >= limiteMax} aria-label="Próximo mês"><Icone nome="dir" /></button>
            </span>
          ) : <b className="meses-fixo">Anotações de {rotuloMes(sync?.state?.periods?.ContasFixas ?? mesAtual())}</b>}
        </div>
        <Segmentos opcoes={pessoas} valor={pessoa} onChange={setPessoa} />
      </header>

      {erro && <p className="toast" role="alert">{erro}{!demo && <button disabled={ocupado} onClick={carregarTudo}>Atualizar</button>}<button onClick={() => setErro('')} aria-label="Fechar aviso"><Icone nome="fechar" /></button></p>}
      {sucesso && <p className="salvo" role="status">{sucesso}</p>}
      {!demo && pendente && <section className="aviso recon-aviso" role="status"><span>Ainda não foi possível verificar se a alteração foi registrada. Atualize para conferir. Se o problema persistir, saia e entre novamente antes de alterar.</span><button className="aviso-acao" disabled={ocupado} onClick={carregarTudo}>Atualizar</button></section>}
      {!demo && !pendente && (somenteConsulta || !sync?.configured) && <section className="aviso recon-aviso" role="status"><span>As alterações estão indisponíveis agora. Você pode continuar consultando.</span><button className="aviso-acao" disabled={ocupado} onClick={carregarTudo}>Atualizar</button></section>}
      {!demo && conflitos.length > 0 && <section className="aviso recon-aviso" role="status"><span>A planilha mudou. Revise {conflitos.length} {conflitos.length === 1 ? 'lançamento' : 'lançamentos'} antes de alterar esses registros. Os valores da última confirmação foram preservados.</span><button className="aviso-acao" disabled={ocupado || pendente} onClick={() => { setAberto(null); setErro(''); setSucesso(''); setRevisando(true) }}>Revisar</button></section>}

      <main className="miolo">
        {aba === 'hoje' && <Hoje data={data} mes={mes} pessoa={pessoa} irPara={(a, f) => { setAba(a); if (f) setFiltro(f) }} />}
        {aba === 'lanc' && <Lancamentos data={data} mes={mes} pessoa={pessoa} filtro={filtro} setFiltro={setFiltro} abrir={(l) => { if (!bloqueado && !l._conflito) setAberto(l) }} />}
        {aba === 'fixas' && <Fixas data={data} pessoa={pessoa} acoes={acoes} ocupado={bloqueado} />}
      </main>

      <nav className="nav" aria-label="Seções">{ABAS.map((a) => <button key={a.id} className={aba === a.id ? 'on' : ''} aria-current={aba === a.id ? 'page' : undefined} onClick={() => { setAba(a.id); if (a.id === 'lanc') setFiltro('todos') }}>{a.nome}</button>)}</nav>
      {aberto && <Classificar lancamento={aberto} data={data} ocupado={bloqueado || Boolean(conflitoAberto)} onFechar={() => { if (!ocupado) setAberto(null) }} onEscolher={(subId) => acoes.classificar(aberto, subId)} />}
      {revisando && conflitos.length > 0 && <Conflitos records={conflitos} data={data} ocupado={ocupado || pendente} erro={erro} onFechar={() => { if (!ocupado) setRevisando(false) }} onResolver={resolver} onAtualizar={carregarTudo} planilhaUrl={PLANILHA_URL} />}
    </div>
  )
}
