# BNDES: integração isolada de TLP exigível e conferência TFB

Registro da implementação inicial, cuja base foi `fc058bbf6de4f604296d101df50932b9a0ed1d08`. O lote foi posteriormente incorporado à correção integrada da auditoria de 06/11/2026. Nada nesta nota comprova publicação. O índice de busca deve ser regenerado no lote integrado.

## O que mudou

- `#calculadora/bndes-tlp-exigivel`: formulário sem taxas presumidas, projeção de IPCA constante e cronograma explícito. IPCA positivo integra juros exigíveis e não aumenta principal na carência. J já ajustado, spreads multiplicativos e fonte/calendário confirmados. Juros negativos reduzem pagamento e, quando excedentes, o saldo.
- A escolha TLP em Finame aponta para essa tela, não executa o antigo cronograma capitalizado. Trocar a seleção mantém o preenchimento Finame, sem transferir condições entre modalidades; navegar para outra calculadora desmonta o formulário, e voltar restaura os padrões atuais. Foram retiradas da UI explicações antigas de correção capitalizada e a alegação de que diferenças de dias se compensariam no ano.
- `#calculadora/bndes-credito-tfb`: executa o motor 0.2.2 para a referência completa das três imagens. É leitura e conferência daquele cenário, não uma calculadora genérica nem uma cotação atual. Alterna as 34 parcelas e o fluxo de caixa de liberação mais 34 pagamentos.
- Atalhos `TLPEXIGIVEL` e `CREDITOTFB`, tiles e entradas na busca. Na correção integrada, o motor Finame teve carência, estabilidade numérica e validações corrigidas. O perfil capitalizado permanece apenas para uso programático explícito (`perfilTlp: 'tlpcap'`), sem acesso pela UI TLP. Os hashes antigos foram substituídos por testes de comportamento; a UI tem testes de integração explícitos. Ver [correções Finame](finame-auditoria-2026-11-06.md).

## Conferência numérica

As 34 linhas TFB e os 204 valores transcritos das imagens conferem. Juros R$ 842.970,58; principal R$ 3.000.000,00; parcelas R$ 3.842.970,58; tarifa R$ 2.200,00 uma vez; pagamentos após liberação R$ 3.845.170,58. IOF R$ 94.182,73 retido, sem segunda cobrança nas parcelas; recebimento líquido R$ 2.905.817,27. Primeiro desembolso R$ 154.720,44 em 15/02/2027 e saldo zero em 16/11/2029.

CET matemático do fluxo: 20,1568899289% a.a. (20,16% com duas casas), ACT/365. O CET original do cabeçalho não é alvo. A taxa precisa 17,5402%, a âncora da carência e o calendário parcial continuam inferidos, não certificados como condições contratuais gerais.

O teste TLP também confere os fatores da imagem: 1,0812 × 1,0125 × 1,02 × 1,1029 = 1,23150839697. Usa período anual sintético somente para testar a composição; não inventa cronograma para aquela imagem.

## Limitações preservadas

- TLP: somente projeção explícita. Não implementa IPCA histórico defasado com segmentos dup/dut e aniversário no dia 15, calendário bancário certificado ou truncagem contratual dos intermediários em 16 casas. Sem IOF/tarifas/seguros/CET. Ver `bndes-tlp-exigivel.md`.
- TFB: referência histórica de um cenário do usuário, não documento bancário nem certificação fiscal. Nenhuma regra é transferida automaticamente para Finame/TFC.
- TFC: a imagem comparativa não fornece o fluxo completo, todas as datas e os encargos. Não foi ajustada a taxa para forçar a primeira parcela ou total. Na comparação anterior: primeira R$ 105.142,24 versus R$ 119.415,01; total R$ 4.044.734,87 versus R$ 4.074.893,44. Trocar só a TFC para 14,38% não explica a primeira cobrança. Tarifa R$ 2.600,00 e CET 18,75% não podem ser conciliados sem condições restantes. Não confundir esse caso com as três imagens TFB.

## Fontes

- BNDES, Circular 13/2022, Anexo IV, seção 1, TLP exigível: https://www.bndes.gov.br/sbn/BNDES_online/Arquivos/04-22Cir13-Anexo-IV-Condicoes-a-Serem-Observadas-na-Contratacao.pdf
- BNDES, Anexo I, itens 5.2–5.6, vencimentos e carência: https://www.bndes.gov.br/sbn/BNDES_online/Arquivos/01-22Cir13-Anexo-I-Procedimentos-Operacionais.pdf
- CMN 4.881, fórmula do CET: https://www.bcb.gov.br/content/estabilidadefinanceira/especialnor/Resolu%C3%A7%C3%A3o4881.pdf
- Imagens originais do cenário TFB e fatores TLP fornecidas pelo usuário em 05/11/2026; transcrições independentes mantidas em `cotacoes/test/fixtures/bndes-tfb/`.

## QA e integração

Verificação histórica executada no lote inicial em 06/11/2026, antes das correções integradas da auditoria. Estes números não são o resultado do checkout integrado atual:

- 266 testes passaram: `node --test test/bndes*.test.mjs test/finame*.test.mjs test/validate-bndes.test.mjs test/global-search.test.mjs test/terminal.test.mjs` dentro de `cotacoes/`.
- ESLint de todos os arquivos JS/JSX alterados passou. `npm run build` e `git diff --check` passaram.
- Renderização React no servidor das duas novas telas passou, sem NaN/campos indefinidos. Isso não substitui QA do navegador.
- Revisão independente do motor e integração: corrigidos os textos financeiros residuais; retornos e campos conferidos.

**Pendente antes da publicação:** executar o smoke dedicado `scripts/smoke-bndes-profiles.cjs` em CI e inspecionar capturas 390, 768 e 1440 px. Verifica fluxo TFB, encargos sem duplicidade, TLP/carência/juros negativos, entrada vazia, eliminação de resultado antigo, ajudas, navegação, acesso via Finame e overflow. O script passou verificação sintática/ESLint, mas não foi executado neste ambiente. CUA não alcançou o preview local; uma tentativa de iniciar o servidor fora do sandbox falhou no provisionamento antes de executar. Nenhuma validação visual é alegada.

No lote integrado da auditoria, o smoke geral `smoke-calculadora.cjs` já substitui o cenário TLP capitalizado pelo encaminhamento à tela exigível, preservando as correções de IOF. O CI inclui `smoke-bndes-profiles` e guarda `BNDES_PROFILES_QA_OUTPUT` junto aos artefatos. Preparação de script e configuração não significam execução: o QA visual permanece pendente.
