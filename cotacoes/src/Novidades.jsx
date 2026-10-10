// Registro de mudanças para a equipe. Acrescente as novas entradas no topo.
const ENTRIES = [
  { date: '10/10/2026', items: ['As coletas automáticas (cotações, juros, curvas, notícias, feriados) não rodam mais no sábado e no domingo; o app mostra o último dado de sexta e o aviso "mercado fechado (fim de semana)", sem alertas de dado desatualizado.'] },
  { date: '10/10/2026', items: ['Feriados por praça: Brasil, São Paulo, Nova York (Federal Reserve), zona do euro (TARGET), Londres, Tóquio e China (dados oficiais do governo chinês, com dias de compensação). Escolha as praças da sua operação: o Resumo e a aba Cenários avisam os feriados dos próximos dias, e a Calculadora e o FINIMP avisam quando uma data cai em feriado e sugerem o próximo dia útil comum (sem mudar a data sozinhos).', 'Dias úteis do DI na Calculadora e no CDI futuro agora usam os feriados nacionais.', 'Calculadora: taxa ao mês, ao ano ou no período, convertida para o prazo e comparada com o CDI do período.'] },
  { date: '10/10/2026', items: ['Calculadora FINIMP (fase 1): simulação de juros e cronograma na moeda original (USD, EUR, JPY) com taxa informada por você, ACT/360 ou ACT/365F, juros proporcionais ou compostos e estruturas bullet, juros periódicos e amortizações. Memória de cálculo, reconciliação e cópia do cronograma para Excel.'] },
  { date: '10/10/2026', items: ['Nova aba Calculadora: compara uma operação (pré, % do CDI ou CDI + spread) com aplicar no DI pelo mesmo prazo, usando a curva DI x pré da B3. Mostra taxa efetiva, rendimento, diferença em R$ e em bps, e o equivalente em % do CDI.', 'Faixa de juros fixa no topo de todas as abas.'] },
  { date: '10/10/2026', items: ['Botão "?" em gráficos e indicadores (cotações, histórico, paridade, Selic, CDI, SOFR, DI, Treasury, curvas, CDI futuro, Focus, agenda, notícias) com explicação curta: o que é, exemplo e uso na prática.'] },
  { date: '10/10/2026', items: ['CDI futuro: taxa a termo implícita na curva DI x pré da B3, em gráfico e tabela por horizonte (3 meses a 5 anos), na aba Juros.'] },
  { date: '10/10/2026', items: ['Novo painel: tela de Resumo (moedas com minigráfico, juros, manchetes e agenda) e navegação por abas (barra inferior no celular, superior no computador). Toque no quadro da moeda para ver compra/venda, máx./mín. e PTAX.', 'Cotações pela coleta central (a cada 5 min no horário comercial), sem gastar a cota da API de cada usuário; botão "Atualizar agora" (1 por minuto, 30 por dia). O intraday agora se forma de 5 em 5 minutos.', 'Histórico do câmbio: 4 consultas na 1ª abertura do dia e nenhuma nas seguintes.', 'Consulta de cotações em uma única requisição a cada 30 s (a fonte passou a limitar o uso gratuito); preparado para usar chave de API.', 'App instalável no celular (tela inicial, tela cheia) e abertura offline com o último dado.', 'Resiliência: se uma fonte cair, o app mantém o último dado publicado e avisa a data (juros, curvas, SOFR, Focus, PTAX, notícias); o histórico do câmbio tem reserva do BCE.', 'Paridade no padrão de mercado: EUR/USD (dólares por 1 euro); o botão do gráfico inverte para USD/EUR.', 'Agenda de mercado: Copom, FOMC, payroll, IPCA e Focus com horário de Brasília.', 'Cards com variação na semana, no mês e no ano, e volatilidade de 30 dias.', 'Curva de cupom cambial (DI x dólar) ao lado do DI x pré e dos Treasuries.', 'Resumo do dia para o WhatsApp e para o Teams, com câmbio, juros, curvas e Focus.', 'No celular, as seções longas começam recolhidas.'] },
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
