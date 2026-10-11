import { useCallback, useEffect, useRef, useState } from 'react'
import { buildData, colunaDe, mesesDisponiveis, tipoParaSub } from './model.js'
import { carregar, gravar, ErroSessao } from './sheets.js'
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

const ABAS = [{ id: 'hoje', nome: 'Hoje' }, { id: 'lanc', nome: 'Lançamentos' }, { id: 'fixas', nome: 'Contas fixas' }]

export default function App() {
  const [tabs, setTabs] = useState(null)
  const [data, setData] = useState(null)
  const [demo, setDemo] = useState(false)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [aba, setAba] = useState('hoje')
  const [mes, setMes] = useState(mesAtual())
  const [pessoa, setPessoa] = useState('todos')
  const [filtro, setFiltro] = useState('todos')
  const [aberto, setAberto] = useState(null)
  const token = useRef(null)

  const aplicar = useCallback((t) => {
    const d = buildData(t)
    const meses = mesesDisponiveis(d.lancamentos)
    setTabs(t)
    setData(d)
    setMes((m) => (meses.length && !meses.includes(m) && m === mesAtual() ? meses[0] : m))
  }, [])

  const voltar = (msg = '') => { esquecerToken(); token.current = null; setTabs(null); setData(null); setDemo(false); setAberto(null); setErro(msg) }

  // Roda uma ação que fala com o Google; sessão vencida volta para a tela de entrada.
  const executar = useCallback(async (fn) => {
    setOcupado(true)
    setErro('')
    try { return await fn() } catch (e) {
      if (e instanceof ErroSessao) voltar(e.message)
      else setErro(e.message || 'Algo deu errado.')
    } finally { setOcupado(false) }
  }, [])

  const carregarTudo = useCallback(() => executar(async () => { aplicar(await carregar(token.current, SHEET_ID)) }), [executar, aplicar])

  useEffect(() => { const t = lerToken(); if (t) { token.current = t; carregarTudo() } }, [carregarTudo])

  const clicarEntrar = () => executar(async () => { token.current = await entrar(CLIENT_ID); aplicar(await carregar(token.current, SHEET_ID)) })
  const verDemo = () => { setDemo(true); aplicar(tabsDemo()) }

  const escrever = (grupos) => (demo ? Promise.resolve() : gravar(token.current, SHEET_ID, grupos))
  const trocar = (lista, id, mudanca) => lista.map((x) => (x.id === id ? { ...x, ...mudanca } : x))

  const acoes = {
    classificar: (l, subId) => executar(async () => {
      const sub = data.subcategorias.find((s) => s.id === subId)
      const cat = data.categorias.find((c) => c.id === sub.categoria)
      const tipo = tipoParaSub(subId, cat)
      const cab = tabs.Lancamentos
      await escrever([
        { range: `Lancamentos!${colunaDe(cab, 'subcategoria_id')}${l.row}`, values: [[subId]] },
        { range: `Lancamentos!${colunaDe(cab, 'tipo')}${l.row}`, values: [[tipo]] },
        { range: `Lancamentos!${colunaDe(cab, 'revisado')}${l.row}`, values: [['Sim']] },
      ])
      setData((d) => ({ ...d, lancamentos: trocar(d.lancamentos, l.id, { sub: subId, subNome: sub.nome, categoria: cat.id, categoriaNome: cat.nome, semCategoria: false, tipo, revisado: true }) }))
      setAberto(null)
    }),
    marcarPago: (f, pago) => executar(async () => {
      await escrever([{ range: `ContasFixas!${colunaDe(tabs.ContasFixas, 'pago')}${f.row}`, values: [[pago ? 'Sim' : 'Não']] }])
      setData((d) => ({ ...d, fixas: trocar(d.fixas, f.id, { pago }) }))
    }),
    valorMes: (f, valor) => executar(async () => {
      await escrever([{ range: `ContasFixas!${colunaDe(tabs.ContasFixas, 'valor_mes')}${f.row}`, values: [[valor]] }])
      setData((d) => ({ ...d, fixas: trocar(d.fixas, f.id, { mes: valor }) }))
    }),
  }

  if (!data) return <Entrada onEntrar={clicarEntrar} onDemo={verDemo} erro={erro} ocupado={ocupado} />

  const meses = mesesDisponiveis(data.lancamentos)
  const limiteMax = [mesAtual(), meses[0]].filter(Boolean).sort().at(-1)
  const limiteMin = meses.at(-1) ?? mesAtual()
  const pessoas = [{ id: 'todos', nome: 'Todos' }, ...data.pessoas]

  return (
    <div className="app">
      <header className="topo">
        <div className="topo-linha">
          <span className="logo">Caixa{demo && <em>exemplo</em>}</span>
          <span className="topo-acoes">
            {!demo && <button className="icone" onClick={carregarTudo} disabled={ocupado} aria-label="Atualizar dados"><Icone nome="atualizar" /></button>}
            <button className="icone" onClick={() => { if (!demo) sair(); voltar() }} aria-label="Sair e apagar dados deste aparelho"><Icone nome="sair" /></button>
          </span>
        </div>
        <div className="topo-linha">
          {aba !== 'fixas' ? (
            <span className="meses">
              <button className="icone" onClick={() => setMes(deslocarMes(mes, -1))} disabled={mes <= limiteMin} aria-label="Mês anterior"><Icone nome="esq" /></button>
              <b>{rotuloMes(mes).replace(/^./, (c) => c.toUpperCase())}</b>
              <button className="icone" onClick={() => setMes(deslocarMes(mes, 1))} disabled={mes >= limiteMax} aria-label="Próximo mês"><Icone nome="dir" /></button>
            </span>
          ) : <b className="meses-fixo">Anotações do mês</b>}
        </div>
        <Segmentos opcoes={pessoas} valor={pessoa} onChange={setPessoa} />
      </header>

      {erro && <p className="toast" role="alert">{erro}<button onClick={() => setErro('')} aria-label="Fechar aviso"><Icone nome="fechar" /></button></p>}

      <main className="miolo">
        {aba === 'hoje' && <Hoje data={data} mes={mes} pessoa={pessoa} irPara={(a, f) => { setAba(a); if (f) setFiltro(f) }} />}
        {aba === 'lanc' && <Lancamentos data={data} mes={mes} pessoa={pessoa} filtro={filtro} setFiltro={setFiltro} abrir={setAberto} />}
        {aba === 'fixas' && <Fixas data={data} pessoa={pessoa} acoes={acoes} ocupado={ocupado} />}
      </main>

      <nav className="nav" aria-label="Seções">
        {ABAS.map((a) => <button key={a.id} className={aba === a.id ? 'on' : ''} aria-current={aba === a.id ? 'page' : undefined} onClick={() => { setAba(a.id); if (a.id === 'lanc') setFiltro('todos') }}>{a.nome}</button>)}
      </nav>

      {aberto && <Classificar lancamento={aberto} data={data} ocupado={ocupado} onFechar={() => setAberto(null)} onEscolher={(subId) => acoes.classificar(aberto, subId)} />}
    </div>
  )
}
