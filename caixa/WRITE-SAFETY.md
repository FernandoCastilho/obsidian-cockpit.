# Conferência de identidade antes da gravação

## Escopo

Mitigação do achado C01: o Caixa guardava o número da linha e depois gravava nesse endereço. Uma reordenação ou inserção podia fazer o endereço apontar para outro lançamento. A reprodução com dados fictícios alterou INTERNET quando a ação pretendia alterar ENERGIA.

A versão proposta deve exigir identidade única, conferir novamente o registro e recusar mudanças na linha, nos valores ou no cabeçalho antes de enviar a alteração. As ações do próprio aplicativo devem ser serializadas, sem tentativa automática de repetir uma gravação incerta.

## Limite que impede encerrar o achado

A conferência e a escrita são solicitações distintas. Uma edição externa entre elas continua possível. A atomicidade de um lote de escrita não transforma a leitura anterior e a escrita em uma operação condicional única.

Portanto esta alteração **não é uma correção completa de concorrência** e não deve ser publicada como tal. O aplicativo permanece na versão publicada até a decisão sobre o caminho de gravação.

Para eliminar a corrida, a gravação precisa ser condicionada à mesma identidade e versão no servidor. A integração REST usada atualmente não oferece esse controle no pedido de escrita. Não foram introduzidos servidor, mudança de fonte de dados ou novas permissões.

## Critérios e evidência

| Critério | Verificação | Situação |
|---|---|---|
| Rejeitar ID ausente ou duplicado | Testes de gravação com respostas simuladas | Passou |
| Rejeitar linha movida, excluída ou alterada | Testes sem envio de POST após conflito | Passou |
| Rejeitar alteração de cabeçalho ou campo não autorizado | Testes de integridade do pedido | Passou |
| Preservar gravações válidas e tratar resposta incerta sem repetir | Testes de pedidos e respostas simuladas | Passou |
| Compilar o aplicativo | Build do Caixa no CI | A validar |
| Homologar interações da interface e modo de exemplo | Navegação no aplicativo | Não executado nesta etapa |
| Impedir edição externa entre conferência e escrita | Exige outro caminho de gravação, com controle condicional | Não atendido |

Os 37 testes Node (6 existentes e 31 novos) passaram. Usam dados fictícios e não acessam a planilha pessoal. A revisão da interface e a decisão sobre a corrida residual permanecem pendentes; a versão é experimental.

## Referências primárias

- [Google Sheets: atomicidade do lote e colaboração](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate).
- [Corpo de escrita da integração atual](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate).

O controle `requiredRevisionId` consta do serviço Sheets MCP em prévia. Sua disponibilidade no aplicativo, a obtenção de revisão compatível e a ativação do serviço não foram comprovadas; ele não foi adotado nesta alteração.

- [Controle por revisão no Sheets MCP](https://developers.google.com/workspace/sheets/api/reference/mcp/tools_list/update_spreadsheet).
