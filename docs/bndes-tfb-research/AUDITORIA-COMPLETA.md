# Auditoria independente da extensão v0.2

Data: 05/11/2026. Escopo: fotografias das três páginas, transcrição, candidato isolado v0.2, entrada completa, cálculo de retorno datado e testes. Não houve publicação, integração com UI, preview, sockets ou execução de fixture Python. O auditor não modificou o candidato nem o cálculo de retorno.

## Retificação posterior de origem

Fernando esclareceu que montou as imagens e os cenários para testes baseados em cálculos oficiais. O material não foi emitido pelo Itaú. As conclusões aritméticas abaixo permanecem, mas a autoria e a pendência de CET referem-se ao cenário do usuário. Esta retificação não é nova validação de fórmulas oficiais.

## Revalidação em 06/11/2026

**Estado: reconciliação aritmética aprovada; certificação contratual e CET pendentes.** A conferência atual executou os cinco arquivos de teste do perfil: **81 testes aprovados**, sem alterar taxas, datas, fórmula ou convenção para ajustar o resultado ao cabeçalho.

Comando reproduzível, dentro de `cotacoes`:

```powershell
$tfbTests = (Get-ChildItem -LiteralPath 'test' -Filter 'bndes-tfb*.test.mjs').FullName
node --test @tfbTests 'test/bndes-credito-pequenas-empresas.test.mjs'
```

As validações executadas incluem os 204 campos das 34 linhas, conservação do principal, saldo final zero, juros por ano civil incluindo ano bissexto, IOF retido uma vez, tarifa somente na primeira cobrança, arredondamento em centavos, bloqueio de entradas incompatíveis, independência do fuso horário e duas apurações independentes do retorno do fluxo. O retorno continua **20,15688993% a.a. em ACT/365 fixo**, frente aos **20,01% a.a. informados**. O motor conserva `cet.validated = false` e `cashFlowComplete = false`; cobertura dos 34 pagamentos não confirma a composição integral dos encargos contratuais.

Para encerrar a certificação, ainda é necessário obter e confrontar:

- A fórmula original do CET do cenário, com datas consideradas, base de dias, encargos incluídos e precisão dos valores antes de arredondar. A divergência de **0,14688993 ponto percentual** e o residual de **-R$ 5.214,24** a 20,01% permanecem sem explicação documental.
- A taxa com a precisão original das células e a regra de geração da âncora de carência. Os **17,5402% a.a.** que reproduzem os juros e a âncora atual são inferências documentadas.
- O calendário bancário aplicável e o enquadramento tributário da operação. As datas deslocadas e o IOF das imagens foram reconciliados; isso não certifica o calendário completo nem a aplicabilidade fiscal.

Não faltam páginas do cronograma: as três imagens cobrem os 34 pagamentos. Novos testes sobre os mesmos dados não substituem as entradas e regras originais acima. O resultado disponível permanece no relatório `RECONCILIACAO-COMPLETA.json`; não foi criada uma tela nem atribuída certificação a uma proposta de banco.

## Conclusão financeira

As 34 linhas das fotografias coincidem com os 204 campos comparados pelo candidato: número, data, saldo inicial, juros, amortização e parcela. A última linha é 16/11/2029 e o saldo final calculado é zero. A taxa precisa continua sendo uma hipótese inferida de 17,5402% a.a., não precisão transcrita do cabeçalho.

- Juros somados das linhas: **R$ 842.970,58**.
- Principal somado: **R$ 3.000.000,00**.
- Parcelas somadas: **R$ 3.842.970,58**.
- Totais impressos: juros **R$ 845.170,58** e parcelas **R$ 3.845.170,58**.
- As duas diferenças são exatamente **R$ 2.200,00**, o valor da tarifa. Isso é compatível com a inclusão da tarifa no total, mas não prova a composição da rubrica denominada juros no cenário. A nota diz que a tarifa não está incluída na simulação de parcelas e é cobrada no primeiro pagamento.
- IOF permanece **R$ 94.182,73**, retido na liberação. Líquido inicial: **R$ 2.905.817,27**. Primeira saída, com tarifa: **R$ 154.720,44**.
- Parcelas mais tarifa mais IOF somam **R$ 3.939.353,31**, sem dupla contagem de tarifa. O IOF já é representado como redução do recebimento inicial na análise de retorno.

## Retorno datado e CET

Uma implementação independente de Newton, usando diretamente as linhas transcritas e sem importar o fluxo do motor, confirma **20,156889928931138% a.a. em ACT/365 fixo**. O helper por bisseção produz a mesma taxa. Ao descontar esse fluxo a 20,01%, o valor presente líquido é aproximadamente **−R$ 5.214,24**; portanto, a diferença não é apenas a apresentação com duas casas.

Esse resultado **não valida o CET regulatório nem identifica a fórmula original do cenário**. A base regulatória, os encargos efetivamente considerados, as datas usadas e a fórmula e as entradas do CET do cenário precisam ser esclarecidos. Não ajustar a taxa ou fluxo artificialmente para obter o cabeçalho.

O CET mensal informado de 1,51% é numericamente compatível com a conversão de 20,01% por 30/365; a conversão por 1/12 daria 1,53%. Isso sugere uma convenção possível, não confirma qual foi usada na montagem do cenário.

## Diferenças em relação à v0.1

1. A evidência agora contém 34 eventos, não somente 13. As primeiras 13 linhas permanecem idênticas.
2. A política anterior mantinha R$ 90.909,09 e concentraria três centavos na última amortização, R$ 90.909,12. A evidência completa mostra R$ 90.909,10 nas linhas 29, 31 e 33, e R$ 90.909,09 na última.
3. A nova política divide o saldo em centavos pelo número de amortizações restantes e arredonda half-up a cada evento. Reproduz todas as amortizações, sem ajustes manuais de linhas. É uma hipótese compatível com o cenário de teste, não prova de regra universal.
4. Foi acrescentado o deslocamento observado 15/06/2028 → 16/06/2028, além dos deslocamentos de novembro de 2028 e 2029. O calendário continua parcial: não foi transformado em calendário bancário integral.
5. O candidato mantém ambas as políticas como entradas explícitas e eleva a versão para 0.2.0-research. O arquivo v0.1 e o motor Finame não foram alterados nesta extensão.
6. A revisão final acrescenta `paymentEventCoverage`, marcando 34 eventos cobertos de 34 esperados. Mantém `cashFlowComplete=false` como ressalva de completude contratual dos encargos, mas troca o status do CET para convenção contratual não confirmada. Assim distingue completude das linhas fotografadas de validação contratual/regulatória.

## Testes e validação do helper

Os oito testes de reconciliação completos passaram na primeira execução independente. Quatro testes adicionais do auditor verificam Newton independente, comparação das políticas, datas civis e valores monetários.

Na primeira revisão, dois testes adicionais passaram e dois falharam. O helper `dated-return.mjs` aceitava 30/02/2026, normalizando a data para março; também aceitava valores em texto ou com fração de centavo. Classificação: **P2 de validação de entrada**, sem impacto nos números do cenário de teste, cujas entradas são válidas. O autor corrigiu a validação de datas com ida e volta ISO e passou a exigir centavos numéricos inteiros seguros. O reteste independente aprovou **12/12 testes**: oito da reconciliação e quatro adicionais do auditor.

Artefatos: `audit-independent.test.mjs`, `audit-initial-results.log` e `audit-final-results.log`. **Aprovado para comparação e pesquisa**, sem certificação de CET, condições contratuais ou generalização para Finame/TFC. Nenhum desvio remanescente foi identificado nos 34 eventos deste cenário de teste.
