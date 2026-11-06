> Estado atual: perfil de conferência `0.2.2-research`, integrado em `cotacoes/src/bndesCreditoPequenasEmpresas.js` e sem tela própria. As evidências ficam em `cotacoes/test/fixtures/bndes-tfb`; não são configurações padrão nem cotações atuais. O CET do fluxo completo é calculado; a referência original e a certificação contratual permanecem separadas.

# BNDES Crédito Pequenas Empresas: conferência das três páginas

**Versão 0.2.2-research. Todos os 34 pagamentos foram reconciliados em centavos. CET do fluxo informado: 20,16% a.a.; referência de 20,01% a.a. divergente. Isso não certifica o contrato.**

## Origem corrigida

As imagens e os cenários foram montados pelo próprio Fernando para testar com base em cálculos oficiais. Não são propostas ou simulações emitidas pelo Itaú. Logotipos e rótulos presentes no material não comprovam autoria bancária. Esta revisão corrige a atribuição anterior e substitui a versão 0.2 para uso posterior.

## Resultado

- 34 datas e 204 campos conferidos: número, data, saldo inicial, juros, amortização e prestação.
- Soma dos juros das linhas: **R$ 842.970,58**.
- Soma das prestações das linhas: **R$ 3.842.970,58**.
- Total impresso de prestações: **R$ 3.845.170,58**, exatamente R$ 2.200,00 acima da soma.
- IOF: **R$ 94.182,73**, retido na liberação.
- Líquido recebido: **R$ 2.905.817,27**.
- Primeira saída, com tarifa: **R$ 154.720,44**.
- Última prestação: **R$ 92.206,31**, em 16/11/2029.

A diferença entre o rodapé e a soma das linhas é exatamente a tarifa informada. Isso é compatível com sua inclusão no total, mas o documento não esclarece expressamente a composição dessa rubrica. Somar mais R$ 2.200,00 ao total impresso duplicaria o encargo nesta reconciliação.

## O que mudou em relação ao trecho inicial

As primeiras 13 linhas não permitiam distinguir duas políticas de arredondamento. As linhas finais mostram que a amortização é compatível com **saldo dividido pelas amortizações restantes, arredondado a cada pagamento**, em vez de parcela constante com todo o residual concentrado no final.

Assim, as linhas 29, 31 e 33 amortizam R$ 90.909,10; a última amortiza R$ 90.909,09. A política foi adicionada explicitamente ao perfil de pesquisa. Não foi generalizada para outros contratos.

O cronograma também exige o deslocamento observado de 15/06/2028 para 16/06/2028. A lista de dias não úteis continua sendo uma lista explícita suficiente para os vencimentos fotografados, não um calendário bancário completo certificado.

## CET calculado e referência divergente

Com o líquido inicial, as 34 datas impressas, IOF retido e tarifa no primeiro pagamento, o retorno anual do fluxo em ACT/365 é:

**20,1568899289% a.a., que arredonda para 20,16%, contra 20,01% informado no cabeçalho.**

A diferença é de aproximadamente **0,14689 ponto percentual**. À taxa informada de 20,01%, o valor presente dos pagamentos excede o líquido recebido em **R$ 5.214,24**.

Esse resultado foi confirmado por bisseção, Newton e cálculo independente de alta precisão. Na versão 0.2.2, o motor preenche `cet.calculatedAnnualRateDecimal` quando todos os eventos esperados estão cobertos, com `dayCount = actual-365-fixed` e `status = reference-mismatch`. A referência continua em `reportedAnnualRateDecimal` e nunca substitui o resultado calculado.

