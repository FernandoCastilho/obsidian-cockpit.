import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildData, monthsWithData } from './model.js'
import { clearToken, getToken, hasToken, revoke } from './auth.js'
import { fetchTabs } from './sheets.js'
import { demoTabs } from './demo.js'
import { currentMonth, monthName, shiftMonth } from './format.js'
import Mes from './Mes.jsx'
import Lancamentos from './Lancamentos.jsx'
import Orcamento from './Orcamento.jsx'
import Anual from './Anual.jsx'
import Ajustes from './Ajustes.jsx'

const DEFAULT_SHEET = import.meta.env.VITE_SHEET_ID || '1jPVxzkRRyS-vrYd5sL50sL70itA3hUSyXfaJ0CxlD9o'
const VIEWS = [['mes', 'Mês'], ['lanc', 'Lançamentos'], ['orc', 'Orçamento'], ['ano', 'Anual']]

const store = {
  get: (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(`financas:${k}`) ?? 'null') ?? d
    } catch {
      return d
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(`financas:${k}`, JSON.stringify(v))
    } catch {}
  },
}

export default function App() {
  const [cfg, setCfg] = useState(() => ({ clientId: store.get('clientId', import.meta.env.VITE_GOOGLE_CLIENT_ID || ''), sheetId: store.get('sheetId', DEFAULT_SHEET) }))
  const [cache, setCache] = useState(() => store.get('cache', null))
  const [demo, setDemo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState('mes')
  const [month, setMonth] = useState(currentMonth)
  const [pessoa, setPessoa] = useState('TODOS')
  const [ajustes, setAjustes] = useState(false)

  const source = demo ? { tabs: demoTabs(), at: Date.now() } : cache
  const data = useMemo(() => (source ? buildData(source.tabs) : null), [source])

  // Ao carregar dados pela primeira vez, vai para o último mês que tem lançamentos.
  useEffect(() => {
    if (!data) return
    const ms = monthsWithData(data)
    if (ms.length && !ms.includes(month)) setMonth(ms[ms.length - 1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const atualizar = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      let token = await getToken(cfg.clientId)
      let tabs
      try {
        tabs = await fetchTabs(cfg.sheetId, token)
      } catch (e) {
        if (e.status !== 401) throw e
        clearToken()
        token = await getToken(cfg.clientId)
        tabs = await fetchTabs(cfg.sheetId, token)
      }
      const next = { tabs, at: Date.now() }
      setCache(next)
      store.set('cache', next)
      setDemo(false)
    } catch (e) {
      setError(e.message || 'Não foi possível atualizar.')
    } finally {
      setBusy(false)
    }
  }, [cfg])

  // Se já há um login válido nesta sessão, atualiza sozinho ao abrir.
  useEffect(() => {
    if (cfg.clientId && hasToken()) atualizar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const salvar = (next) => {
    setCfg(next)
    store.set('clientId', next.clientId)
    store.set('sheetId', next.sheetId)
    setAjustes(false)
  }

  // Apaga do aparelho os dados financeiros guardados e encerra o acesso ao Google.
  const limpar = () => {
    revoke()
    setCache(null)
    setDemo(false)
    setError('')
    try {
      localStorage.removeItem('financas:cache')
    } catch {}
    setAjustes(false)
  }

  const pessoas = data ? [{ id: 'TODOS', nome: 'Todos' }, ...data.pessoas] : []
  const vazio = !data || data.lancamentos.length === 0

  return (
    <div className="app">
      <header className="top">
        <div className="brand">Caixa Central</div>
        <nav className="tabs" aria-label="Seções">
          {VIEWS.map(([id, nome]) => (
            <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>
              {nome}
            </button>
          ))}
        </nav>
        <div className="actions">
          <button onClick={atualizar} disabled={busy}>
            {busy ? 'Atualizando…' : 'Atualizar dados'}
          </button>
          <button className="ghost" onClick={() => setAjustes(true)} aria-label="Ajustes">
            Ajustes
          </button>
        </div>
      </header>

      {data && (
        <div className="bar">
          <div className="months">
            <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">‹</button>
            <strong>{view === 'ano' ? month.slice(0, 4) : monthName(month)}</strong>
            <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">›</button>
          </div>
          <div className="chips" role="group" aria-label="Pessoa">
            {pessoas.map((p) => (
              <button key={p.id} className={pessoa === p.id ? 'chip on' : 'chip'} onClick={() => setPessoa(p.id)}>
                {p.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <main>
        {error && <p className="alert" role="alert">{error}</p>}
        {vazio ? (
          <section className="empty">
            <h2>{data ? 'A planilha ainda não tem lançamentos' : 'Conecte a planilha'}</h2>
            <p>{data ? 'Importe os extratos na aba Lancamentos e toque em Atualizar dados.' : 'Entre com sua conta Google para ler a planilha Caixa Central, ou veja o app com dados de exemplo.'}</p>
            <div className="row">
              <button className="primary" onClick={atualizar} disabled={busy}>Entrar com Google</button>
              <button onClick={() => setDemo(true)}>Ver exemplo</button>
              <button onClick={() => setAjustes(true)}>Ajustes</button>
            </div>
          </section>
        ) : view === 'mes' ? (
          <Mes data={data} month={month} pessoa={pessoa} />
        ) : view === 'lanc' ? (
          <Lancamentos data={data} month={month} pessoa={pessoa} />
        ) : view === 'orc' ? (
          <Orcamento data={data} month={month} pessoa={pessoa} />
        ) : (
          <Anual data={data} year={Number(month.slice(0, 4))} pessoa={pessoa} />
        )}
      </main>

      <footer>
        {demo ? 'Dados de exemplo. ' : ''}
        {source ? `Última leitura: ${new Date(source.at).toLocaleString('pt-BR')}.` : 'Nenhum dado carregado.'}
        {demo && <button className="link" onClick={() => setDemo(false)}>Sair do exemplo</button>}
      </footer>

      {ajustes && <Ajustes cfg={cfg} onSave={salvar} onClose={() => setAjustes(false)} onClear={limpar} />}
    </div>
  )
}
