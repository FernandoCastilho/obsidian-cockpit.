# Análise de desconto

Implementação isolada sobre a produção `eeecfc9d8d9560e010a3584e812ba74a95c6d9f5`. Não publicada.

## Acesso e escopo

- Calculadoras → Análise de desconto; rota `#calculadora/analise-desconto`.
- Comandos `DESCONTO` e `Análise de desconto`; conteúdo integrado à busca.
- Motor puro em `cotacoes/src/analiseDesconto.js`, tela em `AnaliseDesconto.jsx`, estilos próprios.
- As calculadoras existentes e o motor `emprestimo.js` não foram modificados.

## Informações que não devem ser confundidas

1. A primeira foto tem seis operações por mês e a segunda tem sete. O valor editável é a única fonte da quantidade. O exemplo inicial usa seis; os testes de reconciliação usam sete.
2. R$ 564,00 está rotulado como custo unitário, porém o resumo o trata como total por operação. A tela exige escolher total informado, unitário × quantidade ou percentual do valor. Nenhuma forma vem selecionada.
3. O percentual de 0,25% reproduz os centavos da segunda foto, mas foi inferido, não confirmado como tarifa contratual. R$ 564,00 como total produz R$ 32.331,25/mês; a hipótese de 0,25% produz R$ 32.331,26/mês.
4. O total R$ 4.054,75 da primeira foto exclui a tarifa de títulos. O custo completo da implementação inclui a tarifa e o líquido é corrigido. O subtotal sem títulos aparece separadamente para conciliação.
5. As taxas de desconto da foto não permitem reconstruir juros sem os prazos dos títulos. A tela mantém as taxas como informação, explicitamente rotulada, e usa juros e IOF pagos como entradas em reais.
6. A TAC de giro R$ 3.150,00 foi inferida dos resultados. É editável, com aviso, e não apresentada como tarifa padrão.
7. O adicional de IOF inicia vazio, pendente de definição. É preciso informar explicitamente 0 ou outro percentual. Tanto 0% quanto 0,38% são testados. A alíquota diária de 0,0082% também é editável e rotulada como premissa.
8. O principal do giro acompanha o volume bruto mensal por padrão explícito, não por apuração de NCG. O usuário pode informar outro principal. A tela alerta sobre montantes e fluxos diferentes.

## Fórmulas

Todos os percentuais são convertidos de % para fração antes do cálculo. Não há arredondamento intermediário; a exibição usa duas casas decimais.

- Tarifa de títulos: valor total informado, tarifa unitária × quantidade ou valor bruto × percentual.
- Custo real: tarifa de títulos + TAC + juros pagos + IOF pago.
- Líquido: valor bruto − custo real.
- Projeção mensal: cada custo por operação × operações por mês. Para a tarifa percentual da projeção, a base é o valor médio bruto informado.
- Juros e IOF pagos continuam valores nominais por operação, mesmo se o valor médio for alterado. A tela avisa e pede ajuste dos encargos ao trocar o cenário.
- Principal automático do giro: valor médio bruto × operações por mês.
- Giro Price: `PMT = P × i / (1 − (1+i)^(-n))`; taxa zero: `P/n`.
- A implementação usa `expm1` e `log1p` para estabilidade numérica. Amortização fechada da parcela k: `PMT × (1+i)^(-(n-k+1))`; a última amortização elimina somente o resíduo numérico do saldo.
- IOF diário: soma de cada amortização × menor valor entre dias corridos até seu vencimento e 365 × alíquota diária.
- IOF adicional: principal × alíquota adicional, uma vez.
- Juros do giro: matematicamente PMT × prazo − principal. No código, acumula juros sobre o saldo de abertura de cada parcela para evitar resíduo negativo ou perda de juros positivos quando a taxa é zero ou muito próxima de zero.
- Custo do giro: juros + TAC única + IOF diário + IOF adicional. TAC e IOF são pagos à parte, não financiados.
- Economia estimada: custo do desconto no prazo − custo do giro no prazo. Positivo significa menor custo do giro no cenário; negativo, maior custo.
- Média mensal all-in: `(principal + custo do giro) / prazo`. Não é a parcela contratual; a PMT sem TAC e IOF aparece em outra linha.
- Coluna Mês da comparação: usa o cenário de giro de 12 meses, com custo/economia divididos por 12. PMT e média all-in já são mensais.

## Calendário

Data da operação também é a data de liberação hipotética do giro. Vencimentos mensais a partir do mês seguinte, no mesmo dia, limitado ao último dia do mês quando necessário. A origem é sempre a data inicial, evitando deslocamento acumulado após fevereiro. Datas são calculadas em UTC, sem ajuste por dias úteis, feriados ou horário de verão.

Para 05/11/2026, as primeiras 12 parcelas vencem após 30, 61, 92, 120, 151, 181, 212, 242, 273, 304, 334 e 365 dias.

## Reconciliação da segunda foto

Premissas de reprodução: valor R$ 225.600,43, sete operações/mês, tarifa hipotética de 0,25% por operação, TAC desconto R$ 260,00, juros R$ 2.603,15, IOF desconto R$ 1.191,60, giro Price 1,83% a.m., TAC giro R$ 3.150,00, IOF diário 0,0082%, adicional zero, liberação 05/11/2026.

- Volume mensal/principal: R$ 1.579.203,01.
- Custo do desconto mensal: R$ 32.331,26. Anual: R$ 387.975,09.
- Giro 12 meses: IOF R$ 26.371,44; custo R$ 223.607,95; média all-in R$ 150.234,25.
- Giro 24 meses: IOF R$ 37.950,74; custo R$ 427.376,46; média all-in R$ 83.607,48.
- Giro 36 meses: IOF R$ 41.750,30; custo R$ 635.698,26; média all-in R$ 61.525,04.
- Giro 48 meses: IOF R$ 43.605,96; custo R$ 854.122,82; média all-in R$ 50.694,29.

## Limites e verificações

- Estimativa explicativa, não CET, proposta, conclusão tributária ou recomendação de contratação.
- Desconto recorrente e giro amortizado têm fluxos diferentes. A diferença nominal de custos não comprova economia efetiva nem equivalência de disponibilidade de caixa.
- Não inclui mora, baixa de duplicatas, seguros, outros encargos, renegociação ou reinvestimento de fluxos.
- 29 testes focais: fórmulas, quatro prazos, calendários, alíquotas, formas de tarifa, limites, principal fracionário com juros zero/quase zero e interação de edição dos componentes React sem navegador.
- 593 testes permitidos de regressão passaram. `commodities.test.mjs` foi integralmente excluído para não executar a fixture Python restrita. A lista executada consta no pacote de evidências.
- Lint: zero erros, sete avisos preexistentes de dependências de hooks, fora dos arquivos novos.
- Build de produção passou, incluindo regeneração da busca.
- Não executados: navegador, QA visual responsivo, preview/socket, Git status ou fixture Python. Renderização e testes de handlers React não equivalem a validação visual.
- Pendentes antes da publicação: decisão do adicional IOF, definição comercial da tarifa de títulos/TAC, auditoria independente, integração com candidatos paralelos e autorização de publicação.
