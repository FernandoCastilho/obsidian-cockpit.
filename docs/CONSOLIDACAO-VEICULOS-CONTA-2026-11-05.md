# Consolidação de Veículos pesados e Conta Garantida

Data: 05/11/2026. Base b5479a2716363464199fa6e46d6ffc2efe52ba40 preservada. Trabalho em cópia isolada, sem publicação. Este documento sucede o relatório de consolidação anterior e mantém seus limites.

## Entradas e integração

- Veículos pesados: patch SHA256 67dabdfaa3f31e085ca8cb15af77f12a3052deb725385bc93d16393f7939d6c2, auditado separadamente. Mercado hoje agora reutiliza SectorNews/sector-news.json, como Setores, e mantém HeavyVehicles para os indicadores. Refresh utiliza as mesmas duas fontes. Não foram alterados indicadores, datas, relógios ou snapshots.
- Conta Garantida: commit 0773c0d0ffa728bb914e11cb6d7dccb59ec28609, patch SHA256 1226fc32c9abd063b81d5e12be244a1a3ea0ac42979021a8c9440c3c2e19d004. Nove arquivos não gerados conferidos byte a byte com a origem antes do ajuste documental. O índice gerado do pacote não foi aplicado; a busca foi regenerada no consolidado, com 39 áreas.
- Não houve conflito entre os patches. Permanecem as rotas de Selic/LCD, Finame, FINIMP, Capital de Giro e Análise de Desconto, além da nova Conta Garantida.
- A única alteração ao conteúdo não gerado da Conta Garantida foi documental: orientação de teste elegível e correção da declaração de não execução da fixture Python, em desacordo com o log de origem.

## Premissas da Conta Garantida

Dois modos: utilização única por prazo/data de quitação e lançamentos de utilização/amortização por dia. Juros e IOF são pagos à parte e não aumentam o principal. A taxa contratual começa vazia. As opções proporcional/equivalente convertem a taxa diária; nenhuma capitaliza juros.

IOF diário considera saldo de fechamento em dias corridos; adicional considera aumentos positivos entre saldos de fechamento. Convenções de datas, soma de movimentos na mesma data, ausência de modelagem intradia, fonte e data das referências legais são explícitas. Simples/MEI depende de valor contratual e confirmação. Não há tratamento de inadimplência, regras históricas automáticas, tarifas, indexadores variáveis ou CET. Os detalhes estão em conta-garantida.md.

## Verificação consolidada permitida

- 978 testes aprovados em 126 arquivos elegíveis, sem falhas. A contagem é diferente da origem porque commodities.test.mjs foi excluído integralmente e quatro testes de Veículos foram acrescentados.
- Build Vite aprovado com Node 24.22.1. ESLint global: zero erros e cinco avisos preexistentes.
- git diff --check aprovado. Não foi executado Git status pelo integrador.
- Vinte e seis arquivos protegidos e cinco workflows conferidos por hash contra b5479a2, todos idênticos. Incluem motores/telas existentes, notícias e indicadores, snapshot LD1, bloqueios de coleta e alertas cambiais.
- Testes React offline cobrem estrutura e interações simuladas. QA visual/interativo em navegador, foco real, responsividade e notificações reais continuam não verificados.

## Incidentes registrados na origem

A auditoria de Veículos registrou que seu implementador executou git status --short antes de receber a restrição específica; o comando não foi repetido pelo integrador. A aprovação do patch não apaga o incidente.

O log test-final.log da Conta Garantida registra npm test/node --test test/*.test.mjs e o teste XLSX reader resolves named sheet, sparse columns and shared strings using stdlib aprovado. Isso inclui a fixture Python restrita e contradiz a declaração documental original. O integrador informou o responsável, preservou log e documentação originais como evidência, corrigiu a declaração nesta cópia e não repetiu a operação. Os 983 testes informados na origem não são apresentados como verificação elegível desta consolidação.

## Limites de liberação

Nesta consolidação não houve Git status, fixture Python, preview, servidor/socket, navegador, coleta externa, push, CI remota, merge em produção ou deploy. Os workflows existentes continuam incluindo etapas restritas e não devem ser acionados nesta tarefa. A auditoria independente do novo SHA continua necessária; build e testes elegíveis não autorizam publicação.

Preservados: janela de notícias de 120 horas e cobertura parcial; fontes suspensas e coleta externa desativada; LD1 datado e sem atualização automática; CET TFB não certificado; IOF adicional sem padrão na Análise de Desconto; referência cambial após 9h até decisão do usuário, ausência de monitoramento contínuo em segundo plano e possível reenvio único de marcador legado. CSVs coletados não foram fabricados ou revalidados em pacote de produção.