A fórmula geral está definida no [art. 4º da Resolução CMN 4.881](https://www.bcb.gov.br/content/estabilidadefinanceira/especialnor/Resolu%C3%A7%C3%A3o4881.pdf): dias corridos e denominador 365, inclusive quando o intervalo passa por ano bissexto. Para apurar o CET dos pagamentos já documentados não é necessário conhecer como o gerador montou cada parcela.

Para explicar os 20,01% faltam a fórmula original do cenário, referências das células/intervalos, data de liberação usada e encargos selecionados. Precisão da taxa, âncora e calendário são pendências da validação do **gerador**. Composição integral dos encargos e enquadramento da operação são pendências da certificação **contratual/regulatória**, cujo alcance também depende dos arts. 1º e 9º; o método matemático não confirma esse enquadramento. Não faltam linhas do cronograma.

`cet.validated = false`, `cashFlowComplete = false` e `validationStatus = estimate-not-contract-validated` continuam preservados. Em horizonte parcial, o CET permanece nulo; não há extrapolação de parcelas.

O valor mensal de 1,51% não prova, sozinho, outro erro: 20,01% a.a. convertido por 30/365 resulta em 1,5105129%, compatível com o cabeçalho. A conversão por 1/12 é diferente.

## Testes e uso

Na versão integrada, executar a partir de `cotacoes`:

```powershell
$tfbTests = (Get-ChildItem -LiteralPath 'test' -Filter 'bndes-tfb*.test.mjs').FullName
node --test @tfbTests 'test/bndes-credito-pequenas-empresas.test.mjs'
```

As regressões incluem conferência por Newton independente, fórmula fechada de uma cobrança, fluxo sem encargos, ano bissexto, tarifa/IOF uma única vez, referência compatível na precisão exibida, ausência de referência e limite numérico sem teto arbitrário de taxa. O resultado final e a execução da suíte do projeto são registrados na alteração que acompanha esta versão.

Exemplo, também dentro de `cotacoes`:

```js
import { fullInput } from './test/fixtures/bndes-tfb/full-input.mjs'
import { reconcileCreditoPequenasEmpresas } from './src/bndesCreditoPequenasEmpresas.js'
const result = reconcileCreditoPequenasEmpresas(fullInput())
// result.cet.calculatedAnnualRateDecimal ≈ 0.2015688992893113
// result.cet.reportedAnnualRateDecimal === '0.2001'
// result.cet.status === 'reference-mismatch'
```

O fixture é evidência de pesquisa, não configuração padrão nem cotação atual. A taxa de **17,5402% a.a. continua inferida**, embora reproduza todos os 34 juros com uma única precisão. A regra de geração da âncora, a precisão original das células e o enquadramento tributário não foram certificados.

`paymentEventCoverage.allExpectedEventsCovered` identifica os eventos de pagamento cobertos e habilita o cálculo do CET do fluxo declarado. Esse campo não prova a completude contratual dos encargos. Os campos conservadores de contrato permanecem explícitos, sem confundir ausência de certificação com ausência de cálculo.

Consulte também `ADENDO-FATORES-E-ORIGEM.md` para a composição TLP/IPCA e a distinção entre projeção com IPCA e CET.

## Arquivos principais

- `cotacoes/src/bndesCreditoPequenasEmpresas.js`: motor de conferência e CET do fluxo declarado.
- `cotacoes/test/fixtures/bndes-tfb/full-evidence.mjs`: transcrição preservada das 34 linhas.
- `cotacoes/test/fixtures/bndes-tfb/full-input.mjs`: entradas explícitas do exemplo.
- `cotacoes/test/fixtures/bndes-tfb/dated-return.mjs`: solucionador independente de teste.
- `cotacoes/test/bndes-tfb-cet.test.mjs`: regressões do CET calculado.
- `RECONCILIACAO-COMPLETA.json`: resultado do motor e comparação dos totais.
- `AUDITORIA-COMPLETA.md`: histórico e estado da conferência.

O perfil permanece sem tela própria; a validação é feita pelo motor, testes e relatório. Finame/TFC, as alíquotas, as datas e os 34 pagamentos não foram alterados para ajustar a referência de 20,01%.
