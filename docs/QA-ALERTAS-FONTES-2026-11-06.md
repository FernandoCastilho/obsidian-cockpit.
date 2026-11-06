# Alertas, falhas isoladas e regressão de navegação

Revisão sobre a base `7505e858fac4d2d6ea0c538926be5d18d3148f38`. Este registro separa o que foi executado localmente do roteiro de navegador preparado para CI. Não comprova publicação.

## Correção reproduzida

Quando `bndes.json` falhava depois de uma leitura válida, `useDataFile` retinha os valores e sinalizava `stale`, mas as famílias TFB/TLP não exibiam o aviso correspondente. TFC/Moedas já tinham esse aviso. Um teste de renderização React reproduziu a ausência (9 testes passaram, 1 falhou). `Bndes.jsx` agora informa a falha da própria fonte e a possibilidade de os valores anteriores estarem desatualizados. Recuperar a fonte remove o aviso; o erro inicial continua explícito. Os dois links oficiais BNDES foram preservados.

## Executado localmente

```sh
node --test test/alerta-variacao.test.mjs test/alerta-notificacao.test.mjs test/bndes-lcd-presentation-regressions.test.mjs
```

Resultado: **25/25 passaram**, incluindo autorização tardia, dispensa concorrente, falha/retry, dados anteriores TFC/TFB/TLP, recuperação, isolamento entre fontes, snapshot LD1 e links oficiais. A suíte focada foi repetida somente após a nova correção.

Sintaxe dos três scripts abaixo validada com `node --check`. ESLint desses scripts, `Bndes.jsx` e seu teste passou sem erros ou avisos.

## Roteiros de navegador para CI

Executar no diretório `cotacoes`, após instalar as dependências e o Chromium do Playwright, gerar o build e servir sua prévia em `http://127.0.0.1:5216`:

```sh
SMOKE_CHANNEL=chromium SMOKE_OUT=qa-output/alertas node scripts/smoke-alerta.cjs
SMOKE_CHANNEL=chromium SMOKE_OUT=qa-output/bndes-fontes node scripts/smoke-bndes-source-failures.cjs
SMOKE_CHANNEL=chromium SMOKE_OUT=qa-output/outros node scripts/smoke-outros.cjs
```

Pode-se definir `SMOKE_BASE_URL` para outra prévia. Os três roteiros bloqueiam requisições para fora desse endereço; notificações e séries financeiras são simuladas. Não enviam notificações reais nem consultam fontes externas.

| Script | Casos e capturas previstos |
| --- | --- |
| `smoke-alerta.cjs` | 390/1280 px; preço das 8h55 ignorado, base das 9h, faixa às 15h, reload antes/depois da autorização, pedido adiado, bloqueio, autorização externa, dispensa persistente, falha de envio/retry e deduplicação. Capturas do convite, bloqueio, falha e recuperação. |
| `smoke-bndes-source-failures.cjs` | 390/1280 px; HTTP503 inicial de cada arquivo isoladamente; TFC sem dados mostra erro, Moedas conserva só LD1 datado, outra fonte continua utilizável; falha após sucesso mantém valores com aviso; recuperação atualiza valores e limpa erros TFC/Moedas/TFB/TLP. Capturas das falhas, retenções e recuperações. |
| `smoke-outros.cjs` | Mantém todos os casos anteriores; valida 25 conceitos, sete categorias recolhíveis, expansão/recolhimento, busca com restauração do estado e os quatro novos temas com fontes. Capturas das categorias e dos temas. O Regime FÁCIL existente é apenas verificado. |

## Falha anterior de Setores

O trecho antigo de `smoke-outros` aguardava `.reforma li` na área de Setores e dependia de notícias reais. A base atual já utiliza a lista específica `.sector-news-list > li`, relógio fixo e comunicados institucionais sintéticos em `sector-news.json`. A conferência conserva as exigências: uma notícia industrial e duas de cobre dentro de 120 horas; matérias de 121 horas ficam de fora; navegação Setores/Insumos e ficha de visita permanecem verificadas. Não foi removido ou ignorado esse trecho. O script agora registra a aprovação da seção e gera captura quando `SMOKE_OUT` é definido.

## Limites da execução local

O Edge encerrou antes de abrir a página (`Crashpad / TransactNamedPipe` no ambiente isolado); o Chromium do Playwright não estava instalado dentro desse isolamento. Portanto, **nenhum teste de navegador nem captura visual desta revisão foi concluído localmente**. A execução dos scripts e a inspeção das capturas ficam pendentes do CI; essa limitação não altera o resultado dos testes React/cálculo executados.

Aceitação pela API de notificações não comprova que o sistema operacional mostrou ou que a pessoa leu a mensagem. Testar o aviso real em um dispositivo autorizado continua sendo uma validação distinta. A faixa é recalculada com cotações válidas do dia: não conserva um cruzamento antigo após o preço voltar ao limite ou envelhecer. O aplicativo precisa estar aberto e visível para verificar; não foi criado monitoramento com o aplicativo fechado.
