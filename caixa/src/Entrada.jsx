export default function Entrada({ onEntrar, onDemo, erro, ocupado }) {
  return (
    <main className="entrada">
      <span className="marca" aria-hidden="true">
        <svg viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="currentColor" /><path d="M20 22h24v6H20zM20 33h24v9H20z" fill="var(--papel)" /><circle cx="44" cy="37.5" r="2.6" fill="currentColor" /></svg>
      </span>
      <h1>Caixa</h1>
      <p className="entrada-texto">O resultado do mês, as contas a pagar e os lançamentos da família, lidos direto da sua planilha no Google Drive.</p>
      <button className="primario" onClick={onEntrar} disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar com Google'}</button>
      <button className="secundario" onClick={onDemo}>Ver com dados de exemplo</button>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <p className="entrada-rodape">Os dados ficam na sua planilha. Este aparelho guarda só a sessão, e ela some ao sair.</p>
    </main>
  )
}
