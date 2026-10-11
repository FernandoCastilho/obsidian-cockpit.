import { patrimonio, metasResumo, dividasResumo, aportes } from './analise.js'
import { money, monthName } from './format.js'
import Money from './Money.jsx'
import { Bar } from './Mes.jsx'
import { BankBadge } from './Icon.jsx'

const dataBr = (ym) => (ym ? monthName(ym) : '')

export default function Patrimonio({ data, pessoa }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const p = patrimonio(data, { pessoa, hoje })
  const metas = metasResumo(data, { pessoa, hoje })
  const dividas = dividasResumo(data, { pessoa, hoje })
  const ap = aportes(data, { pessoa })
  return (
    <>
      <section className="hero" aria-label="Patrimônio">
        <div className="hero-main">
          <span className="label">Patrimônio líquido</span>
          <b className={`big ${p.liquido < 0 ? 'neg-text' : ''}`}><Money v={p.liquido} /></b>
          {(p.dividaSemSaldo || p.contaSemSaldo) && <span className="delta"><em>incompleto: faltam saldos na planilha</em></span>}
        </div>
        <dl className="hero-side">
          <div><dt>Em conta</dt><dd><Money v={p.liquidez} /></dd></div>
          <div><dt>Investido</dt><dd><Money v={p.investido} /></dd></div>
          <div><dt>Dívidas</dt><dd><Money v={p.devido} /></dd></div>
        </dl>
      </section>

      <section className="panel">
        <h2>Contas</h2>
        <ul className="rows tight">
          {p.contas.map(({ conta, saldo }) => (
            <li key={conta.id} className="line">
              <span className="cat"><BankBadge banco={conta.banco} size={26} />{conta.apelido}</span>
              {saldo === null ? <span className="mut small">sem saldo inicial</span> : <span className={`num ${saldo < 0 ? 'neg-text' : ''}`}><Money v={saldo} /></span>}
            </li>
          ))}
        </ul>
        <p className="mut small">Saldo = saldo inicial informado + movimentos realizados depois da data do saldo.</p>
      </section>

      <section className="panel">
        <h2>Investimentos</h2>
        <dl className="stats three">
          <div><dt>Aportes líquidos</dt><dd><Money v={ap.total} cents={false} /></dd></div>
          <div><dt>Posição informada</dt><dd><Money v={p.posicoes.reduce((a, x) => a + x.liquido, 0)} cents={false} /></dd></div>
          <div><dt>Ativos</dt><dd>{p.posicoes.length}</dd></div>
        </dl>
        {p.posicoes.length === 0 && <p className="mut small">Sem posições na aba Posicoes. Aportes e resgates vêm dos lançamentos do extrato.</p>}
        <ul className="rows tight">
          {p.posicoes.map((x) => (
            <li key={`${x.conta}|${x.ativo}`} className="line"><span>{x.ativo} <small className="mut">{x.classe}</small></span><span className="num"><Money v={x.liquido} /></span></li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Metas</h2>
        {metas.length === 0 && <p className="mut">Nenhuma meta. Cadastre na aba Metas da planilha.</p>}
        <ul className="rows">
          {metas.map((m) => (
            <li key={m.id}>
              <div className="line"><b>{m.nome}</b><span className="num">{money(m.atual)} <em>de {money(m.alvo)}</em></span></div>
              <Bar value={m.atual} max={m.alvo} />
              <small className="mut">{Math.round(m.pct * 100)}%{m.mensal ? ` · ${money(m.mensal)} por mês até ${dataBr(m.prazo?.slice(0, 7))}` : ''}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Dívidas</h2>
        {dividas.length === 0 && <p className="mut">Nenhuma dívida cadastrada.</p>}
        <ul className="rows">
          {dividas.map((d) => (
            <li key={d.id}>
              <div className="line"><b>{d.descricao}</b><span className="num">{d.saldo === null ? <span className="mut small">saldo devedor não informado</span> : <Money v={d.saldo} cents={false} />}</span></div>
              <small className="mut">
                {money(d.parcela)} por mês · {d.restantes} parcelas restantes{d.quitacao ? ` · quita em ${dataBr(d.quitacao)}` : ''}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
