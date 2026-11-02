# Gravação por identidade e versão no Caixa

## Problema e solução

O achado C01 reproduziu uma ação para ENERGIA que alterava INTERNET depois de uma reordenação. O aplicativo deixa de gravar endereços das abas de origem. Cada ação acrescenta uma operação com UUID, ID do registro e revisão esperada no diário Caixa_Operacoes, por AppendCellsRequest e sheetId.

A fórmula de aceitação considera somente operações anteriores do mesmo registro e período. Duas ações com a mesma revisão não podem ser ambas a próxima versão: a primeira aceita avança o histórico; a outra permanece recusada. A confirmação da fórmula é comparada com a redução JavaScript antes de mostrar sucesso.

Não há escrita de retorno nas abas-base nem fallback para values:batchUpdate. Ordenar, inserir ou remover linhas da origem não muda o destino da operação.

## Fonte, visões e conflitos

Lancamentos e ContasFixas continuam recebendo importações e edições manuais. Caixa_Lancamentos e Caixa_ContasFixas apresentam o estado consolidado, a referência da operação aceita e a situação da origem. O aplicativo calcula o mesmo estado a partir da origem e do diário.

Após existir histórico, uma alteração manual de conteúdo preserva o último estado confirmado e abre conflito. A pessoa escolhe entre manter os campos editáveis do Caixa ou usar os valores atuais da planilha. Ambas as escolhas incorporam os demais campos atuais da origem e acrescentam uma nova geração ao histórico. A confirmação exige a mesma origem mostrada na revisão. Uma origem removida ou ambígua bloqueia a ação.

Contas fixas têm histórico separado por mês de Brasília. O período fica vinculado ao início do salvamento; uma solicitação em trânsito na virada do mês permanece naquele período. Cabeçalhos, IDs textuais únicos, tipos e snapshots completos são validados. Cabeçalho inválido, lacunas observáveis do diário, UUID divergente ou discordância com as fórmulas bloqueiam a leitura/gravação.

## Confirmação incerta

Antes do envio, a sessão guarda somente o UUID pendente. Falha ou perda da resposta não provoca novo append. Atualizar apenas relê o diário: evento aceito confirma, evento recusado informa conflito, evento ausente continua pendente. Sair explicitamente apaga os dados locais, sem afirmar cancelamento de uma solicitação que possa estar em trânsito.

## Implantação

1. Validar em cópia nativa com registros fictícios e preservar uma cópia integral antes de configurar a planilha em uso.
2. Publicar a nova versão. Até existir diário íntegro, o Caixa permite consulta e bloqueia gravação.
3. Instalar diário e visões sem apagar entradas existentes. Migrar os totais nativos conhecidos de ContasFixas para Caixa_ContasFixas, preservando P6 (meta) e P7 (diferença).
4. Conferir valores, fórmulas e interface. Reabrir as abas antigas do aplicativo para carregar a versão nova.

A instalação não muda o schema das abas de entrada, os escopos OAuth nem as permissões de compartilhamento. Não foram inventariados consumidores externos ao arquivo. Uma cópia antiga do aplicativo aberta antes da atualização continua executando código antigo até ser recarregada.

## Fronteira de integridade

O diário é reservado ao aplicativo, oculto e sinalizado/protegido contra edição acidental. Não deve ser ordenado, editado ou apagado manualmente. Esta solução protege o fluxo normal do aplicativo e mudanças na origem; não oferece imutabilidade contra um administrador que reescreva o histórico inteiro. Dados malformados e divergências detectáveis falham de forma fechada. A remoção administrativa de toda a cauda, sem referências restantes, pode não ser detectável. Não se apresenta a API Sheets como uma operação CAS nativa.

## Validação

A evidência final de testes automatizados, navegação e ensaios nativos será registrada neste arquivo antes da liberação. O ensaio nativo é necessário: ARRAYFORMULA deve envolver toda a divisão usada por LOOKUP; a divisão fora desse contexto retornava o primeiro evento no Google Sheets real.

Referências primárias: [AppendCellsRequest](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#AppendCellsRequest), [batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate).
