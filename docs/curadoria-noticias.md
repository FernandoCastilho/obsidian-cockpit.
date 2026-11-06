# Curadoria de tributos e trabalho

No primeiro quadro de notícias do Mercado hoje, após Manchetes: Imposto, Split payment, Reforma tributária e Escala 6x1. A aba Reforma existente é reaproveitada, sem duplicação. Moedas, Manchetes, Eleições e Veículos mantêm o comportamento anterior.

## Janela e critérios

Somente as quatro abas usam 7 dias exatos (168 horas), intervalo inclusivo [agora − 168h, agora]. A data é a publicação original indicada no RSS; generatedAt/checkedAt nunca rejuvenescem artigos. Datas futuras, ausentes e vencidas são removidas na coleta e novamente na tela, inclusive enquanto permanece aberta. As demais notícias mantêm cinco dias. Agrupamento diário e horários: America/Sao_Paulo.

A curadoria automática consulta Google News RSS com consultas separadas para fontes oficiais e imprensa selecionada. Valida o hostname de sourceUrl contra a lista em src/curadoria.js, não o nome exibido pelo RSS. Exclui origem desconhecida, títulos fora do tema, links não HTTP(S) e links/títulos repetidos. Split payment exige contexto tributário; Escala 6x1 exige contexto trabalhista. Preserva títulos e atribuição: não cria resumos legais ou afirmações de vigência. Links RSS levam à publicação; acesso integral pode depender do veículo.

A cobertura é não exaustiva. O filtro pelo título não substitui leitura editorial de cada matéria, pode omitir títulos pouco específicos e não agrupa automaticamente reportagens diferentes sobre o mesmo acontecimento. A ausência de resultados nunca é apresentada como ausência de notícias. Novidades fiscais gerais não são limitadas a um tributo específico. Receita Federal, isoladamente, não torna uma apreensão policial relevante.

## Falhas e operação

scripts/fetch-curadoria.mjs grava public/curadoria-noticias.json atomicamente. Por tema há checkedAt, lastSuccessAt, status (ok, partial, unavailable), contagem de consultas e erros. Em falha, mescla somente histórico ainda válido, preservando a data original da notícia e a última coleta completa. Mais de três horas sem coleta completa ou qualquer falha aciona aviso. Nenhum conteúdo antigo é movido para a janela atual.

A coleta foi adicionada à execução horária existente de Pages (dias úteis), sem nova automação. A rodada semanal de Focus preserva este arquivo e verifica seu hash, assim como as demais bases. Sem publicação prévia do novo arquivo, a rodada semanal aborta em vez de inventar dados; a primeira implantação precisa usar o fluxo normal.

## Verificação

- node --test test/curadoria.test.mjs test/news-window-ui.test.mjs test/news-window.test.mjs test/reforma.test.mjs test/weekly-data.test.mjs
- npm test; npm run lint; npm run build
- scripts/smoke-curadoria.cjs: dados fictícios, rede externa bloqueada, 390/820/1440px; alternância/repetição, teclado, sexta data, exclusão fora da janela, 5 dias das Manchetes, ausência, erro e resposta parcial. Incluído no CI.

A coleta local real confirmou publicações nas quatro seções em 06/11/2026. Isso não certifica a íntegra de todos os artigos. A prévia local não está publicada.
