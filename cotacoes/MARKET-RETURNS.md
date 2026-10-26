# Tabela limpa, acumulados e PTAX

Base: PR146, produção 648e96a. Esta alteração prepara uma PR draft; não autoriza merge/deploy.

- Fontes, datas por par, bases dos acumulados e metodologia ficam no rodapé de Mercado hoje, após paridade/petróleo. Avisos gerais integrais continuam no ⓘ, agora no rodapé global. Créditos obrigatórios do widget de petróleo e alertas operacionais permanecem visíveis. “Pendente”, “Reserva diária” e “Sem dado” são estados junto ao par, não textos de fonte.
- Sete colunas: par, cotação, Δ dia R$, Δ dia %, mês %, ano %, PTAX venda. A tabela rola horizontalmente em telas estreitas, com o par fixo e indicação visível; a página não deve transbordar. Desktop mantém tabela/gráfico e mobile/tablet empilham.
- MTD/YTD usam exclusivamente `history.json` central AwesomeAPI e a mesma série do par. O denominador é a última observação diária anterior ao primeiro dia civil do mês/ano; numerador, a última observação diária de um dia encerrado. Exclui a barra do dia em curso. Retorno = `(fim/base - 1)*100`. Não mistura spot intradiário, PTAX, BCE ou CNY com CNH. Mudança de par na reserva invalida o acumulado incompatível. Fontes/datas reais da base e do fim são informadas individualmente.
- Limites civis são `America/Sao_Paulo`, independentemente do fuso do aparelho. Exige uma observação no período e base/fim com lacuna de no máximo sete dias civis. Esse limite conservador rejeita cobertura insuficiente; não presume calendário de mercado ou valida pregões. Falta de cobertura ou erro resulta em “—”, nunca zero. A API diária é descrita como fechamento pelo fornecedor; o app não certifica que seja um fixing oficial ou preço de execução.
- Reutiliza a requisição/cache central existente, sem iniciar coletor ou criar fallback/credencial. A tabela pode mostrar cotação intradiária e acumulado encerrado em datas diferentes; o rodapé declara a distinção.
- PTAX usa `cotacaoVenda` já coletada do BCB, em reais por uma unidade de USD/EUR/JPY. Aceita somente boletim `Fechamento` ou `Fechamento PTAX`, valor positivo finito e data válida não futura. Não usa `paridadeVenda`, boletim intermediário/interbancário ou CNY como CNH. Ausência/incompatibilidade resulta em “—”. Não altera coleta ou fórmulas financeiras.

Fontes verificadas em 26/10/2026:

- BCB, documentação: https://www.bcb.gov.br/conteudo/dadosabertos/BCBDepin/gnastportal-dados-abertostaxas-de-cambio---todos-os-boletins-diarios.pdf — `cotacaoVenda` em unidade monetária corrente por moeda; `paridadeVenda` contra USD tem convenção distinta.
- BCB, consulta: https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes
- Consulta direta `CotacaoMoedaDia` JPY, 26/10/2026, retornou `Fechamento PTAX`, venda 0,03491 em 13:09:51, distinta dos boletins intermediários. Snapshot publicado tem USD 5,5007/EUR 6,1487/JPY 0,03491 na mesma data.
- AwesomeAPI: https://docs.awesomeapi.com.br/api-de-moedas — seção `/json/daily`, fechamento dos últimos dias, até 360 observações.

Verificação: `npm test`, `npm run build`, smoke de tabela com fixture calculada (10% MTD, 37,5% YTD), smoke geral e QA Edge em390/820/1440. Fixtures são identificadas nas prévias. QA com dados reais usa cotações públicas e snapshots JSON do artefato da produção PR146, sem publicar ou coletar novamente. Sem script de lint ou tipos configurado no projeto. Não equivale a certificação financeira/WCAG completa.
