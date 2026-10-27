# Verificações

- `npm ci`, `npm test`, `npm run build` executam a suíte de lógica e o build.
- Os testes unitários não certificam fórmulas financeiras nem substituem revisão das convenções e das fontes.

## Smoke de navegador (opcional)

O arquivo `scripts/smoke-ui.cjs` exige Playwright instalado no executor e Chromium disponível. Os cinco roteiros abaixo rodam no CI (job `smoke` de `cotacoes-ci.yml`, com Chromium do Playwright 1.63.0); o de petróleo (`smoke-oil-eia`) fica de fora porque depende do arquivo `public/oil.json`, gerado só no deploy.

1. Execute o build com a base de dados apontando para a própria origem (`VITE_DATA_BASE=http://127.0.0.1:8768 npm run build`; sem isso o histórico central não carrega e Mês/Ano ficam em "—") e sirva `dist` em `http://127.0.0.1:8768` (por exemplo, `python -m http.server 8768 --bind 127.0.0.1 --directory dist`).
2. Execute `node scripts/smoke-ui.cjs` no mesmo executor. `SMOKE_BASE_URL` permite mudar a origem e `CHROMIUM_PATH` selecionar um executável já instalado.

O smoke intercepta dados financeiros com fixtures sintéticas, bloqueia chamadas externas, e verifica abas, carregamento tardio, teclado em gráficos, modal/Escape, Voltar/Avançar e link direto da FINIMP. Ele não confere cotações reais nem resultados financeiros. Somente um resultado completo de sucesso conta como teste executado.

Roteiros disponíveis: `smoke-ui`, `smoke-market-table`, `smoke-market-workspace`, `smoke-market-followup` e `smoke-ux`. Os cinco passam contra a interface atual (terminal). Os roteiros usam o canal `msedge` do Playwright por padrão; `SMOKE_CHANNEL=chromium` usa o Chromium do Playwright (é o que o CI faz).
