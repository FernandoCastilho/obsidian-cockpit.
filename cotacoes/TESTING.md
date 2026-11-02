# Verificações

## Conceito diário

`node --test test/conceito-diario.test.mjs` verifica conteúdo real, ciclo diário e persistência separada. `node scripts/smoke-conceito-diario.cjs` testa o build na origem `SMOKE_BASE_URL` (padrão 8768): entrada após o aviso, retorno no mesmo dia, virada de São Paulo com navegador em outro fuso, aviso aberto durante a virada, navegação para o conceito completo, foco, teclado, Escape e fila com Recado, em 390 e 1280 px com reduced motion. Capturas em `CONCEITO_QA_OUTPUT` (padrão `conceito-qa`). Sem armazenamento persistente, a deduplicação vale apenas para a sessão montada; outro navegador ou perfil possui histórico próprio.

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


## Estado da coleta e horário das referências

`dataHealth.js` separa a tentativa de leitura no navegador (`checkedAt`), a última leitura com dados válidos (`lastSuccessAt`), a geração do arquivo e o horário original das cotações. O cabeçalho e Configurações usam a mesma avaliação do câmbio. Ler um arquivo novo não torna recente uma cotação antiga. Retenção e falhas parciais prevalecem sobre a geração recente do arquivo. Os detalhes de Configurações mostram as datas; uma consulta direta não é rotulada como arquivo gerado.

Nas coletas de dias úteis, o relógio de atraso exclui sábado e domingo de Brasília, mantendo o atraso já existente e retomando a contagem na segunda. Os limites e os agendamentos não mudam. Não são presumidos feriados ou calendários de publicação específicos de cada país. A idade factual das cotações continua usando o limite existente de dez minutos, inclusive no fim de semana, sem declarar mercado aberto ou fechado.

Para indicadores periódicos ou taxas em vigor (por exemplo, Selic e IPCA), o estado da coleta considera os metadados do arquivo e suas falhas, sem inferir atraso apenas porque a última observação é antiga. “Sem alerta” significa ausência de falha informada e arquivo dentro do prazo; a referência permanece indicada no painel correspondente.

Regressão: `node --test test/data-health.test.mjs test/terminal.test.mjs`; testes de leitura em `test/health-refresh.test.mjs`. O smoke `smoke-data-health.cjs` confere os estados e as datas no build, com dados sintéticos.
