# Caixa Central (app de finanças)

App web (PWA) que **lê** a planilha "Caixa Central - Base de Dados" no Google Drive e mostra o resultado do mês,
os lançamentos, o orçamento (planejado × realizado) e a tabela anual. Não grava nada no Drive: a importação dos
extratos acontece fora do app, direto na planilha.

## Regras de cálculo (`src/model.js`)

- Resultado do mês = receitas − despesas. `reembolso` abate as despesas; não é receita.
- `transferencia`, `pagto_fatura` e `investimento` ficam fora de receita e despesa (evita contar duas vezes).
- Despesa de cartão conta na data da compra. O pagamento da fatura é `pagto_fatura`.
- "Conta corrente" soma só contas com `entra_no_fechamento = Sim`, pela `data_caixa`.
- Realizado, pendente e planejado vêm da coluna `status`.
- A visão por pessoa filtra a coluna `pessoa_id` (Todos, Família, Fernando, Iris).

## Rodar

```
npm install
npm test
npm run dev
```

Sem login configurado, o botão **Ver exemplo** abre dados fictícios no mesmo formato da planilha.

## Conectar ao Google (uma vez)

1. Em console.cloud.google.com, crie um projeto e ative a **Google Sheets API**.
2. Em *APIs e serviços > Credenciais*, crie um **ID do cliente OAuth** do tipo *Aplicativo da Web*.
3. Em *Origens JavaScript autorizadas*, adicione o endereço onde o app roda (por exemplo `http://localhost:5173`).
4. Na tela de consentimento, adicione seu e-mail como usuário de teste.
5. No app, abra **Ajustes**, cole o ID do cliente e salve. O escopo pedido é só leitura (`spreadsheets.readonly`).

O ID da planilha já vem preenchido. Para outro valor, use Ajustes ou `VITE_SHEET_ID` e `VITE_GOOGLE_CLIENT_ID` no build.
