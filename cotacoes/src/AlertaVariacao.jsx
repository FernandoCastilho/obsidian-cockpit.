import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIntraday, fromInput } from './useHistory.js'
import { marketDate } from './marketReturns.js'
import { LIMITE_PCT, alertasDoDia, baseDoDia, textoAlerta } from './alertaVariacao.js'
import { notificarAlerta, permissaoNotificacao } from './alertaNotificacao.js'

// Um alerta por moeda/sentido/dia. A faixa não depende da permissão do sistema.
const KEY = 'alerta-variacao'
const ler = () => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch { return {} }
}
const gravar = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* deduplicação apenas nesta sessão */ } }
const firstOf = (s) => (s.status === 'ok' ? baseDoDia(s.data?.points) : null)
const entregue = (entry) => Number.isFinite(entry?.sistemaEnviadoEm) && entry.sistemaEnviadoEm > 0

export default function AlertaVariacao({ quotes }) {
  const testing = typeof navigator !== 'undefined' && navigator.webdriver // o smoke próprio desliga isso
  const today = fromInput(marketDate(Date.now()))
  const usd = useIntraday('USD', today, testing)
  const eur = useIntraday('EUR', today, testing)
  const [estado, setEstado] = useState(ler)
  const estadoRef = useRef(estado)
  const ativo = useRef(true)
  const pendentes = useRef(new Set())
  const pedindo = useRef(false)
  const [perm, setPerm] = useState(permissaoNotificacao)
  const [solicitando, setSolicitando] = useState(false)
  const [pedidoErro, setPedidoErro] = useState('')
  const [falhas, setFalhas] = useState({})
  const [tentativa, setTentativa] = useState(0)
  const alertas = useMemo(() => (testing ? [] : alertasDoDia({ quotes, firsts: { USD: firstOf(usd), EUR: firstOf(eur) } })), [quotes, usd, eur, testing])
  const salvar = useCallback((change) => {
    const hoje = marketDate(Date.now())
    const next = change(Object.fromEntries(Object.entries(estadoRef.current).filter(([k]) => k.startsWith(hoje + ':'))))
    estadoRef.current = next
    gravar(next)
    if (ativo.current) setEstado(next)
  }, [])

  useEffect(() => {
    ativo.current = true
    const atualizar = () => { if (!document.hidden) setPerm(permissaoNotificacao()) }
    window.addEventListener('focus', atualizar)
    document.addEventListener('visibilitychange', atualizar)
    return () => {
      ativo.current = false
      window.removeEventListener('focus', atualizar)
      document.removeEventListener('visibilitychange', atualizar)
    }
  }, [])

  useEffect(() => {
    if (perm !== 'granted') return
    for (const a of alertas) {
      const entry = estadoRef.current[a.id]
      if (entry?.dispensado || entregue(entry) || pendentes.current.has(a.id)) continue
      pendentes.current.add(a.id)
      notificarAlerta(a).then((enviado) => {
        // O antigo `notificado` era gravado mesmo sem envio e não comprova entrega.
        // Persistir só depois que o navegador aceitar a notificação, sem presumir que a pessoa a viu.
        if (enviado) salvar((s) => ({ ...s, [a.id]: { ...s[a.id], sistemaEnviadoEm: Date.now() } }))
        if (ativo.current) {
          setFalhas((s) => ({ ...s, [a.id]: !enviado }))
          setPerm(permissaoNotificacao())
        }
      }).finally(() => pendentes.current.delete(a.id))
    }
  }, [alertas, perm, tentativa, salvar])

  const visiveis = alertas.filter((a) => !estado[a.id]?.dispensado)
  const falhou = visiveis.some((a) => falhas[a.id] && !entregue(estado[a.id]))
  const dispensar = (id) => salvar((s) => ({ ...s, [id]: { ...s[id], dispensado: true } }))
  const pedir = async () => {
    if (pedindo.current) return
    const atual = permissaoNotificacao()
    setPerm(atual)
    if (atual !== 'default') return
    pedindo.current = true; setSolicitando(true); setPedidoErro('')
    try { setPerm(await Notification.requestPermission()) }
    catch { setPedidoErro('Não foi possível abrir o pedido. Confira as permissões de notificação deste site no navegador.') }
    finally { pedindo.current = false; if (ativo.current) setSolicitando(false) }
  }

  if (testing || (!visiveis.length && perm === 'granted')) return null
  return (
    <section className="alerta-variacao" aria-label="Alertas de câmbio" role="status" aria-live="polite">
      {visiveis.map((a) => (
        <div key={a.id} className={`alerta-var-item ${a.dir}`}>
          <span aria-hidden="true">{a.dir === 'alta' ? '▲' : '▼'}</span>
          <p><b>Alerta de variação (acima de {LIMITE_PCT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%):</b> {textoAlerta(a)}</p>
          <button type="button" className="btn" onClick={() => dispensar(a.id)} aria-label={`Dispensar alerta do ${a.nome.toLowerCase()}`}>Ok</button>
        </div>
      ))}
      {perm !== 'granted' && <div className="alerta-var-permissao">
        {perm === 'default' && <>
          <p><b>Ative as notificações de câmbio.</b> Autorize este navegador para receber os alertas de dólar e euro também no sistema.</p>
          <button type="button" className="btn alerta-var-perm" onClick={pedir} disabled={solicitando}>{solicitando ? 'Aguardando sua escolha…' : 'Permitir notificações de câmbio'}</button>
        </>}
        {perm === 'denied' && <p><b>Notificações bloqueadas.</b> Para ativar, altere a permissão de notificações deste site nas configurações do navegador ou do aplicativo. O navegador não permite repetir o pedido enquanto houver bloqueio.</p>}
        {perm === 'indisponivel' && <p><b>Notificações do sistema indisponíveis neste navegador.</b> No iPhone ou iPad, adicione o painel à Tela de Início e abra por lá para verificar o suporte. Os alertas continuam aparecendo dentro do painel.</p>}
        {pedidoErro && <p>{pedidoErro}</p>}
      </div>}
      {falhou && perm === 'granted' && <p>Não foi possível enviar a notificação do sistema. O alerta permanece no painel. <button type="button" className="linklike alerta-var-perm" onClick={() => setTentativa((n) => n + 1)}>Tentar enviar novamente</button></p>}
      <p className="muted alerta-var-metodo">Dólar e euro: mais de ±0,30% desde a primeira cotação disponível a partir das 9h de Brasília. Esta referência difere do Δ dia da tabela. Verificação enquanto o app está aberto e visível; não há monitoramento contínuo em segundo plano nem com o app fechado.</p>
    </section>
  )
}
