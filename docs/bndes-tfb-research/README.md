> Nota de integração (05/11/2026): este texto preserva os resultados da pesquisa original. No Painel integrado, o motor está em cotacoes/src/bndesCreditoPequenasEmpresas.js; as entradas e evidências ficam apenas em cotacoes/test/fixtures/bndes-tfb e não são dados públicos nem defaults. Os testes estão em cotacoes/test/bndes-*.test.mjs. Os caminhos e o comando npm test abaixo se referem ao pacote original isolado. Nesta integração deve ser usada a lista elegível registrada no relatório, sem commodities.test.mjs, para não executar a fixture Python restrita. Não foi criada tela para este perfil TFB e o CET não foi certificado.

# BNDES Crédito Pequenas Empresas: conferência das três páginas

**Versão 0.2.1, isolada e não publicada. Todos os 34 pagamentos fotografados foram reconciliados em centavos. CET permanece não validado.**

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

## CET: divergência ainda aberta

Com o líquido inicial, as 34 datas impressas, IOF retido e tarifa no primeiro pagamento, o retorno anual do fluxo em ACT/365 é:

**20,1568899289% a.a., que arredonda para 20,16%, contra 20,01% informado no cabeçalho.**

A diferença é de aproximadamente **0,14689 ponto percentual**. À taxa informada de 20,01%, o valor presente dos pagamentos excede o líquido recebido em **R$ 5.214,24**.

Esse resultado foi confirmado por bisseção e por Newton independentes. Não é uma certificação de CET regulatório. Agora falta a **fórmula e as entradas originais do CET do cenário de teste**, com convenção, precisão e encargos considerados; não faltam mais linhas do cronograma.

O valor mensal de 1,51% não prova, sozinho, outro erro: 20,01% a.a. convertido por 30/365 resulta em 1,5105129%, compatível com o cabeçalho. A conversão por 1/12 é diferente.

## Testes e uso

O pacote exige Node.js 24, sem instalação de dependências, rede, Python, servidor ou navegador:

```sh
npm test
```

**91/91 testes aprovados** no pacote final: 60 testes anteriores do novo motor, 10 de regressão Finame, 6 testes independentes anteriores e 12 testes da conferência completa, dos quais 4 independentes, mais 3 testes dos fatores e da origem. ESLint focado aprovado.

Para repetir o exemplo completo:

```js
import { fullInput } from './full-input.mjs'
import { reconcileCreditoPequenasEmpresas } from './cotacoes/src/bndesCreditoPequenasEmpresas.js'
const result = reconcileCreditoPequenasEmpresas(fullInput())
```

O fixture é evidência de pesquisa, não configuração padrão nem cotação atual. A taxa de **17,5402% a.a. continua inferida**, embora reproduza todos os 34 juros com uma única precisão. A regra de geração da âncora, a precisão original das células e o enquadramento tributário não foram certificados.

`paymentEventCoverage.allExpectedEventsCovered` identifica que os 34 eventos esperados estão cobertos. A validação contratual e o CET continuam recusados. Campos conservadores herdados da versão parcial não devem ser interpretados como ausência das páginas, e nenhum deles autoriza publicação.

Consulte também `ADENDO-FATORES-E-ORIGEM.md` para a composição TLP/IPCA e a distinção entre projeção com IPCA e CET.

## Arquivos principais

- `cotacoes/src/bndesCreditoPequenasEmpresas.js`: motor isolado revisado.
- `full-evidence.mjs`: transcrição congelada das 34 linhas.
- `full-input.mjs`: entradas explícitas do exemplo completo.
- `dated-return.mjs`: cálculo de retorno datado ACT/365, sem certificação de CET.
- `RECONCILIACAO-COMPLETA.json`: resultados e comparação dos totais.
- `V1-DIAGNOSTICO.json`: diferenças da hipótese anterior na cauda.
- `motor-v0.2.1.patch`: alterações do motor em relação à versão 0.2.
- `AUDITORIA-COMPLETA.md`: revisão independente.

Finame permanece separado, com arquivos de referência inalterados. Nenhuma tela, publicação, PR, implantação, preview, socket ou fixture Python foi executada nesta revisão. Os arquivos antigos incluídos servem apenas à regressão; a suíte completa e a integração visual do aplicativo não foram executadas.
