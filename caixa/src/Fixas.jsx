import { useState } from 'react'
import { Dinheiro, Icone, Vazio } from './ui.jsx'
import { resumoFixas, valorDaFixa } from './model.js'
import { daPessoa } from './Hoje.jsx'

const quem = { P01: 'Fer paga', P02: 'Iris paga' }

function Linha({ f, acoes, ocupado }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const semValor = f.padrao === null && f.mes === null
  const salvar = () => {
    const n = Number(texto.replace(/\./g, '').replace(',', '.'))
    setEditando(false)
    if (texto.trim() !== '' && Number.isFinite(n) && n >= 0) acoes.valorMes(f, n)
  }
  return (
    <li className={`linha fixa${f.pago ? ' paga' : ''}`}>
      {f.forma === 'cartao' ? <span className="check vago" aria-hidden="true" /> : (
        <button className="check" disabled={ocupado} aria-pressed={f.pago} aria-label={f.pago ? 'Marcar como não paga' : 'Marcar como paga'} onClick={() => acoes.marcarPago(f, !f.pago)}>
          {f.pago && <Icone nome="ok" />}
        </button>
      )}
      <span className="linha-meio">
        <b>{f.desc}</b>
        <small>
          {f.dia ? `dia ${f.dia}` : 'sem dia'}{quem[f.pagador] && ` · ${quem[f.pagador]}`}{f.forma === 'cartao' && ' · no cartão'}
          {f.mes !== null && f.padrao !== null && f.mes !== f.padrao && ` · padrão R$ ${f.padrao.toLocaleString('pt-BR')}`}
        </small>
      </span>
      {editando ? (
        <input className="edita" autoFocus inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={salvar} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} placeholder="0,00" />
      ) : (
        <button className={`valor-btn${semValor ? ' ambar' : ''}`} onClick={() => { setTexto(valorDaFixa(f) ? String(valorDaFixa(f)).replace('.', ',') : ''); setEditando(true) }}>
          {semValor ? 'definir valor' : <Dinheiro valor={-valorDaFixa(f)} />}
        </button>
      )}
    </li>
  )
}

export default function Fixas({ data, pessoa, acoes, ocupado }) {
  const itens = data.fixas.filter((f) => daPessoa(f, pessoa))
  const r = resumoFixas(itens, pessoa === 'todos' ? data.meta : 0)
  const ordem = (a, b) => (a.dia ?? 99) - (b.dia ?? 99)
  const noCartao = itens.filter((f) => f.forma === 'cartao').sort(ordem)
  const abertas = itens.filter((f) => f.forma !== 'cartao' && !f.pago).sort(ordem)
  const pagas = itens.filter((f) => f.forma !== 'cartao' && f.pago).sort(ordem)

  return (
    <div className="tela">
      <section className="heroi">
        <p className="rotulo">Falta pagar</p>
        <Dinheiro valor={r.restante} grande />
        <p className="heroi-sub">
          Total do mês <b><Dinheiro valor={r.total} /></b>
          {r.folga !== null && <> · {r.folga >= 0 ? 'folga de' : 'estouro de'} <b className={r.folga < 0 ? 'vermelho' : ''}><Dinheiro valor={Math.abs(r.folga)} /></b> na meta</>}
        </p>
      </section>
      {r.semValor > 0 && <p className="aviso estatico"><span><b>{r.semValor}</b> {r.semValor === 1 ? 'conta sem valor' : 'contas sem valor'}: toque em “definir valor”.</span></p>}

      <section className="bloco">
        <header className="bloco-topo"><h2>A pagar</h2></header>
        {abertas.length === 0 ? <Vazio>Tudo pago por aqui.</Vazio> : <ul className="lista">{abertas.map((f) => <Linha key={f.id} f={f} acoes={acoes} ocupado={ocupado} />)}</ul>}
      </section>
      {noCartao.length > 0 && (
        <section className="bloco">
          <header className="bloco-topo"><h2>Dentro da fatura do cartão</h2></header>
          <ul className="lista">{noCartao.map((f) => <Linha key={f.id} f={f} acoes={acoes} ocupado={ocupado} />)}</ul>
        </section>
      )}
      {pagas.length > 0 && (
        <section className="bloco">
          <header className="bloco-topo"><h2>Pagas</h2></header>
          <ul className="lista">{pagas.map((f) => <Linha key={f.id} f={f} acoes={acoes} ocupado={ocupado} />)}</ul>
        </section>
      )}
    </div>
  )
}
