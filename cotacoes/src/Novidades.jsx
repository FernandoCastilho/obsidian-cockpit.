// Registro de mudanças para a equipe. Acrescente as novas entradas no topo.
const ENTRIES = [
  { date: '10/10/2026', items: ['Consulta de cotações em uma única requisição a cada 30 s (a fonte passou a limitar o uso gratuito); preparado para usar chave de API.', 'App instalável no celular (tela inicial, tela cheia) e abertura offline com o último dado.', 'Resiliência: se uma fonte cair, o app mantém o último dado publicado e avisa a data (juros, curvas, SOFR, Focus, PTAX, notícias); o histórico do câmbio tem reserva do BCE.', 'Paridade no padrão de mercado: EUR/USD (dólares por 1 euro); o botão do gráfico inverte para USD/EUR.', 'Agenda de mercado: Copom, FOMC, payroll, IPCA e Focus com horário de Brasília.', 'Cards com variação na semana, no mês e no ano, e volatilidade de 30 dias.', 'Curva de cupom cambial (DI x dólar) ao lado do DI x pré e dos Treasuries.', 'Resumo do dia para o WhatsApp e para o Teams, com câmbio, juros, curvas e Focus.', 'No celular, as seções longas começam recolhidas.'] },
  { date: '09/10/2026', items: ['SOFR com médias de 30/90/180 dias e faixa de percentis.', 'Relógio do país acima de cada cotação.', 'Cotação do CNH por cruzamento quando a direta está defasada.', 'Curvas de juros: DI x pré (B3) e Treasuries (EUA), com comparação entre datas.'] },
]

export default function Novidades() {
  return (
    <details className="novidades">
      <summary>O que há de novo</summary>
      {ENTRIES.map((e) => (
        <div key={e.date}>
          <h3>{e.date}</h3>
          <ul>{e.items.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      ))}
    </details>
  )
}
