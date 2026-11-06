# Revisão do alerta de câmbio em 05/11/2026

## Resultado

A produção `eeecfc9` e o candidato consolidado antes desta correção possuíam o mesmo defeito em `AlertaVariacao.jsx`: o estado `notificado: true` era gravado imediatamente, inclusive quando não existia permissão ou quando o envio falhava. Conceder a permissão depois não reprocessava o alerta. O convite também só aparecia quando já existia um alerta visível.

A correção mantém o convite enquanto faltar autorização, mesmo sem alerta. O pedido nativo só é aberto por clique. Bloqueios são explicados com orientação para configurações; ausência de suporte é informada. O envio passa a ser confirmado pela API antes da deduplicação e falhas ficam visíveis com nova tentativa. Foco/retorno à aba verifica alterações externas de permissão. Uma dispensa concorrente não é perdida quando o envio termina.

## Regra verificada no código

- Unidade: percentual. Mais de +0,30% ou menos de −0,30%, não R$ 0,30. O limite exato não dispara.
- Base: primeira amostra intradiária válida do dia disponível a partir das 9h de Brasília. Sem ponto após 9h, não há base.
- A variação percentual diária exibida na tabela vem da fonte e pode divergir desse cálculo. A correção não substitui a base por outro critério.
- Frequência: um aviso de sistema aceito por moeda e sentido em cada dia/perfil, com dispensa local. A leitura dos arquivos é a cada minuto enquanto o app está visível. A coleta central é normalmente de cinco minutos na janela diurna e horária fora dela em dias úteis; o agendamento não é garantia de pontualidade.
- Origem e data: cotação e base do dia civil de São Paulo, cotação não anterior à base, sem valores retidos/reserva. A correção alinha o alerta ao limite existente de dez minutos para preço atual e rejeita números não finitos/horários inválidos.
- Modelo: faixa dentro do painel, sem necessidade de permissão, mais notificação do sistema quando autorizada e suportada. Instalar como PWA não cria push de servidor. O service worker só possui o tratamento do clique na notificação, não um assinante de push.
- App fechado ou oculto: não há monitoramento contínuo. Consultas periódicas ficam pausadas; uma consulta iniciada com a aba visível pode terminar e gerar um aviso após ocultá-la. Não se recupera um cruzamento que ocorreu e foi revertido durante a ausência. Não foi acrescentado serviço de segundo plano nesta revisão.

## Migração e limitações

O marcador antigo não distingue envio real de tentativa sem permissão. A correção preserva dispensas, mas apenas `sistemaEnviadoEm` comprova aceitação pela API para deduplicar. Isso pode gerar um único reenvio no dia de atualização de um alerta já enviado antes e não dispensado. Aceitação pelo navegador não garante que o sistema operacional tenha exibido a mensagem ou que alguém a tenha visto. Sem armazenamento, a deduplicação é somente da montagem atual. Não há exclusão mútua entre abas simultâneas.

Não foram inspecionados os preços ou permissões do dispositivo do usuário no instante relatado. Portanto, há defeito reproduzível no código, mas não se afirma qual condição específica causou a ausência naquele aparelho. Não houve publicação, acesso a fonte bloqueada, envio a terceiros ou notificação real.

## Verificação

Testes de cálculo e componente usam dados sintéticos e APIs simuladas, sem sockets ou browser. Cobrem autorização tardia, bloqueio, adiamento, falta de suporte, mudanças externas, falha/retry, concorrência de estado, duas moedas, sentidos opostos, limite exato e dado antigo. O build foi gerado e o lint executado. O roteiro de navegador foi ajustado para distinguir a dispensa do alerta do convite persistente, mas não executado; layout e entrega real em dispositivos continuam pendentes.

Validação na cópia isolada baseada em `fa9db14`: 26 testes focados e 858 testes da lista elegível passaram; 119 arquivos de teste. Excluído `test/commodities.test.mjs` por conter a fixture Python restrita. Esta base não contém os três arquivos de testes de Selic/LD1 adicionados na integração posterior; a regressão final do consolidado deve ser repetida após o cherry-pick. Lint global: zero erros e sete avisos preexistentes em outros componentes. Build Vite concluído.

A revisão independente não encontrou falha bloqueante. As duas ressalvas menores foram incorporadas: o limite de segundo plano também fica permanentemente em Configurações › No seu navegador, e o texto admite que uma consulta em andamento pode terminar após ocultar a aba.
