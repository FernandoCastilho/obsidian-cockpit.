# Verificações

- `npm ci`, `npm test`, `npm run build` executam a suíte de lógica e o build.
- Os testes unitários não certificam fórmulas financeiras nem substituem revisão das convenções e das fontes.

## Smoke de navegador (opcional)

O arquivo `scripts/smoke-ui.cjs` exige Playwright instalado no executor e Chromium disponível. Os cinco roteiros abaixo rodam no CI (job `smoke` de `cotacoes-ci.yml`, com Chromium do Playwright 1.63.0); o de petróleo (`smoke-oil-eia`) fica de fora porque depende do arquivo `public/oil.json`, gerado só no deploy.

1. Execute o build com a base de dados apontando para a própria origem (`VITE_DATA_BASE=http://127.0.0.1:8768 npm run build`; sem isso o histórico central não carrega e Mês/Ano ficam em "—") e sirva `dist` em `http://127.0.0.1:8768` (por exemplo, `python -m http.server 8768 --bind 127.0.0.1 --directory dist`).
2. Execute `node scripts/smoke-ui.cjs` no mesmo executor. `SMOKE_BASE_URL` permite mudar a origem e `CHROMIUM_PATH` selecionar um executável já instalado.

O smoke intercepta dados financeiros com fixtures sintéticas, bloqueia chamadas externas, e verifica abas, carregamento tardio, teclado em gráficos, modal/Escape, Voltar/Avançar e link direto do calendário (#cenarios/calendario). Ele não confere cotações reais nem resultados financeiros. Somente um resultado completo de sucesso conta como teste executado.

Roteiros disponíveis: `smoke-ui`, `smoke-market-table`, `smoke-market-workspace`, `smoke-market-followup` e `smoke-ux`. Os cinco passam contra a interface atual (terminal). Os roteiros usam o canal `msedge` do Playwright por padrão; `SMOKE_CHANNEL=chromium` usa o Chromium do Playwright (é o que o CI faz).


## Proteção das cotações atuais

A coleta e o navegador compartilham `src/quoteSafety.js`. Antes de aceitar um preço, verificam campos numéricos obrigatórios, máxima/mínima, compra/venda, horário futuro e faixas amplas de segurança: USD/BRL 2–12, EUR/BRL 2–14, JPY/BRL 0,01–0,10 e CNH/BRL 0,30–2,50. USD/CNH é validado como a ponta do cruzamento, não como uma taxa em reais. Essas faixas são barreiras de integridade; não certificam a exatidão de um preço dentro delas.

Uma atualização rejeitada mantém apenas a última referência que também passe nas verificações, com horário original e aviso. Sem referência anterior válida, o par fica indisponível. Outras moedas continuam atualizando. O cruzamento CNH é preservado separadamente: uma ponta rejeitada não pode ser misturada com uma ponta nova. Valores retidos não acrescentam pontos ao intraday. Fontes, fórmula do CNH, defasagem entre as pontas e histórico diário não são alterados por esta proteção.

Execute `node --test test/quote-safety.test.mjs` para reproduzir os cenários de 5,40 → 54, falhas repetidas, primeira coleta, recuperação, rejeição da ponta USD/CNH, migração de arquivo antigo e campos inválidos. Os testes usam dados sintéticos e não consultam cotações reais.
