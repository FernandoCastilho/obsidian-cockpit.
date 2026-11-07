# Retificação de origem e conferência dos fatores

> Revisão de 06/11/2026: este adendo preserva o registro histórico. Fernando determinou desconsiderar o CET original de 20,01%; sua origem deixou de ser pendência de aceitação. O CET calculado independentemente pelas 34 parcelas, datas, IOF e tarifa é **20,16% a.a.** O cenário ativo não usa taxa de referência. Para o estado vigente, consulte `README.md` e a primeira seção de `AUDITORIA-COMPLETA.md`; as ressalvas de certificação contratual permanecem separadas do cálculo matemático.

## Origem das imagens

Fernando esclareceu: “E aqui não tem nada a ver com Itaú, sou eu que tô montando, sou eu que tô gerando essas imagens pra fazer como teste e mandar pra você baseado nos cálculos oficiais.”

Portanto, as imagens, o cronograma, o CET e o rodapé são **cenários de teste montados pelo usuário**, não documentos emitidos pelo Itaú. A presença de logotipo ou de um rótulo de spread não estabelece autoria do banco. A versão 0.2.1 corrige essa atribuição no perfil, nos relatórios e no resultado JSON.

As igualdades aritméticas das 34 linhas permanecem. A divergência entre o retorno ACT/365 de 20,15688993% a.a. e o CET indicado de 20,01% precisa ser rastreada à **fórmula e às entradas originais do próprio cenário**, sem atribuir erro ou cálculo ao banco.

## Quadro central da nova imagem

Os fatores apresentados são:

- TLP fixa: 8,12% a.a. → 1,0812.
- Remuneração BNDES: 1,25% a.a. → 1,0125.
- Agente: 2,00% a.a. → 1,02.
- IPCA anual considerado: 10,29% → 1,1029.

A multiplicação é:

`1,0812 × 1,0125 × 1,02 × 1,1029 − 1 = 23,150839697% a.a.`

O equivalente mensal por 1/12 é **1,750475657% a.m.**. Os 23,15% e 1,75% mostrados são coerentes com essas entradas e arredondamentos. O motor Finame existente já dispõe de funções que compõem esses fatores dessa forma; não foi necessário alterá-lo.

## Quadro esquerdo: hipótese de anualização

Com 0,82% mensal exatos:

- Anualização linear: 0,82% × 12 = **9,84% a.a.**.
- Anualização composta: (1 + 0,0082)^12 − 1 = **10,2961408596% a.a.**.

Usar 9,84% produz TLP nominal de **18,759008%** e taxa total de **22,648365512%**, que aparecem como 18,76% e 22,65%. É uma hipótese aritmética forte para explicar o quadro esquerdo, mas **a fórmula das células não foi apresentada**. Não declarar que a planilha efetivamente usa essa fórmula sem inspecioná-la.

Usar a anualização composta de 0,82% exatos produz total de aproximadamente **23,15769664% a.a.**. Esse valor difere ligeiramente do quadro central porque ali foi informado IPCA de 10,29%, não 10,2961408596%. Não substituir automaticamente uma entrada pela outra nem presumir casas ocultas.

## TLP e CET não são o mesmo caso do cenário TFB

Uma taxa projetada com IPCA não equivale automaticamente ao CET regulatório. Nas operações abrangidas pelo [art. 5º da Resolução CMN 4.881](https://www.bcb.gov.br/content/estabilidadefinanceira/especialnor/Resolu%C3%A7%C3%A3o4881.pdf), referenciais variáveis e índices de preços não entram no cálculo do CET e devem ser informados separadamente. Isso exige distinguir a parte prefixada, a projeção com IPCA e os demais encargos. Não confirma, por si só, a fórmula do CET de 23,09% exibida na imagem, para o qual faltam fluxo, datas e entradas.

Essa distinção **não resolve a divergência do cenário TFB prefixado das 34 linhas**. O motor isolado continua restrito a esse cenário TFB, recebendo taxa precisa explícita. Não recebeu os percentuais da imagem TLP como defaults, não passou a simular TLP e não alterou os juros já reconciliados.

Também permanece a diferença de precisão no cenário TFB: os componentes exibidos 13,70%, 1,35% e 2,00%, tratados como exatos, produzem **17,539649% a.a.** A taxa candidata que reproduz as 34 linhas é **17,5402% a.a.** Não se deve substituir uma pela outra nem presumir as casas ocultas sem as fórmulas e os valores originais.

## Verificações

Foram acrescentados três testes: composição central, comparação das duas anualizações e proteção da origem/escopo TFB. O pacote revisado passa em **91/91 testes**. Nenhuma publicação ou alteração da interface foi feita.
