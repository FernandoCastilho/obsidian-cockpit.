# Consolidação final do Painel, 05/11/2026

Candidato local, sem publicação. Este relatório consolida a integração 7fcd1c2, os reparos LD1/TFC 9fc05c6 e a aplicação do patch cambial a151c9b69ec2b6adde22e84eee08ddda7679a345. Os relatórios anteriores preservam os resultados históricos de cada etapa.

## Alterações reunidas

- 18 correções UX; FINIMP compacto; setores, reciclagem e notícias de cinco dias com cobertura parcial explícita; Maquila; Análise de Desconto com adicional de IOF sem padrão; motor TFB isolado; projeção Selic capitalizada/LCD e snapshot LD1 datado com coleta automática desativada.
- Reparos da auditoria: LD1 não apresenta diferenças entre vigências sob Dia/Mês/Ano, mas exibe Última mudança com ambas as datas. Falhas de moedas.json continuam visíveis em TFC; snapshot LD1 não é confundido com dado TFC, e dados TFC retidos recebem aviso.
- Correção cambial incorporada sem conflitos. Os 11 arquivos do patch correspondem byte a byte ao commit de origem. O índice de busca foi regenerado a partir de todo o código consolidado.

## Alertas de dólar e euro

O convite permanece quando falta permissão, mesmo sem alerta ativo. O pedido nativo ocorre somente por clique. Permissão negada ou indisponibilidade recebem orientação; falha de envio não consome o alerta. O marcador de sucesso é gravado apenas após aceitação pela API. Os testes usam APIs simuladas: nenhuma permissão foi solicitada nem notificação real enviada nesta integração.

A regra anterior foi preservada: variação estritamente superior a ±0,30% contra a primeira amostra válida disponível a partir das 9h de Brasília. Não é R$0,30 nem a variação diária da tabela. A confirmação do usuário sobre eventual troca para fechamento anterior ainda está pendente; não foi presumida nova referência.

Não há push de servidor nem monitoramento contínuo com o app fechado ou em segundo plano. Uma consulta iniciada com o app visível pode terminar depois de ocultar a aba. Instalar a PWA não elimina esse limite. O marcador legado pode causar um único reenvio no dia da atualização de um alerta ativo, previamente enviado e não dispensado. A aceitação pela API não comprova exibição pelo sistema operacional ou leitura. Não há exclusão mútua entre abas simultâneas.

## Verificação do consolidado

- 947 testes aprovados em 123 arquivos elegíveis, zero falhas.
- test/commodities.test.mjs excluído integralmente por conter a fixture Python restrita. Não foi executado npm test.
- Build Vite aprovado com Node 24.22.1, sem instalação de dependências ou rede.
- ESLint global: zero erros e cinco avisos preexistentes.
- git diff --check aprovado; nenhum Git status executado.
- Renderização React offline verifica erro e recuperação da fonte, snapshot LD1 e datas de vigência. APIs de notificação simuladas verificam convite, permissão tardia, bloqueio, falha/retry, deduplicação e dispensa. Não equivale a QA visual ou entrega real em dispositivo.
- Hashes confirmam preservação de Help, motores e telas Finame/FINIMP, motor TFB, notícias setoriais, snapshot LD1, bloqueio da coleta e Análise de Desconto.

## Limites mantidos

CET de TFB divergente e não certificado. Selic/LCD é projeção, não apuração contratual; não incorpora IOF, tarifas, seguros ou CET. Notícias continuam parciais, com suspensões preservadas. LD1 continua snapshot público datado, não fonte automática. Arquivos coletados moedas.json/CSV não foram fabricados.

Nenhum push, merge em produção, deploy, CI remota, preview, servidor, socket, navegador, fixture Python ou coleta externa foi iniciado. O roteiro smoke-alerta.cjs foi apenas incorporado, não executado. Os workflows existentes continuam contendo etapas restritas e não devem ser acionados nesta tarefa. A auditoria independente precisa conferir este novo SHA consolidado antes de qualquer proposta de publicação.
