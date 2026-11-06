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

## CI e inspeção das capturas

Os dois smokes de alertas/fontes passaram na [rodada42154279199](https://github.com/FernandoCastilho/painel-especialista/actions/runs/42154279199), commit `b596277`. Os arquivos foram baixados e tiveram a integridade SHA256 validada na integração. Em seguida, **26 imagens foram efetivamente abertas e inspecionadas**, nas larguras390 e1280px:

| Arquivo, substituindo `{largura}` por390 e1280 | Evidência visual |
| --- | --- |
| `alerta-{largura}-permissao-pendente.png` | Faixa de +0,36%, base09h e preço14h59; convite com botão e regra de funcionamento legíveis. |
| `alerta-{largura}-bloqueado.png` | No celular, instrução de bloqueio completa e faixa mantida. A imagem desktop precisa de recaptura: o cabeçalho fixo encobriu parte do conteúdo após o scroll provocado pelo clique. |
| `alerta-{largura}-falha-envio.png` | Faixa permanece, mensagem de falha e ação de tentar novamente presentes. |
| `alerta-{largura}-envio-recuperado.png` | Faixa permanece e a mensagem de falha desaparece após envio aceito/reload. |
| `bndes-{largura}-moedas-falha-tfc.png` | TFC/dólar indisponíveis, TFB/TLP preservadas; erro explícito, ausência não convertida em zero. |
| `bndes-{largura}-moedas-falha-snapshot.png` | Aviso de fonte indisponível e LD1 -0,110000% datada; demais moedas ausentes. Colisão da observação LD1 com Dia/Data foi identificada no celular. |
| `bndes-{largura}-moedas-recuperada.png` | TFC12,34% e dólar5,0100 retornam, sem aviso residual da fonte. |
| `bndes-{largura}-bndes-falha-tfb.png` | TFB/TLP indisponíveis enquanto TFC12,34% e dólar5,0100 continuam no topo. |
| `bndes-{largura}-bndes-recuperada.png` | TFB10,50% e TLP6,90% retornam; histórico TLP legível. |
| `bndes-{largura}-tfc-dado-retido.png` | Valor12,34% e histórico preservados com aviso permanente de possível desatualização. |
| `bndes-{largura}-tfc-dado-recuperado.png` | Fonte recuperada: TFC13,34%, dólar6,0100 e aviso removido. A tela capturada é Moedas, última aba verificada pelo roteiro. |
| `bndes-{largura}-tfb-dado-retido.png` | TFB11,50% preservada com aviso próprio; demais cartões mantêm seus dados. |
| `bndes-{largura}-tfb-tlp-dado-recuperado.png` | TFB12,50% e TLP8,90% após recuperação, sem aviso antigo; tabela e histórico TLP correspondem. |

As capturas também revelaram sobreposição entre data e mensagem de atualização no cabeçalho móvel. As correções locais seguintes permitem rolagem interna da tabela, colocam a observação LD1 abaixo do valor e separam data/mensagem do botão. O roteiro agora mede os textos dentro da célula e a separação dos elementos do cabeçalho, preservando o botão de44px. Antes de gerar imagens, retorna ao topo e aguarda dois quadros de renderização para não registrar o cabeçalho fixo no meio da página. As imagens originais foram preservadas.

**Ainda depende da nova rodada de CI e inspeção das novas imagens:** confirmação visual da correção LD1, do cabeçalho móvel e do bloqueio desktop recapturado. Os testes funcionais da rodada acima passaram, mas as imagens originais não aprovam esses três pontos de apresentação.

Na rodada `42156020503`, `smoke-outros` parou na contagem fixa de21 fontes. O catálogo já tinha22 com a entrada legítima de Google Trends: os22 IDs e22 nomes são únicos. O roteiro agora compara todos os nomes da tabela com o catálogo e verifica unicidade de ambos, preservando uma linha por fonte e detectando omissões/duplicações. Também verifica RSS oficial, horários08h/15h e atraso25h na linha Trends. Os seis testes de governança passaram localmente. Não foi necessária mudança na implementação.

Para inspecionar o cabeçalho após consulta, o roteiro BNDES fecha a notificação transitória pelo botão próprio, sem esperar a mensagem local expirar. Confere que a mensagem continua no cabeçalho e gera a captura limpa. O aviso transitório permanece documentado separadamente nos arquivos `bndes-{largura}-moedas-recuperada-notificacao.png` e `bndes-{largura}-tfc-dado-retido-notificacao.png`.
