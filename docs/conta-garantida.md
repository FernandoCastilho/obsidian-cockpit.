# Conta Garantida

Implementação isolada em 05/11/2026. Não publicada.

## Escopo solicitado

Nova calculadora em `#calculadora/conta-garantida`, com dois modos:

1. Utilização única: valor, data inicial e prazo em dias corridos ou data de quitação. O principal é quitado automaticamente na data final.
2. Lançamentos por dia: utilizações e amortizações em tabela, com apuração até uma data escolhida, inclusive. Não presume quitação na data final.

Instrução posterior e específica do usuário: juros e IOF são pagos à parte e não incorporados ao saldo. Portanto, não existe capitalização, juros sobre juros, financiamento de IOF nem coluna de encargos debitados. O saldo é exclusivamente o principal utilizado menos amortizações. Essa é a premissa deste produto, não uma afirmação universal sobre todos os contratos de conta garantida.

## Cálculo

- O saldo anterior ao primeiro dia é zero. Para uma operação já em andamento, deve ser incluído seu histórico desde a utilização original. Informar o saldo antigo como novo saque cria adicional indevido e não é uma importação de saldo inicial suportada.
- Lançamentos da mesma data são somados, independentemente da ordem de entrada. Não há saldo credor nem modelagem intradia. Amortização superior à utilização acumulada bloqueia o resultado.
- `saldo[d] = saldo[d−1] + utilizações[d] − amortizações[d]`.
- Juros do dia = saldo utilizado × taxa diária nos dias escolhidos. A taxa é obrigatória e começa vazia. Zero é permitido, mas vazio nunca é convertido em zero.
- A taxa diária pode ser proporcional (`taxa / base`) ou equivalente (`(1 + taxa)^(1/base) − 1`). Essa opção converte a taxa, não capitaliza juros. Bases disponíveis: 1, 30, 360, 365 e 252.
- Dias de juros: corridos, ou segunda a sexta menos feriados informados pelo usuário. Não há importação implícita de calendário. IOF continua em todos os dias corridos.
- IOF diário = saldo de fechamento × alíquota diária.
- IOF adicional = `max(0, saldo[d] − saldo[d−1]) × alíquota adicional`. Amortização não estorna IOF, e nova elevação gera adicional novamente.
- Utilização única: data inicial inclui saldo, data final tem quitação antes da apuração. Assim, data inicial + 10 dias resulta em dez saldos positivos e onze linhas, a última com zero. Uso e quitação na mesma data têm fechamento zero nesta convenção.
- Sem arredondamentos intermediários; somente exibição em centavos. Somar centavos exibidos pode produzir diferença em relação ao total de precisão completa.
- Custo total = juros + IOF diário + IOF adicional. Principal é apresentado separadamente, sem ser somado como custo.
- Apuração mensal respeita meses civis, não reaplica adicional ao saldo que apenas atravessa o mês e não representa datas de recolhimento. Meses inicial e final podem ser parciais.

## Base legal e fronteiras

Fontes oficiais lidas em 05/11/2026:

- Decreto 6.306/2007 atualizado, art. 7º, I(a), VI e §§ 1º, 12, 15, 16, 18 e 19; art. 45, II: https://www2.camara.leg.br/legin/fed/decret/2007/decreto-6306-14-dezembro-2007-566561-normaatualizada-pe.html
- Orientação da Receita Federal sobre a retomada das alíquotas em julho de 2025: https://www.gov.br/fazenda/pt-br/canais_atendimento/imprensa/notas-a-imprensa/2025/julho/receita-federal-do-brasil-explica-como-ficam-os-pagamentos-do-iof-diante-do-novo-entendimento/

Ambos os modos são cenários de contrato rotativo com reutilização prevista, mesmo quando o fluxo contém um único saque. Não são simulação de empréstimo de principal contratualmente definido.

Referências PJ/PF: 0,0082% ao dia e 0,38% adicional. Simples/MEI: 0,00274% ao dia, condicionado à confirmação do enquadramento, documentação e valor da operação até R$ 30 mil; não é inferido pelo saldo momentâneo. O formulário exige valor contratual da operação e confirmação explícita; utilização superior ao valor declarado bloqueia o cálculo. Isso não certifica elegibilidade tributária.

A referência automática só é disponibilizada a partir de 17/07/2025. Não há tabela histórica de alíquotas nem transições automáticas. Datas anteriores requerem alíquotas manuais constantes, com aviso de que isso não valida regimes históricos. Projeções além de 05/11/2026 mantêm a última referência verificada e avisam que não antecipam mudanças futuras.

Não se aplica teto genérico de 365 dias a esta operação adimplente por soma de saldos. Inadimplência e renegociação, principal definido, excesso de limite, indexadores variáveis, tarifas, juros/IOF incorporados e regras especiais não estão implementados. O estado inadequado selecionado no formulário bloqueia o cálculo. O § 12 sobre encargos é explicado como limite do modelo, pois neste escopo todos são pagos à parte.

## Interface e privacidade

- Nova entrada em Calculadoras, rota própria e documento de busca estático. Identificadores existentes preservados.
- Tabelas editável, mensal e diária; diário paginado em blocos de até 31 datas, com até 3.660 dias por simulação e 500 lançamentos.
- Labels, tabelas com cabeçalhos e escopo, regiões roláveis nomeadas, botões nativos, estados de erro e resultados antigos removidos quando o formulário é inválido.
- Campos só ficam na memória do componente. Trocar os dois modos mantém os campos, mas sair da calculadora ou recarregar apaga o rascunho. Nenhuma chamada de rede ou armazenamento é feita pela calculadora; dados privados não entram na busca gerada.

## Referências de teste

- R$ 100.000 usados por dez dias, taxa mensal proporcional de 3% / 30, IOF diário 0,0082% e adicional 0,38%: juros R$ 1.000, IOF diário R$ 82, IOF adicional R$ 380, custo R$ 1.462, saldo final zero. A taxa de 3% aparece apenas neste teste, nunca como oferta/default da tela.
- Fluxo de cinco dias: uso 10.000; uso 5.000; amortização 8.000; uso 6.000; amortização 13.000. Saldos 10.000/15.000/7.000/13.000/0. Bases adicionais 10.000/5.000/0/6.000/0. Com 3%/30 e IOF padrão: juros 45; IOF diário 3,69; adicional 79,80; custo 128,49.
- Quatrocentos dias adimplentes com R$ 100.000 sem capitalização: IOF diário R$ 3.280, sem corte em 365 dias.

`node --test test/conta-garantida*.test.mjs` executa cálculos, datas, feriados, mesma data, amortização, novo uso, taxas, alíquotas, limites, Simples, ausência de capitalização e interações React sem navegador. Nesta integração, a regressão global usa lista explícita de arquivos elegíveis com `node --test`, excluindo integralmente `test/commodities.test.mjs` por conter a fixture Python restrita. Não execute `npm test` nem workflows de preview nesta tarefa. ESLint e build são executados offline, sem iniciar servidores.

Não foi executada validação visual em navegador. Testes de estrutura/renderização React não comprovam layout, foco real no navegador ou experiência mobile. O log de origem test-final.log registra npm test e a execução do teste XLSX com fixture Python, contrariando a declaração original de que essa fixture não havia sido executada. O integrador registrou a divergência, não repetiu a operação e revalidou a lista elegível excluindo integralmente commodities.test.mjs. Nesta consolidação não houve servidor, preview, socket, fixture Python, publicação ou push; a base anterior foi preservada.
