# Cotação do dia: diagnóstico de atualidade

Produção investigada: PR147, SHA89299d11c16c08b42eaceaf53a7403883b707517. Leituras em26/10/2026, sem reiniciar/disparar/cancelar coleta, sem ler credenciais.

## Evidências

- Navegador: `useQuotes` relê o arquivo central a cada60s enquanto visível. O coletor tenta publicar a cada5min na janela configurada09h30–18hBRT e por hora fora dela, sem garantia de agendamento GitHub. Isso não comprova mercado aberto/fechado. O arquivo ainda pode ter cache CDN.
-20:48UTC: central gerado20:45:17.934UTC, USD5,4014 com timestamp20:45:17UTC; EUR timestamp20:41:48UTC. A chamada anônima direta retornou USD5,4229, timestamp18:58:19UTC, aproximadamente110min anterior à consulta. HTTP200 não comprova preço atual.
-20:51UTC: mesma resposta anônima, sem tick novo. `Cache-Control: public, max-age=300, stale-while-revalidate=259200, stale-if-error=259200` observado. A documentação fala em cache anônimo de1min; a observação não confirmou esse limite. Não acrescentamos parâmetro para contornar cache.
-Caminho realmente usado pelo app (`raw.../data/quotes.json?t=<minuto>`) ainda retornou20:45, enquanto a API de conteúdo do GitHub já tinha arquivo gerado20:50:05.703UTC, blob `e3fbaff6aa54309924e342a27db5ccb2c9508691`. Logo há atraso entre publicação e leitura; não é suficiente mudar o timer do navegador. Run agendado40396874107 estava em andamento, iniciado20:34:39UTC. Apenas observado.
-Código permite aceitar arquivo central até45min na janela/75min fora dela e tolera pausa no fim de semana. Essa tolerância evita sobrecarga; não é SLA de cotação. A proteção existente conserva uma cotação mais nova quando a resposta direta vem com timestamp anterior.
-A fonte não fornece estado autoritativo de abertura/fechamento. Não inferir esse estado de dia da semana, janela do coletor, preço repetido ou ausência de amostras.

## USD/BRL Hoje

Snapshot intraday gerado20:50:05.703UTC:71pontos de26/10 em America/Sao_Paulo, ordenados. Primeiro ponto12:02:51BRT=5,4548, último17:50:04BRT=5,4060: `(5,4060/5,4548−1)*100=−0,8946249%`. A descida desde a primeira amostra é real nessa série. O percentual do dia fornecido pela API usa outra base (referência anterior), portanto pode ser positivo simultaneamente. O gráfico não cobre a abertura completa: primeiro ponto do arquivo é12:02BRT, não deve ser chamado preço de abertura. Não inverter sinal nem fabricar pontos.

## Correção independente preparada

Mantém coleta/cache/polling e preços. Sinaliza timestamp de origem superior a10min como “Dado antigo”, inclusive se a consulta HTTP/coleta foi bem-sucedida; preserva separação de falha, reserva diária e horário inválido. Dez minutos é guarda de apresentação, não latência garantida. Explica a cadência no rodapé e não declara realtime.

## Limite e menor decisão

O pedido de feed em tempo real **não está resolvido** com a estrutura atual. Aumentar polling anônimo seria inadequado: o endpoint observado era mais antigo. A chave existente, se configurada, deve permanecer no servidor; presença/plano/quota não foram inspecionados. GitHub Pages é estático e o caminho via commits/CDN não oferece entrega tick a tick.

Opção de menor mudança a avaliar: backend compartilhado usando a credencial existente e cache curto, distribuição aos navegadores por SSE/WebSocket, verificação de timestamps de cada perna CNH e reconexão. Depende de autorização para hospedagem/infraestrutura, quota e direito de exibição pública do feed; ainda seria “cotação indicativa com cadência-alvo” enquanto não houver latência contratada/verificada. Não implementado nem contratado. Não enviar chave ao browser.

Para streaming contratado, confirmar antes de escolher: USD/BRL, EUR/BRL, JPY/BRL e USD/CNH offshore, bid/ask e timestamps, latência, reconexão e licença de exibição externa. Twelve Data é candidato documental: possui WebSocket e página USD/BRL, mas CNH/cobertura total não foi comprovada; termos exigem autorização específica de redistribuição/exibição externa. Não é alternativa gratuita aprovada para este site. Nenhuma conta/chave/contrato foi criado ou aceito. TradingView segue adiado.

Fontes oficiais lidas:

- https://docs.awesomeapi.com.br/api-de-moedas — endpoint last e cache anônimo descrito; daily é fechamento, não feed de ticks.
- https://docs.awesomeapi.com.br/instrucoes-api-key —100mil requisições/mês gratuitas sem cache autenticado; sem compromisso de latência fim a fim identificado. Não prova a quota da conta existente.
- https://twelvedata.com/docs — WebSocket; acesso da documentação teve timeout na primeira leitura, índice oficial retornou na pesquisa.
- https://twelvedata.com/markets/327325/forex/usd-brl/historical-data — existênciaUSD/BRL; não prova coberturaCNH/licença.
- https://twelvedata.com/terms — licença interna por padrão; exibição externa depende de tier/add-on/acordo que a autorize. Não houve assinatura.

Evidências JSON/capturas locais em `source-evidence/quote-freshness`; sem segredos. UI ampliada incluída em commit separado no mesmo draft; revisão visual final aprovada em390/820/1440, mantendo esse diagnóstico.

## Revisão da interface e atrasos corrigíveis

Removida a faixa redundante de quatro moedas (as quatro linhas continuam). Comparador acessível pelo botão44px no topo, com montagem, período próprio, seleção preservada, teclado no gráfico, Tab contido, Fechar/Escape e retorno de foco. Inline permanece uma moeda por vez, identificando a primeira amostra e a base distinta de Δ dia. Petróleo fica em tabela separada Demais, com widget oficial, CFD/USD por barril, atraso desconhecido e histórico EIA separado; sem extrair valores ou recortar atribuição.

Juros conserva níveis/unidades e estados materiais na tabela; datas, fontes e vigência de cada indicador/período estão associadas por aria-describedby a um rodapé expansível. Métodos financeiros não foram alterados.

Foram corrigidos o dia civil intradiário e seus horários para America/Sao_Paulo, inclusive tooltip/teclado e retorno a Dia depois de outro período/par. Esses defeitos de fuso não explicam a descida comprovada no snapshot de26/10, onde ambos os horários eram no mesmo dia. O teste usa27/10 01:10UTC (ainda26/10BRT) em fusos Tokyo/UTC/SãoPaulo.

O cache compartilhado do arquivo intraday no navegador foi reduzido de10min para1min, relido no próximo polling visível. Não muda coleta nem adiciona chamadas ao provedor. Remove atraso local evitável, mas CDN/coletor/fonte ainda impedem declarar realtime. O relógio não altera timestamp/preço nem fabrica amostras.

Validação local:207 testes de lógica, build, regressões gerais/UX142 e smoke dedicado390/820/1440. Evidência de casos sintéticos está rotulada; capturas de dados públicos/snapshots são distintas. Diretor de Arte revisa artefatos reais, não certifica preços. Sem merge/deploy deste draft.
