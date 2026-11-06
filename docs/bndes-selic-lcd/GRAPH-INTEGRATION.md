> Nota de integração (05/11/2026): este documento preserva o relatório do candidato isolado. No Painel integrado, os caminhos de código partem da raiz do repositório. O teste de auditoria foi relocado para cotacoes/test/bndes-lcd-cap-independent.test.mjs, mudando apenas o import relativo. Os comandos e caminhos de logs originais abaixo são históricos; a verificação consolidada está em docs/INTEGRACAO-2026-11-05.md. Não foi executada coleta externa nem publicado o candidato.

# Selic 143 e sobretaxa LCD LD1: séries em cópia isolada

## Resultado revisado após validação oficial

- 143 permanece índice acumulado BNDES com seis casas. Não é taxa anual nem série SGS/BCB. A nota esclarece D-2 em dias úteis.
- LD1 integra catálogo, gráficos, rotas e CSV como SOBRETAXA LCD, % a.a. A sobretaxa das operações indiretas é fixa na contratação. As referências para novas contratações têm revisão trimestral e podem ser negativas.
- O histórico oficial contém nove registros. A referência vigente desde 01/10/2026 é **−0,110000% a.a.**, também retornada na consulta de 05/11/2026. Nenhum piso zero é aplicado.
- Atalhos abrem cada histórico e limpam comparações anteriores. Unidades diferentes recebem aviso de que a comparação não é custo total. A razão percentual sobre base negativa pode inverter o sinal; a tela informa isso e não a apresenta como rentabilidade.
- LD1 é desenhado em degraus, sem interpolar taxas ou inserir observações sintéticas. A nova opção de geometria é ativada somente para LD1. Os demais gráficos mantêm o desenho padrão. Agrupamento de pontos fica desabilitado no gráfico individual LD1 para preservar vigências publicadas.

## Endpoint verificado, coleta automática desabilitada

O pesquisador, após autorização do CAPTCHA da consulta oficial, identificou o link TXT. Navegador e HTTP 200 concordaram nas nove linhas. Content-Type text/plain;charset=UTF-8; 265 bytes; SHA256 caf9705be93b48b09f8c8f12a004c7503178da052cbae4b133fc147cca5410b4.

Fonte: https://www.bndes.gov.br/Moedas/umLD1.txt

Validação: 05/11/2026 às 14:52 UTC. `SOURCE_STATUS.LD1.endpointConfirmed` é true, mas `automaticCollectionEnabled` permanece **false**, conforme direção do responsável. O coletor **não solicita LD1** e registra “coleta automática LD1 pendente de revisão de segurança e termos”. Não houve execução do coletor nesta tarefa.

O parser adiciona `sourceValidated: true` e `source` quando recebe texto LD1 pela integração da fonte validada. A retenção só aceita LD1 anterior com ambos os metadados corretos. A verificação da procedência ocorre no ponto de ingestão; estes metadados não substituem autenticação de arquivos arbitrários. Nenhuma ausência é transformada em zero.

TXT auditado: `cotacoes/test/fixtures/ld1-oficial-2026-11-05.txt`, apenas fixture. Nenhum `public/moedas.json` foi criado ou sobrescrito com histórico parcial. Um eventual snapshot público autorizado será responsabilidade da integração principal.

O validador permite LD1 maior que −100 e menor ou igual a 100 como limites técnicos, sem rejeitar −0,11 ou zero. O monitoramento tem tolerância de 120 dias para a série trimestral; isso não certifica vigência contratual. O histórico contém registros adicionais em fevereiro e setembro de 2025; não foram fabricadas datas trimestrais.

Metodologia: Anexo IV, seção 5:
https://www.bndes.gov.br/sbn/BNDES_online/Arquivos/04-22Cir13-Anexo-IV-Condicoes-a-Serem-Observadas-na-Contratacao.pdf

## Verificação

49/49 testes focados passaram: catálogo, coleta bloqueada, procedência/retenção, negativos, ausência, CSV, rotas, degraus e regressões de gráficos. ESLint dos arquivos alterados passou sem avisos. Logs: `graph-tests.log` e `graph-lint.log`.

Finame e catálogo TFC preservados. Nenhuma publicação, preview, socket ou fixture Python executada por este trabalhador. Não houve validação visual em navegador. Os resultados da fonte vieram do pesquisador autorizado.

## Snapshot datado integrado à tela

A integração principal autorizou os nove pontos já consultados como snapshot, sem nova consulta. Bndes.jsx usa `withOfficialLcdSnapshot` em cópia memoizada, preservando o objeto retornado pelo hook. Famílias, série individual e comparações recebem o objeto consolidado. A nota de snapshot aparece sempre que a família Moedas ou a comparação LD1/143 está em tela, informa a consulta de 05/11/2026, a ausência de atualização automática e o limite de cobertura. Falhas do arquivo de moedas não escondem esse snapshot, mas geram aviso.

O coletor agora aplica o mesmo merge do snapshot ao resultado final antes de escrever moedas.json, sem requisitar LD1. Assim, quando o pipeline autorizado for executado, CSV e validação recebem os mesmos nove pontos, metadados e marca de dado anterior. O erro de coleta automática pendente continua explícito. Testes estáticos garantem que a trava vem antes de getText e que o merge vem antes de writeFile. O coletor não foi executado nesta tarefa. A API/arquivo do snapshot pertence à implementação principal e não foi alterada por este trabalhador.
