# Mercado hoje — prévia de terminal

Base revalidada: produção4055bda34350817bc06db01dd68c475168608f1b. Branch isolada `feat/market-terminal-layout`; sem merge/deploy autorizado nesta etapa.

## Direção e limites

A imagem310356.png foi inspecionada no cloud pelo coordenador e por sua revisão de arte. O executor Windows não inspecionou os pixels originais: a transferência oficial falhou ao gravar xattrs. Implementação baseada na especificação visual revisada e explicitamente autorizada em26/10/2026: preto, cabeçalho vermelho-escuro estreito, filtros âmbar, resumo horizontal de valores existentes, tabela54%/gráfico46% no desktop, empilhamento mobile/tablet e divisores finos. Comparação final com o original cabe ao coordenador antes de qualquer publicação.

Não foram copiados renda fixa, notícias, foto de notebook ou dados da referência. TradingView para moedas foi adiado pelo usuário; AwesomeAPI/BCE/BCB e CNH atual permanecem identificados, sem código restrito, novos símbolos ou novas fontes. Petróleo continua seu componente aprovado, com CFD e EIA separados.

## Mudanças

- CSS escopado à seção Mercado hoje; navegação,ⓘ e demais seções preservados.
- Quatro valores existentes compõem resumo compacto, sem indicadores novos.
- A linha seleciona o gráfico inline e abre o modal existente; Escape/foco e comparação de moedas pelos chips permanecem. Paridade não substitui a seleção por um código inexistente no comparativo.
- Fonte histórica e data real do arquivo aparecem no gráfico, com ausência explícita de data quando não fornecida. Dados stale/erro/vazio e fonte reserva continuam visíveis.
- Controles de paridade recebem espaço para quebra de linha e44px no mesmo painel; não há mudança de cálculo.

## Validação

-197 testes Node e build aprovados; pacote JavaScript sem scripts próprios de lint/tipos.
- Smoke geral e UX142 aprovados; `scripts/smoke-market-table.cjs` também verifica54/46 em1440, empilhamento390/820, seleção inline, quatro modais, Enter/Espaço, Escape/retorno de foco, paridade, fonte reserva, erro/stale, EIA e ausência de overflow.
- Edge instalado no FTC-NOTE, headless/perfil isolado; testes funcionais em390/820/1440×1000. Não há teste em celular físico ou certificação integral financeira/WCAG; latência não medida.
- Previews contêm banner **DADOS FICTÍCIOS DE TESTE**. Para exportar a seção sem sobreposição da navegação fixa, apenas a altura do canvas é ampliada; largura permanece390/820/1440. A altura funcional volta a1000 antes de continuar os testes. O feed externo do petróleo é bloqueado no smoke e a indisponibilidade correspondente aparece honestamente na prévia.
- Evidências em `../source-evidence/terminal-preview/`, `terminal-ux/` e logs `terminal-*.log` fora do checkout. O smoke é reproduzível com Playwright disponível e `SMOKE_BASE_URL`, `TABLE_QA_OUTPUT`.

Prévias mobile e desktop existem localmente, com banner de dados fictícios. O helper oficial de upload preparado informou `Library prepare_uploads is not available` antes do envio; não há upload confirmado nesta etapa e não houve troca de rota após a falha. Somente PR draft para revisão do coordenador com os pixels originais. Nenhuma execução nova do coletor.
