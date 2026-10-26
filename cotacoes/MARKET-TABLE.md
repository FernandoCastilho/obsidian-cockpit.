# Mercado hoje — tabela de cotações

Base: produção `05b57005e8ceb0c9d7d34d6685a889df3711767c` (PR144). Nova interface preparada em branch isolada; não autoriza merge ou deploy.

- Seção e menu passam de Moedas para Mercado hoje. O endereço `#resumo` permanece compatível. Não há bloco editorial novo.
- Tabela HTML real: Par, Cotação (R$ por unidade), Δ dia (R$), Δ dia %. Linhas abrem os gráficos existentes; botão nativo no par oferece Enter/Espaço, foco visível e retorno após Escape. Paridade e petróleo conservam seus controles independentes.
- Δ absoluto vem somente de `varBid` finito fornecido pela AwesomeAPI. Ausência, valor inválido, reserva diária ou CNH cruzado não recebem zero nem valor inferido. CNH percentual conserva o cálculo e a identificação existentes; nenhuma fórmula financeira foi alterada. JPY mantém cinco casas visíveis na tabela.
- Fonte, data completa/fuso e estados ficam associados à cotação. PTAX identifica BCB e sua própria data (ou ausência explícita). Variação do período e erros/cobertura históricos permanecem no gráfico/modal, sem competir com Δ dia.
- Carregamento, reserva, dado preservado e indisponibilidade são distintos. Marca/atribuição TradingView, EIA, DI/Japão/BLS e UX142 preservados. Sem volume, feed ou marca Bloomberg.

## Referência e direção

Referência pública oficial inspecionada pelo pesquisador do coordenador: [Bloomberg Professional App](https://professional.bloomberg.com/products/bloomberg-terminal/access/bloomberg-professional-app/), especialmente a tabela Market Data. Foram adotados hierarquia, alinhamento numérico, grade discreta e sinais; não identidade ou dados do provedor. Clique linha→gráfico é a adaptação solicitada pelo usuário, não comportamento Bloomberg certificado.

Diretor de Arte/Simplificador revisaram capturas reais 390/820/1440, incluindo reserva, erro, dado preservado e modal. A revisão removeu duplicidade entre variação diária e do gráfico e separou fonte/data da PTAX. Checklist UX20: 1–5, 7–13, 15–19 atendidos no escopo observado/testado; 6 sem medição de latência, 14 sem novo campo, 20 sem fluxo de progresso. Não é certificação integral WCAG ou financeira.

## Verificação reproduzível

- `npm test`: 198 testes; `npm run build`: aprovado. Pacote JavaScript sem scripts próprios de lint/tipos.
- `scripts/smoke-market-table.cjs`: requer Playwright/Edge do executor, usa fixtures sintéticas identificadas. Aceita `SMOKE_BASE_URL` e `TABLE_QA_OUTPUT`. Testa quatro linhas, cliques, Enter/Espaço, Escape/retorno de foco, Back/Forward, reserva/erro/stale, precisão JPY, delta ausente CNH, alvos acima de 44px, ausência de overflow e preservação do modal EIA/símbolo do widget. Não certifica preços reais nem o feed TradingView, bloqueado nesse smoke.
- `scripts/smoke-ui.cjs` e `scripts/smoke-ux.cjs`: navegação e regressões UX142 aprovadas nas larguras configuradas; seletores atualizados para os novos rótulos.
- QA Edge instalado no FTC-NOTE, perfil headless isolado, viewports 390/820/1440 × 1000. Não foi teste em celular físico. Regressão adicional DI/Japão/BLS usa snapshots reais do artefato de produção PR144, com filtros/modal/teclado e sem erros/overflow.
- Evidências locais: `../source-evidence/table-final/`, `table-ux/`, `table-pr144/`, logs de testes/build. Capturas com fixtures não representam cotações atuais.

QA executada sobre build de produção, conforme TESTING.md. O servidor Vite dev apresentou `Cannot access lazy before initialization` em App.jsx não alterado; o build servido passou. Sem alteração oportunista em App/infraestrutura.
