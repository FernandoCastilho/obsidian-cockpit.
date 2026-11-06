# Conta Garantida — comparação com giro parcelado

## Objetivo e acesso

Na calculadora Conta Garantida, o modo **Comparar com parcelado** estima a substituição total ou parcial do saldo recorrente por um crédito novo. Os modos Utilização única e Lançamentos por dia são preservados. Dados ficam apenas na memória da tela, sem transmissão ou persistência; trocar os modos preserva o comparativo enquanto a calculadora estiver montada.

## Contrato financeiro

- Mesma necessidade inicial coberta e mesmo horizonte, da data da comparação à última parcela. O saldo médio da CG é projetado como constante. Não se presumem novos saques, redução espontânea de saldo, renovação garantida do limite ou tarifas futuras da CG.
- Juros CG proporcionais ao mês, base30 sobre dias corridos reais. Juros e IOF são pagos à parte; não viram principal.
- O valor líquido do giro quita parte ou todo o saldo CG. O restante continua gerando juros e IOF no cenário alternativo.
- Price e SAC com taxa efetiva mensal, datas civis em aniversários da liberação e ajuste ao último dia dos meses curtos. Não há calendário automático de feriados.
- Carência0..12 meses, juros do giro capitalizados mensalmente e parcelas iniciadas no mês seguinte ao fim da carência. A quantidade de parcelas1..600 não inclui carência.
- IOF do novo giro e tarifa informada são pagos à vista, com caixa próprio. Não se financiam impostos ou tarifa. Principal líquido integral disponível à quitação.
- IOF automático conforme `resolveCreditIof`: CG por saldos, sem adicional futuro na ausência de acréscimos e sem teto genérico365; giro com adicional sobre principal liberado e diária sobre amortizações do principal original, limitada365 dias por parcela. Na carência, a amortização financeira é distribuída proporcionalmente entre principal original e juros incorporados; estes não são nova entrega de principal.
- O enquadramento Simples/MEI exige confirmação; valor contratual da CG e valor do giro são avaliados separadamente para a referência até R$30mil.
- Não simula renegociação, portabilidade, isenções especiais, inadimplência ou indexadores variáveis. Não calcula CET. Nenhum benefício é garantia de aprovação ou contratação.

## Resultados e leitura

Encargos são separados de amortização, desembolso e dívida residual. O custo inclui juros, IOF e tarifa nova. O desembolso total inclui principal devolvido e custos iniciais. A diferença de encargos também reflete amortização, e não somente a redução de taxa. O saldo final dos dois cenários é explícito.

Capacidade de pagamento é opcional. Usa sobra mensal constante depois da operação e demais obrigações, antes das operações comparadas. Sem informação, não conclui se cabe no caixa. Com informação, avalia o maior desembolso mensal do giro e CG residual, incluindo meses fracos pela premissa escolhida pelo usuário. Não presume liquidez no dia da contratação para custos iniciais. Reutilização da CG não é simulada, e aparece como risco quando falta caixa.

## NCG opcional e independente

- Por saldos: clientes a receber + estoque a custo − fornecedores a pagar.
- Por prazos: vendas/30×PMR + custo das vendas/30×PME − compras/30×PMP.
- Prazos ponderados com bases coerentes, incluindo operações à vista com prazo0; não confundir compras com custo das vendas.
- Pode ser negativa. Não define sozinho valor de crédito novo; recursos próprios e outras fontes podem cobrir parte da necessidade.
- Estimativa operacional simplificada, sem demais contas operacionais, sazonalidade ou recebíveis antecipados considerados como recursos livres.

## Matriz de aceitação e verificação

| Critério | Evidência reproduzível |
| --- | --- |
| Mesmo horizonte, saldo residual e custos completos | `test/alongamento.test.mjs` |
| Price/SAC, carência, taxas0, IOF e enquadramento | `test/alongamento.test.mjs` |
| NCG por saldos/prazos, valores negativos e bases distintas | `test/alongamento.test.mjs` e `test/alongamento-ui.test.mjs` |
| Invalidar entrada remove resultados; IOF não editável | `test/alongamento-ui.test.mjs` |
| Preservação dos dois modos anteriores | `test/conta-garantida*.test.mjs` |
| Largura, foco, ajuda, valores e NCG em1440/768/390px | `scripts/smoke-alongamento.cjs`, chamado por `scripts/smoke-calculator-layout.cjs` no CI |

Validação local: testes de motor e interface React e build aprovados. Navegador local não disponível; a inspeção renderizada ocorre no CI antes de integrar a alteração. O resultado do CI deve ser conferido na versão final antes de declarar a publicação verificada.

## Referências verificadas em06/11/2026

- Decreto6.306/2007 consolidado, arts.3º e7º: https://www2.camara.leg.br/legin/fed/decret/2007/decreto-6306-14-dezembro-2007-566561-normaatualizada-pe.html
- IN RFB1.969/2020, art.3º: https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=111336
- Sebrae, Como elaborar controles financeiros, cálculo por saldos e por valores diários de cada conta: https://bibliotecas.sebrae.com.br/chronus/ARQUIVOS_CHRONUS/bds/bds.nsf/47A3FD6ADC6D190203257140006C9B68/%24File/NT00031F3A.pdf

## Publicação e recuperação

Publicar no repositório e destino atuais, preservando os demais arquivos pela árvore-base do commit vigente. A versão anterior fica recuperável pelo histórico Git; rollback, se necessário, deve reverter somente o commit deste comparativo. Não há banco, migração, serviço novo ou custo de infraestrutura acrescentado.
