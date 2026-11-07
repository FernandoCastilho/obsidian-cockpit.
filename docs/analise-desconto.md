# Análise de desconto

Descrição da interface e do motor vigentes, revisada em 06/11/2026. Acesso: Calculadoras → Análise de desconto, rota `#calculadora/analise-desconto`, comandos `DESCONTO` e `Análise de desconto`. Motor: `cotacoes/src/analiseDesconto.js`; tela: `AnaliseDesconto.jsx`.

## Entradas atuais

- Informe data da operação, taxa mensal, convenção comercial simples (por fora) ou racional simples (por dentro), e os títulos agrupados por vencimento.
- Cada grupo informa valor nominal **total** do grupo, quantidade de títulos e vencimento posterior à operação. O valor não é multiplicado pela quantidade.
- Juros e IOF são calculados automaticamente por grupo. Não há campos de juros pagos ou alíquotas manuais na UI.
- Escolha explicitamente a tarifa: total por operação, unitária × quantidade ou percentual do nominal. A referência histórica de R$ 564 era ambígua; nenhuma interpretação vem selecionada.
- TAC é um valor por operação. O exemplo R$ 260 e demais valores iniciais são editáveis, não condições comerciais vigentes.
- A projeção mensal recebe operações por mês, valor médio bruto e taxa de desconto projetada. Mantém quantidades e vencimentos dos títulos, escalona seus valores e **recalcula juros e IOF**. TAC e tarifas fixas permanecem por operação; tarifa percentual muda com o nominal.
- O giro comparativo usa Price em 12, 24, 36 e 48 meses, com taxa e TAC próprias. Principal automático = volume bruto mensal do desconto; o usuário pode informar outro principal. Isso não é NCG apurada nem igualdade do valor líquido disponibilizado.
- O valor inicial de TAC do giro (R$ 3.150) foi inferido de uma referência anterior; requer conferência e não é tarifa padrão.

## Fórmulas do desconto

Para cada grupo de nominal N, taxa mensal i em fração e d dias corridos:

- Comercial: juros = N × i × d/30.
- Racional: juros = N − N/(1 + i × d/30).
- Base do IOF = N − juros antecipados. TAC e tarifa de títulos não reduzem essa base.
- IOF = base × (alíquota adicional + alíquota diária × min(d, 365)).
- Custo completo = juros + IOF + TAC + tarifa de títulos.
- Subtotal sem títulos = juros + IOF + TAC; líquido = nominal − custo completo.

Cada grupo é calculado separadamente e os resultados são somados. Se taxa/prazo consomem o nominal ou custo total atinge o bruto, a simulação é bloqueada. Os percentuais da UI são divididos por 100. Não há arredondamento intermediário; a exibição usa centavos.

## IOF e calendário

As alíquotas vêm de `iofRules.js` conforme data, perfil e valor da operação. Regime suportado desde **17/07/2025**: PJ geral 0,0082% ao dia + 0,38%; Simples/MEI elegível confirmado até R$ 30 mil, 0,00274% ao dia + 0,38%. O giro possui enquadramento próprio; a projeção reavalia o limite por operação. Datas anteriores e perfis não suportados são recusados. A confirmação do usuário não certifica juridicamente a elegibilidade e mudanças futuras não são antecipadas.

Fontes: [Decreto 6.306/2007, art. 7º](https://www2.camara.leg.br/legin/fed/decret/2007/decreto-6306-14-dezembro-2007-566561-normaatualizada-pe.html) e [orientação da Receita de 17/07/2025](https://www.gov.br/fazenda/pt-br/canais_atendimento/imprensa/notas-a-imprensa/2025/julho/receita-federal-do-brasil-explica-como-ficam-os-pagamentos-do-iof-diante-do-novo-entendimento/).

Datas de títulos devem refletir ajustes contratuais; não há ajuste automático de feriados. A data da operação também é a liberação hipotética do giro. As parcelas do giro vencem mensalmente a partir do mês seguinte, no mesmo dia ou último dia do mês, sempre partindo da data original, sem deriva após fevereiro. Juros do giro usam períodos mensais iguais; IOF usa dias reais em UTC.

## Fórmulas do giro e comparação

Price: PMT = P × i / (1 − (1+i)^(-n)); taxa zero: P/n. O código usa `log1p`/`expm1`; acumula juros sobre o saldo para evitar cancelamento em taxas quase zero. A última amortização fecha o principal.

IOF diário do giro = soma de cada amortização × min(dias corridos desde a liberação, 365) × alíquota diária. Adicional = principal × alíquota adicional, uma vez. TAC e IOF são pagos à parte, sem financiamento.

- Custo do giro = juros + TAC única + IOF.
- Média mensal all-in = (principal + custo) / prazo. **Não é a parcela contratual**; a PMT aparece separadamente.
- Diferença estimada = custo do desconto repetido no prazo − custo do giro. A coluna Mês usa o cenário de 12 meses dividido por 12 para custos; PMT e média de desembolso já são mensais.
- Desconto repetido e giro amortizado têm fluxos diferentes. A diferença nominal não comprova economia contratual ou igualdade de disponibilidade de caixa. **Não é CET**, proposta nem recomendação de contratação.

## Exemplo vigente e testes

Exemplo sintético: operação em 05/11/2026; 30 títulos com nominal total de R$ 225.600,43, vencimento em 05/12/2026, comercial simples a 1,83% a.m.; tarifa total R$ 564 e TAC R$ 260; PJ geral.

- Juros: R$ 4.128,49.
- Base do IOF: R$ 221.471,94.
- IOF: R$ 1.386,41.
- Custo completo: R$ 6.338,90.
- Líquido: R$ 219.261,53.

Este exemplo está vinculado a `test/calculator-doc-examples.test.mjs`. Execute `node --test test/analise-desconto*.test.mjs test/calculator-doc-examples.test.mjs`: convenções, tarifas, grupos, datas, limites tributários, recálculo da projeção, Price e interação React. Testes em memória não substituem inspeção de navegador nem homologação bancária.

## Histórico e exclusões

O documento inicial (base `eeecfc9`) descrevia juros/IOF manuais e uma reconciliação das fotos com sete operações por mês, juros R$ 2.603,15 e IOF R$ 1.191,60 informados. Aqueles totais pertenciam ao fluxo antigo e **não validam a versão atual automática**. O campo de quantidade, não a foto, determina se a projeção usa seis, sete ou outro número de operações. A hipótese histórica de tarifa 0,25% também não é condição contratual confirmada.

Não estão modelados mora, baixa de duplicatas, seguros, demais encargos, renegociação ou reinvestimento de fluxos. O rascunho desta tela fica em memória do componente e os resultados são removidos quando inválidos. Não há módulo de alongamento nesta calculadora.
