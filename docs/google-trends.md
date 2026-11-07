# Google Trends em Mercado hoje

Subaba de Notícias após Eleições EUA. Feed oficial https://trends.google.com/trending/rss?geo=BR, separado dos termos selecionados no Explore. Até três destaques classificados pelo título; a ausência de correspondência aparece como ausência, sem completar com assuntos aleatórios. Classificação por palavras pode exigir revisão contextual.

## Atualização

`pages.yml`: `0 11,18 * * *`, diariamente às 08h e 15h America/Sao_Paulo (UTC−3). GitHub Actions pode atrasar o início e a publicação. A coleta não garante atualização exatamente nesses horários.

As execuções exclusivas de Trends primeiro baixam e validam as demais bases publicadas; abortam se não puderem preservá-las. Os demais coletores são pulados. O hash de cada arquivo preservado é conferido após o build. Nos deploys horários o snapshot Trends anterior é reaproveitado. Pushes e execuções manuais também consultam o RSS para permitir publicação inicial. Erros conservam os itens e `generatedAt` original; `checkedAt` registra só a tentativa. Nunca existe data de coleta válida fabricada.

## Séries históricas e lacunas

A API oficial segue em alpha com acesso restrito, conferido em 06/11/2026 na documentação atual: https://developers.google.com/search/apis/trends . Não foi criado acesso nem usada API não documentada. Sem resolver reCAPTCHA. O Google documenta a exportação RSS de Em alta em https://support.google.com/trends/answer/3076011?hl=pt-BR e a exportação CSV/incorporação de gráficos em https://support.google.com/trends/answer/4365538?hl=pt-BR .

Três snapshots vieram da PR268, commit `613e2137aff8ef32cb2bc9f25db913256934c175`, cuja transcrição foi registrada como leitura do navegador da sessão autorizada em 03/11/2026 13h32–13h33 BRT: capital de giro, BNDES e taxa Selic, separadamente, Brasil, Pesquisa na Web, todas as categorias, últimos três meses. Não houve nova captura histórica nesta integração. `src/trendsSnapshot.js` conserva os valores diários de 03/08 a 02/11/2026 UTC; o dia 03/11 parcial foi excluído. As escalas são independentes e os gráficos não devem ser usados para comparar volumes absolutos. Os zeros originais são preservados; não representam necessariamente ausência de buscas. Snapshot estático e data são declarados junto ao gráfico, sem alegar atualização às 08h/15h. O seletor controla o período do link na fonte; a série local continua no intervalo fixo informado.

Custos, reforma e 12 meses têm link para o gráfico na fonte e mensagem de ausência de série local. Todos os grupos incluem termos sugeridos e uma pergunta comercial marcada como hipótese. A coleta automatizada dos cinco grupos permanece pendente de acesso oficial suportado; o RSS não entrega essas séries.

## Integração e testes

A integração preserva as atuais subabas Moedas e Veículos pesados. A busca local indexa a descrição estática e abre Notícias › Google Trends; o RSS não é tratado como manchete jornalística da janela de 120 horas. Configurações registra o estado e a data do RSS, inclusive nos fins de semana. O painel considera a coleta atrasada após 25 horas e distingue a ausência de assuntos relacionados da ausência de coleta válida.

`node --test test/trends.test.mjs test/weekly-data.test.mjs` cobre classificação, datas, falta de histórico, retenção da última coleta válida, primeira falha sem dados inventados, preservação integral e falha isolada de outra fonte antes de qualquer escrita. `scripts/smoke-trends.cjs` usa dados simulados somente no teste, em 390, 1280 e 1440 px, cobrindo grupos, períodos, limite de três destaques, gráficos, estados vazio/atrasado/indisponível e largura. O smoke gera capturas para inspeção; sua execução e inspeção devem ser registradas separadamente.

A tentativa de consulta real ao RSS durante esta integração não foi concluída: o ambiente local retornou `ENOTFOUND` (DNS) e o leitor web não renderiza XML. Isso não é evidência de falha do RSS. O coletor deverá ser conferido na primeira execução autorizada em ambiente com rede, mantendo a mensagem de indisponibilidade se não houver coleta válida.

Na conferência local de 06/11/2026, os testes próprios de Trends e a verificação de lint passaram. O ensaio visual não foi concluído: o Edge de teste encerrou durante o lançamento, antes de abrir a página. Não foram obtidas capturas válidas. O smoke está preparado para execução no CI; a execução e a inspeção visual ainda precisam ser confirmadas antes de atestar o layout.
