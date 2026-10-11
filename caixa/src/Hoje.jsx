import { Dinheiro, Vazio } from './ui.jsx'
import { resumoDoMes, resumoFixas, proximosVencimentos, valorDaFixa } from './model.js'
import { inteiroBr, nomeMes } from './format.js'

export const daPessoa = (item, pessoa) => pessoa === 'todos' || item.pessoa === pessoa

export default function Hoje({ data, mes, pessoa, irPara }) {
  const r = resumoDoMes(data.lancamentos, mes, pessoa)
  const fixas = data.fixas.filter((f) => daPessoa(f, pessoa))
  const rf = resumoFixas(fixas, pessoa === 'todos' ? data.meta : 0)
  const hoje = new Date()
  const proximas = proximosVencimentos(fixas, hoje.getDate()).slice(0, 4)
  const maior = r.categorias[0]?.valor || 1
  const pct = rf.total ? Math.round((rf.pago / rf.total) * 100) : 0

  return (
    <div className="tela">
      <section className="heroi">
        <p className="rotulo">Resultado de {nomeMes(mes)}</p>
        <span className="destaque"><Dinheiro valor={r.resultado} grande sinal /></span>
        <p className="heroi-sub">
          Entrou <b><Dinheiro valor={r.receitas} /></b> · Saiu <b><Dinheiro valor={r.despesasLiquidas} /></b>
        </p>
        {(r.aSair > 0 || r.aEntrar > 0) && (
          <p className="heroi-sub suave">Ainda previsto: <Dinheiro valor={-r.aSair} /> a sair{r.aEntrar > 0 && <> e <Dinheiro valor={r.aEntrar} /> a entrar</>}</p>
        )}
      </section>

      {r.semCategoria > 0 && (
        <button className="aviso" onClick={() => irPara('lanc', 'semcat')}>
          <span><b>{r.semCategoria}</b> {r.semCategoria === 1 ? 'lançamento sem categoria' : 'lançamentos sem categoria'}</span>
          <span className="aviso-acao">Classificar →</span>
        </button>
      )}

      <section className="bloco">
        <header className="bloco-topo">
          <h2>Contas fixas</h2>
          <button className="link" onClick={() => irPara('fixas')}>Ver todas</button>
        </header>
        {rf.quantidade === 0 ? <Vazio>Nenhuma conta fixa anotada.</Vazio> : (
          <>
            <div className="progresso" aria-label={`${pct}% pago`}><i style={{ width: `${pct}%` }} /></div>
            <p className="progresso-txt">
              <span><b>{rf.quitadas}</b> de {rf.quantidade} pagas</span>
              <span>Falta <b><Dinheiro valor={rf.restante} /></b></span>
            </p>
            <ul className="lista">
              {proximas.map((f) => (
                <li key={f.id} className="linha">
                  <span className={`dia${f.atrasada ? ' atraso' : ''}`}>{String(f.dia).padStart(2, '0')}</span>
                  <span className="linha-meio"><b>{f.desc}</b>{f.atrasada && <small className="atraso">venceu</small>}</span>
                  <Dinheiro valor={-valorDaFixa(f)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="bloco">
        <header className="bloco-topo"><h2>Para onde foi</h2></header>
        {r.categorias.length === 0 ? <Vazio>Sem despesas neste mês.</Vazio> : (
          <ul className="lista">
            {r.categorias.slice(0, 6).map((c, i) => (
              <li key={c.nome} className="barra-linha">
                <span className="barra-nome">{c.nome}</span>
                <span className="barra-valor">R$ {inteiroBr(c.valor)}</span>
                <span className="barra"><i className={i === 0 ? 'topo' : ''} style={{ width: `${Math.max(3, (c.valor / maior) * 100)}%` }} /></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
