# Pendências conferidas em 04/11/2026

## CNH D06 — PR 278

Correção original integrada na branch de trabalho, preservando os commits publicados. Variação absoluta e percentual partem da mesma base anterior; ausência de base não vira zero. Estimativa da venda anterior preserva a razão compra/venda informada pela fonte.

## Horários das pontas — issue 277

A resposta pública consultada trouxe USDBRL timestamp 1793627745 e USDCNH 1793633367, intervalo de 93,7 minutos e datas antigas. Os horários vêm da fonte; não foram deslocados nem substituídos pela hora da consulta.

O limite de uma hora já usado pela auditoria passa a bloquear o cruzamento no coletor e no cliente. O último cruzamento compatível é retido com data original e aviso; sem último valor compatível, CNH fica indisponível. Retenção não vira ponto de intraday. Os horários de ambas as pontas passam a acompanhar novos cruzamentos. A validação continua apontando cruzamento novo defasado, mas reconhece rejeição/retencão explícita. O fornecedor ainda pode entregar pontas antigas: a correção evita publicá-las como cruzamento novo, não garante atualização do fornecedor.

## Notificações animadas

Recuperado o patch local de 03/11 e adaptado ao código atual, sem sobrescrever alterações posteriores. Notificações de atualização têm detalhes, fechamento, prazo suspenso por foco/hover/expansão, falhas persistentes e movimento reduzido. Preservado o parâmetro somenteData dos painéis sem botão. Ajustado foco durante consulta e posição abaixo dos controles do cabeçalho. Não são notificações push.

## Recuperação Judicial — bloqueio de dados

Não foi encontrada fonte nacional semanal por setor com permissão de uso compatível e cobertura validada. Nenhum número foi criado. DataJud: https://datajud-wiki.cnj.jus.br/api-publica/termo-uso/ restringe uso comercial e distribuição de informações derivadas. Não foi consultada sua API. CNPJ mensal tem finalidade cadastral: não mede pedidos semanais; a base volumosa não foi ingerida nem validada. Serasa não tem licença de coleta e redistribuição automatizada validada neste projeto. A seção publicada permanece explícita quanto às lacunas.

Para completar: fonte licenciada/autorizada de eventos, datas de pedido/deferimento/concessão, cobertura nacional, identificação/deduplicação e classificação setorial verificadas. Uma série cadastral mensal não substituirá silenciosamente o pedido semanal.

## Google Trends — atualização integral bloqueada

A PR 268 é uma implementação parcial antiga: RSS e três snapshots. Não foi integrada nem publicada como concluída. Os cinco grupos exigidos continuam crédito/caixa, investimento, juros/câmbio/comex, custos e reforma tributária.

API oficial ainda alpha com acesso restrito: https://developers.google.com/search/apis/trends . Não foi identificado acesso autorizado no projeto. Google documenta embeds em https://support.google.com/trends/answer/4365538?hl=en , mas a tentativa de abrir o Explore para obter/testar o código oficial retornou HTTP 429. Não houve contorno, repetição por outra identidade ou uso de endpoint não documentado. Embeds, se validados no futuro para todos os grupos, exibem gráficos externos; não fornecem dados locais para cálculos e comparação por arraste.

Para completar: acesso oficial à API ou embeds oficiais dos cinco grupos efetivamente obtidos e validados, com frequência/limitações e segurança verificadas. Não basta o RSS Em alta ou preencher séries ausentes com snapshots.
