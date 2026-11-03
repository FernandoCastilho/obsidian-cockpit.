# Google Trends em Mercado hoje

Subaba de Notícias após Eleições EUA. Feed oficial https://trends.google.com/trending/rss?geo=BR, separado dos termos selecionados no Explore. Até três destaques classificados pelo título; a ausência de correspondência aparece como ausência, sem completar com assuntos aleatórios. Classificação por palavras pode exigir revisão contextual.

## Atualização

`pages.yml`: `0 11,18 * * *`, diariamente às 08h e 15h America/Sao_Paulo (UTC−3). GitHub Actions pode atrasar o início e a publicação. A coleta não garante atualização exatamente nesses horários.

As execuções exclusivas de Trends primeiro baixam e validam as demais bases publicadas; abortam se não puderem preservá-las. Os demais coletores são pulados. O hash de cada arquivo preservado é conferido após o build. Nos deploys horários o snapshot Trends anterior é reaproveitado. Pushes e execuções manuais também consultam o RSS para permitir publicação inicial. Erros conservam os itens e `generatedAt` original; `checkedAt` registra só a tentativa. Nunca existe data de coleta válida fabricada.

## Séries históricas e lacunas

A API oficial está em alpha com acesso restrito: https://developers.google.com/search/blog/2025/07/trends-api. Não foi criado acesso nem usada API não documentada. Sem resolver reCAPTCHA.

Três snapshots foram transcritos da leitura do navegador da sessão autorizada em 03/11/2026 13h32–13h33 BRT: capital de giro, BNDES e taxa Selic, separadamente, Brasil, Pesquisa na Web, todas as categorias, últimos três meses. `src/trendsSnapshot.js` conserva os valores diários de 03/08 a 02/11/2026 UTC; o dia 03/11 parcial foi excluído. As escalas são independentes e os gráficos não devem ser usados para comparar volumes absolutos. Os zeros originais são preservados; não representam necessariamente ausência de buscas. Snapshot estático e data são declarados junto ao gráfico, sem alegar atualização às 08h/15h.

Custos, reforma e 12 meses têm link para o gráfico na fonte e mensagem de ausência de série local. Todos os grupos incluem termos sugeridos e uma pergunta comercial marcada como hipótese. A coleta automatizada dos cinco grupos permanece pendente de acesso oficial suportado; o RSS não entrega essas séries.
