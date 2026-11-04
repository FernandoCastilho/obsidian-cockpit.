# FINIMP: comparação de propostas

Implementação genérica autorizada por Fernando. Não reproduz imagem, valores de cliente ou tabela comercial. Entrada em Calculadoras, endereço `#calculadora/finimp` e comando FINIMP. Nenhum dado do formulário é persistido, enviado ou indexado pela busca.

## Premissas explícitas

- Principal na mesma moeda de todos os custos; USD, EUR e BRL são rótulos, sem conversão.
- Juros simples, com dias digitados e divisor 360. Não calcula datas nem escolhe ACT/360 ou 30/360.
- Flat único sobre o principal. O contrato determina quando ele é pago; não há desconto a valor presente.
- TAC opcional, na moeda escolhida, exclusivamente sob premissa editável de pagamento à vista e sem financiamento; não gera juros.
- Pagamento do principal no vencimento. Sem estimar impostos, câmbio, hedge, seguros, outras tarifas ou indexadores. Não é custo final travado em reais nem CET anual.
- Seis prazos alternativos usam as mesmas condições; não presumem uma oferta válida para todos os vencimentos.

## Fórmulas auditáveis

Com principal P, taxa anual em percentual r, flat percentual f, TAC T e dias d:

J = P × (r / 100) × (d / 360)

F = P × (f / 100)

C = J + F + T

Custo percentual no período = C / P × 100

Diferença = C do Itaú − C do concorrente; positivo significa Itaú mais caro.

Meta: r = (C alvo − F Itaú − T Itaú) / P / (d / 360) × 100.

Taxas são não negativas. Alvo inferior ao custo fixo não tem solução nesse domínio. Com d = 0, alvo igual ao custo fixo é indeterminado (qualquer taxa), e alvo diferente é impossível. Principal zero/negativo, negativos nos custos, dados não finitos e dias fracionários são recusados. Igualdades usam tolerância proporcional ao epsilon da máquina apenas para ruído binário, sem arredondar custos a centavos. Os cálculos mantêm precisão de ponto flutuante, sem arredondamento intermediário; moeda é apresentada com centavos.

## Revisão pelo procedimento Auditor

Revisão feita pelo próprio executor, separando conferência algébrica dos testes de código; não se apresenta como parecer de terceiro. Verificação das dimensões (taxa anual × fração de ano), sinal da diferença, flat único, TAC sem juros, distinção entre custo no período e CET anual, resolução inversa e substituição da taxa calculada na fórmula original. A meta de igualdade independe da taxa atual do Itaú.

Matriz sintética, P = 100.000, TAC = 0. Concorrente r = 6%, f = 1%; Itaú r = 8%, f = 0,5%. Valores abaixo arredondados apenas nesta apresentação:

| Dias | Custo concorrente | Custo Itaú | Diferença |
| --- | ---: | ---: | ---: |
| 30 | 1.500,00 | 1.166,67 | −333,33 |
| 60 | 2.000,00 | 1.833,33 | −166,67 |
| 90 | 2.500,00 | 2.500,00 | 0,00 |
| 120 | 3.000,00 | 3.166,67 | 166,67 |
| 180 | 4.000,00 | 4.500,00 | 500,00 |
| 360 | 7.000,00 | 8.500,00 | 1.500,00 |

Teste inverso adicional: P = 100.000, flat Itaú = 0,5%, TAC Itaú = 100. Para igualar o concorrente acima, taxa requerida de 6,8% em 180 dias e 6,4% em 360 dias. Recalculando: 3.400 + 500 + 100 = 4.000; 6.400 + 500 + 100 = 7.000.

Cobertura automatizada: doze cenários diretos, três sinais da diferença, TAC, zeros, valores inválidos/overflow, metas em 180/360 dias, ausência/indeterminação de solução e precisão. Smoke de interface preenche os doze resultados, aplica meta, altera moeda e TAC, testa erros e busca em 390/820/1280 px. Não substitui validação das condições comerciais de um contrato concreto.
