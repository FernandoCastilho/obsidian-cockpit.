# Diário de alterações do Caixa v2

## Objetivo e fronteira

As ações do aplicativo não podem mais atualizar endereços das abas-base. Cada ação acrescenta uma operação por ID em `Caixa_Operacoes`, usando `AppendCellsRequest` e o sheetId. A posição na tabela de origem não faz parte da identidade.

As abas-base continuam sendo a entrada de importação. Alterações manuais posteriores num registro com histórico devem aparecer como conflito externo, preservando a última versão confirmada e o histórico. Não rebasear nem descartar operações confirmadas silenciosamente. Administrar, ordenar ou apagar o diário reservado não é um fluxo suportado; ele será oculto/protegido e validado integralmente antes de usar seus dados.

## Layout do diário: 50 colunas A:AX

1. A `operation_id`: UUID, texto literal.
2. B `aba`: Lancamentos ou ContasFixas.
3. C `registro_id`: identidade, texto literal.
4. D `periodo`: `*` para Lancamentos; AAAA-MM de Brasília para ContasFixas.
5. E `parent_operation_id`: última operação aceita esperada, ou vazio para início.
6. F `base_json`: array com a base imutável original da geração corrente.
7. G `before_json`: array da versão efetiva vista pelo usuário.
8. H `patch_json`: objeto com alterações e `mode` (`edit`, `keep_app`, `use_source`).
9. I `after_json`: array completo da versão proposta.
10. J `created_at`: ISO UTC, informativo; não define ordem.
11. K `schema_version`: número 1.
12. L `accepted`: fórmula de aceitação calculada no Google Sheets.
13. M:AE: 19 valores tipados da versão proposta (ContasFixas usa 13, restante vazio).
14. AF:AX: 19 valores tipados da base original da geração corrente (ContasFixas usa 13).

A fórmula L considera somente linhas anteriores do diário e a tupla exata (aba, ID, período). Aceita apenas `parent_operation_id` igual ao último ID aceito dessa tupla; um ID de operação repetido não volta a ser aceito. Não depende de valores mutáveis da origem, para não desconfirmar uma gravação anterior.

## Leitura e tipos

- Cabeçalhos fixos e íntegros; rejeitar ID ausente/duplicado e células inesperadas.
- Fonte: 19 colunas de Lancamentos e 13 de ContasFixas; preservar os nomes já existentes.
- Sheets `valueRenderOption=UNFORMATTED_VALUE`, `dateTimeRenderOption=SERIAL_NUMBER`; o modelo existente já converte datas seriais.
- Ler o diário inteiro. Comparar o resultado das fórmulas L com a redução local; divergência não confirma escrita.
- Canonicalizar vazio como string vazia; manter números finitos, strings e booleanos sem coerção silenciosa.
- Operações duplicadas idênticas são idempotentes; mesmo operation_id com conteúdo diferente invalida a leitura.

## Contratos JS (coordenar alterações antes de divergir)

`journal.js` (puro):

- `TABLES`: configurações com `headers`, `idField`, `editable`.
- `JOURNAL_TITLE`, `JOURNAL_HEADERS`, `periodFor(aba, now)`.
- `replayJournal(rawTabs, journalValues, now)`: retorna `{ tabs, records, operations, conflicts }`. `records` é objeto indexado por `recordKey(aba,id,periodo)`; cada entrada contém `revision`, `base`, `row` (array efetivo), `sourceRow`, `conflict` e dados necessários para reconciliação. `operations` é objeto por operation_id com `{ accepted, duplicate, conflict }`.
- `recordKey(aba,id,periodo)`.
- `prepareOperation(state, {aba,id,revision,mudancas,mode}, operationId, now)`: valida a versão esperada e devolve `{operation, values}`; `values` é a linha A:AX com fórmula na coluna L. `revision` é explícita e obrigatória, inclusive vazio no primeiro registro. Não aceita endereço A1 nem número da linha como identidade.
- `acceptanceFormula()`: fórmula com ROW/INDIRECT para localizar apenas o prefixo anterior, em sintaxe pt_BR (separador `;`). O primeiro evento na linha 2 não deve gerar autorreferência.

`journalSheets.js` (puro, usa journal.js): gera requisições de instalação dos cabeçalhos e das visões `Caixa_Lancamentos` e `Caixa_ContasFixas`, sem apagar a origem. Visões exibem última versão confirmada, estado de conflito e referência da operação. Fórmulas usam somente IDs/diário, nunca endereço antigo escolhido pelo usuário. Números/datas devem conservar tipos. Usar `LET`, `MAKEARRAY`/equivalente comprovado no Sheets; testar em cópia antes de produção.

`sheets.js` (rede): mantém `carregar` e `gravarRegistro`; carrega fonte + diário, usa o reducer, acrescenta via AppendCellsRequest, relê e só devolve sucesso se operation_id foi aceito e não está em conflito. Nunca repete o append após resposta incerta; só permite recuperação por leitura do mesmo operation_id. Retorna `{tabs}` após confirmação. Ausência de diário/configuração bloqueia escrita de forma clara. Não há fallback para values:batchUpdate.

## Concorrência e reconciliação

- Dois clientes com a mesma revisão: primeiro evento aceito; segundo fica em conflito. Nenhuma operação sobrescreve outra.
- Origem apenas reordenada/inserida: mesma identidade/conteúdo, sem conflito; gravar pelo ID continua correto.
- Origem alterada após existir histórico: manter último estado confirmado, mostrar conflito, bloquear nova edição comum. `keep_app` e `use_source` precisam de escolha explícita na interface e criam nova geração/versionamento, preservando histórico.
- Resultado incerto: guardar somente operation_id pendente na sessão e recuperar por leitura; não guardar token ou payload financeiro adicional no diário de pendências do navegador.
- ContasFixas: histórico isolado por período; não mudar silenciosamente a política de reset da fonte no mês seguinte.

## Aceitação

Testar todas as janelas de reordenação antes/depois da conferência/append; nenhuma chamada de escrita toca a aba-base. Testar duas operações concorrentes, mesma operação repetida, confirmação perdida, fonte alterada, exclusão/duplicata, cabeçalho inválido, diário truncado/inválido, passagem de mês e reconciliação. Fazer ensaio real em cópia, comparando fórmulas do Sheets com reducer JS. Migrar os relatórios nativos conhecidos para as visões consolidadas e verificar valores; consumidores externos não inventariados não podem ser declarados migrados.
