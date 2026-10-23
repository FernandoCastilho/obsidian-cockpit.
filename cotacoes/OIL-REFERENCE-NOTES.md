# Petróleo — diagnóstico e integração (23/10/2026)

## Base e escopo

Branch isolada `fix/oil-reference-refresh`, checkout `oil-checkout`, rebase sem conflitos na base publicada `f79ea46` (PR 125). Deploy anterior confirmado em GitHub Actions: `claude/obsidian-plugin-analysis-bagjz3`, 6bfccb0, sucesso em 23/10/2026 14:42 UTC. Nenhum PR 123 integrado. Sem push, merge ou publicação desta alteração. App.jsx, Resumo.jsx, menu desktop e histUSD não foram editados por esta tarefa.
Não há AGENTS.md no checkout nem nos diretórios ascendentes inspecionados. Não há PRODUCT.md/DESIGN.md. Package.json define test e build, sem lint.

## Diagnóstico

A EIA não estava atrasada em relação à fonte: Brent spot FOB de USD 115,22/barril em 20/10/2026, release 21/10, próximo 28/10. Observações diárias divulgadas em lote semanal. Coleta real desta tarefa confirmou exatamente esses dados; somente generatedAt mudou no snapshot local (15:18:51 UTC), sem criar observação nova.
`fetch-oil.mjs` roda no deploy de pages.yml, cron horário minuto 17 em dias úteis de Brasília, e em pushes/dispatch. Falhas preservam último dado válido local/Pages e timestamp original, com stale/error. O cron de 5 minutos de quotes.yml coleta câmbio, não petróleo. OilTile reconsulta oil.json a cada 10 minutos com no-cache. Service worker usa network-first em JSON e cache como reserva offline. Polling adicional na EIA não produziria preço intradiário.

## Solução online

Widget oficial TradingView Single Ticker no card, símbolo TVC:UKOIL, identificado como CFD indicativo e USD/barril. Gratuito, sem nova credencial/assinatura; marca e atribuição preservadas. Preço, variação e atualização pertencem ao iframe oficial. Não se extrai, persiste ou mistura valor do widget no histórico EIA. QA observou o preço variar 116,31 (+3,01%), 116,29 (+2,99%) e 116,15 (+2,87%) durante a sessão, diferente da referência EIA.
Single Ticker não expõe timestamp verificável da observação ou atraso exato. O card declara atraso não informado; não promete realtime nem inventa horário. Link da atribuição abre referência no provedor se houver indisponibilidade do embed. Falha no script mostra mensagem de indisponibilidade. Bloqueadores de terceiros podem impedir o widget.
Detalhes e histórico preservam modal, filtros, gráfico e tabela EIA. Exibem última observação independentemente do filtro, datas de release/próxima divulgação e coleta UTC. Freshness distingue frequência da publicação de falha ou coleta antiga.

Fontes oficiais consultadas:
- https://www.eia.gov/dnav/pet/hist/RBRTED.htm
- https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm
- https://www.tradingview.com/widget-docs/widgets/tickers/single-ticker/
- https://www.tradingview.com/symbols/TVC-UKOIL/ (CFDs on Brent Crude Oil)
- https://www.tradingview.com/widget-docs/faq/general/ (atribuição e marca)
- https://www.tradingview.com/widget-docs/faq/data/ (sem API/exportação; plano pessoal pago não libera realtime no website)
- https://www.cmegroup.com/market-data/license-data.html
- https://www.ice.com/publicdocs/futures/ICE_Futures_Europe_Market_Data_Policy.pdf

Alternativa para futuros de bolsa com timestamp/atraso garantidos: contratar fornecedor autorizado ICE Brent/CME WTI com direitos de exibição pública e eventual retenção, coletar no backend com segredo e dataset separado, registrar vencimento/contrato, horário da bolsa, atraso e status, tratar rolagem. Exige licença/pagamento/credencial; nada foi contratado. Embed resolve referência online indicativa, não um feed licenciado de futuros.

## Validação e evidências

npm ci com lock existente; sem alteração de dependências. npm audit reportou 1 vulnerabilidade moderada e 1 alta preexistentes (fora do escopo).
Antes do rebase: npm test 137/137; build e diff --check passam. Três testes novos cobrem freshness, ausência e frequência semanal. Testes existentes cobrem parser/fallback/datas/histórico.
A primeira execução sob sandbox Windows falhou em realpath EPERM e no python3 do teste XLSX. Execução autorizada fora do sandbox passou integralmente sem mudanças alheias ao petróleo.
QA visual no Edge do computador do usuário, aba própria localhost:5177, 1440×1000 e 390×844. Widget exibiu preço/variação em ambos, inclusive atualizações visíveis. Modal abriu e fechou; filtro Mês preservado: 23/09–20/10, -1,90%, gráfico e tabela íntegros. Dia vazio informa ausência, sem zeros fictícios. Sem overflow horizontal observado; rolagem vertical funciona. Viewport restaurado.
Capturas fora do Git: `../oil-evidence/desktop-card.png`, `desktop-modal.png`, `mobile-card.png`, `mobile-modal.png`.

Parecer: aprovado com ressalvas. Dependência do widget externo e atraso/timestamp não garantidos estão explícitos. Validar em produção após integração pelo responsável. Nenhum dado CFD deve alimentar série EIA.

Checks finais após rebase f79ea46: 138/138 testes passam; build passa; git diff --check passa. Logs em ../oil-evidence/tests-final.txt e build-final.txt.

## Compactação do card (23/10/2026, base98c2973)

O Single Ticker legado instalado já mostra cotação e variação. O novo gerador Web Component pede conta para copiar snippet; não houve login, cadastro nem contorno. A compactação usa somente layout externo: histórico no cabeçalho, status consolidado e altura do host133px (iframe101px + crédito32px), mantendo script, símbolo TVC:UKOIL, marca e crédito integralmente visíveis. Nenhuma alteração interna, recorte, ocultação ou extração de feed. FAQ oficial exige usar apenas opções suportadas e contatar TradingView para remoção de marca/atribuição; nada foi removido.
Fontes: https://www.tradingview.com/widget-docs/faq/general/ e https://www.tradingview.com/widget-docs/tutorials/iframe/set-widget-size/ .
QA local Edge do computador do usuário em1440x1000 e390x844: card192,33px de altura, sem overflow; preços117,09 e117,11 visíveis, crédito completo; modal/filtro mensal EIA preservados. Moedas, frete, calculadoras e demais dados sem alterações.
