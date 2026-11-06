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

## Alertas de câmbio e permissão

`node --test test/alerta-variacao.test.mjs test/alerta-notificacao.test.mjs test/quote-freshness.test.mjs` verifica, sem navegador ou rede, o cálculo e o componente React com APIs de notificação simuladas. Cobre convite mesmo sem alerta, clique explícito, escolha adiada, bloqueio, liberação externa ao retornar ao app, ausência de suporte, falha e nova tentativa, envio pendente, cliques repetidos, dispensa concorrente, deduplicação por moeda/sentido/dia e migração do estado antigo. Não abre prompts nem envia notificações reais.

O limiar permanece estritamente maior que ±0,30% sobre a primeira amostra disponível a partir das 9h de Brasília, não R$ 0,30 nem o Δ dia da tabela. Sem essa base, não há alerta. Dados com mais de dez minutos, retidos ou de reserva não disparam alertas atuais. O navegador lê os dados enquanto o app está visível; não existe push de servidor para segundo plano/app fechado e movimentos revertidos durante a ausência não são reconstruídos.

`notificado` do formato anterior não comprovava envio e não bloqueia uma nova tentativa. `sistemaEnviadoEm` só é gravado após a API do navegador aceitar o envio; isso não comprova exibição pelo sistema operacional nem leitura. Dispensas existentes são mantidas. A primeira abertura após esta correção pode reenviar uma vez um alerta antigo ainda ativo e não dispensado. Sem armazenamento, a deduplicação vale só para a montagem atual; outras abas/perfis não possuem garantia de exclusão mútua.

O roteiro `scripts/smoke-alerta.cjs` preserva a verificação de dispensa separada do convite de permissão. Ele não foi executado nesta revisão: servidor local, socket, preview e fixture Python não foram usados. Layout e entrega real em dispositivos permanecem sem validação de navegador.

## Conta Garantida

`node --test test/conta-garantida*.test.mjs` verifica utilização única e lançamentos por data, amortização, reutilização, dias reais e úteis, feriados informados, meses, IOF sobre saldos e acréscimos, referências e bloqueios tributários, erros e fluxo React sem navegador. Juros e IOF são pagos à parte, nunca capitalizados; o motor rejeita encargos incorporados. O caso R$ 100 mil, dez dias, 3% a.m. proporcional/30 e IOF padrão resulta em R$ 1.000 de juros + R$ 462 de IOF.

Os testes de interface cobrem troca de modos, repetição de edição/adição/remoção, resultado inválido sem dados antigos, Simples, feriados, paginação, labels/IDs e rota de busca. São testes React em memória, não smoke visual. Não foi usado servidor/socket/preview/fixture Python nem feita publicação. Convenções e limites: `../docs/conta-garantida.md`.
