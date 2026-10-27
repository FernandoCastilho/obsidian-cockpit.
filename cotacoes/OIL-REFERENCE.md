# Brent spot como referência principal

A linha Demais usa exclusivamente a última observação válida da série Europe Brent Spot Price FOB publicada pela EIA, USD/barril. Data da observação aparece junto ao preço; generatedAt e data de divulgação não a substituem. Não usa futuro ICE, CFD ou outro petróleo como fallback. Pontos ausentes/inválidos/futuros não viram zero.

Verificação27/10/2026: https://www.eia.gov/dnav/pet/hist/RBRTED.htm e oil.json publicado coincidem em20/10/2026,115,22USD/barril; publicação21/10,próxima prevista28/10. Observações diárias, divulgação defasada; não há promessa de atualização diária ou realtime. Notas oficiais https://www.eia.gov/dnav/pet/TblDefs/pet_pri_spt_tbldef2.asp identificam origemRefinitiv,negócioLSEG. É preço de mercado publicado por órgão governamental, não preço fixado pelo governo.

Histórico/modal/filtros EIA preservados. CFDTradingView permanece secundário em diálogo, com unidade/atraso não informado, marca/crédito próprios e série independente. Nenhuma extração do widget, nova fonte, contrato, chave, coleta disparada ou alteração de workflow. Moedas/POC permanecem fora do patch.

QA:218testes ebuild;390/820/1440px no EdgeFTC-NOTE com snapshot publicado, e falha/stale explicitamente simulados. Valor/data/unidade, histórico/Ano/teclado/Escape, CFDseparado e ausência de overflow passaram; as quatro colunas cabem em390px. Capturas identificadas em source-evidence/oil-eia-ui. Smoke opcional scripts/smoke-oil-eia.cjs requer Playwright já disponível via NODE_PATH, SMOKE_BASE_URL, OIL_QA_OUTPUT e opcionalOIL_QA_SNAPSHOT. Não executa coleta.
