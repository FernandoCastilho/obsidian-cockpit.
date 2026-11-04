# Busca global, seleção de gráficos e recuperação judicial

Esta entrega foi preparada na branch local `codex/busca-global-comparacao`, incorporando a versão publicada `20bb3a0` (Focus e Novidades). A publicação do conjunto foi expressamente autorizada em 04/11/2026 e é acompanhada na PR #284, com CI antes de atualizar a versão pública. As mudanças concorrentes da versão b427edc foram preservadas.

## Busca global

- Botão Buscar em desktop e celular; Ctrl+Shift+F quando o navegador entrega o atalho à página. Ctrl+F, formulários e os atalhos existentes são preservados. Escape fecha e restaura o foco.
- Índice estático gerado antes de dev/build a partir de rotas explícitas. Conceitos completos de Aprender, glossário, setores, Base de dados e Novidades também entram. Não depende do DOM ou de abrir abas lazy.
- Dados dinâmicos são lidos dos JSON publicados e do endereço de câmbio já configurado no app. Cobertura parcial, indisponibilidade, cópias preservadas e limites são apresentados. Não busca o texto integral de sites externos.
- Termos ficam em memória no navegador, sem consulta remota, histórico de URL ou armazenamento pessoal. Campos digitados e conteúdo privado/transitório não entram no índice. Resultados usam texto React, sem interpretar HTML.
- Rotas levam ao conceito, setor, carteira de inadimplência, série BNDES, ano de referência Focus ou aba de notícias pertinentes. O trecho do resultado fica identificado como cópia do conteúdo indexado; filtros de histórico podem exigir ajuste para registros antigos.
- Novas áreas devem ser registradas em `SEARCH_PAGES`; novos arquivos públicos em `SEARCH_SOURCES`. O protótipo Apresentar não é anunciado nem indexado como área pública.

## Inventário dos gráficos

| Família / componente | Comportamento |
| --- | --- |
| Câmbio detalhado e paridades / HistoryChart e ParityChart | Seleção existente preservada; datas de ano bissexto, cancelamento de toque e estabilidade durante o arraste corrigidos. Usa histórico carregado. |
| Juros, CDI, Selic, índices e taxas / Plot, Macro e RateModal | Mesma seleção; comparação anual quando a série cobre as datas. Taxas em pontos percentuais; ausência de histórico declarada. |
| Petróleo e commodities / OilHistory e SeriesHistory | Seleção de histórico, comparação anual e filtros preservados. Níveis/preços usam retorno percentual; taxas usam p.p. |
| Atividade e emprego / IndicatorHistory | A comparação recebe o histórico completo carregado, além da janela visível. Meses ausentes não são preenchidos. |
| BNDES individual / BndesChart | Preserva períodos e tabelas. Distingue níveis monetários/índices de taxas. |
| BNDES com várias séries / BndesCompare e MultiLinhas | Seleção simultânea; compara os níveis originais por série, sem confundir normalizações com retornos do ano anterior. Extensão temporal mantém o mesmo referencial da visualização. |
| Inadimplência PF/PJ / MultiLinhas | Meses exatos e completos, histórico das duas pessoas separado, variações em p.p. O eixo pode alcançar o ano anterior ao soltar o arraste; não muda durante o gesto. |
| Focus / FocusHistorico e MultiLinhas | Mantém o mesmo ano-alvo de previsão em cada linha. Taxas em p.p., câmbio em nível/retorno. As 52 semanas podem não cobrir o ano anterior; nesse caso informa indisponibilidade. |
| IPCA por grupo / IpcaGrupoChart | Barras e consulta mensal preservadas. Seleção compara acumulados compostos dos meses, exigindo cobertura completa, sem somar taxas mensais. |
| SOFR com médias e percentis / Sofr | Preserva a faixa e as legendas. Compara separadamente as séries ligadas, com histórico integral disponível. |
| Moedas sobrepostas / Resumo MultiPlot | Preserva a exibição normalizada; compara retornos de cada moeda pelos níveis originais do histórico. Intraday sem histórico anual é explicitado. |
| Minigráficos / Sparkline | Seleção compacta usando somente a cobertura carregada; protege o clique de abrir o detalhe após um arraste. Taxas dos indicadores em p.p. |
| Acessos / AcessosPanel | Barras HTML recebem seleção e comparação pelo histórico disponível; janela curta não vira ano anterior fictício. |
| Curvas DI, cupom, Treasury e euro / Curves | Exceção: eixo de vencimentos, não de calendário. Preserva comparação entre as datas disponíveis na legenda e explica por que não há seleção anual por arraste. |
| CDI futuro / CdiFuturo | Seleção do trecho projetado é mantida; não confunde horizontes futuros com histórico realizado do ano anterior. |
| Barras de variação por prazo / CupomLeitura; cenários de custos / HBars | Exceção: comparações por prazo ou cenário, sem eixo de datas. A evolução histórica por data continua interativa. |
| Widget externo de petróleo | Interação do provedor preservada. Comparação controlada pelo painel fica no histórico nativo, sem prometer acesso aos dados internos do widget. |
| Recuperação Judicial | Não há gráfico numérico enquanto não existir série validada. Ausência não é desenhada como zero. |

Mouse, toque horizontal e Shift com setas selecionam; Escape e Limpar seleção desfazem. A rolagem vertical no celular é preservada. A matemática usa observações existentes e trata 29 de fevereiro como 28 de fevereiro no ano anterior. A tolerância diária existente de até sete dias é declarada; observações mensais precisam cobrir os meses exatos.

## Recuperação Judicial

Rota `#cenarios/recuperacao`, imediatamente após Inadimplência. Seleção de semana, definição das etapas, espaço de ranking e indicação de lacunas estão prontos. Não existem contagens ou ranking de pedidos semanais nacionais por setor validados para esta entrega.

O arquivo `recuperacao.json` versão 1 contém apenas cobertura e conferência de endereços: totais nulos, sem setores ou pontos fictícios. O coletor faz exclusivamente HEAD de três endereços oficiais, com cache de sete dias, e preserva a integração de retenção semanal do painel. A data de revisão não é uma data de atualização de contagens.

### Limite dos dados

O leiaute oficial da Receita descreve CNPJ básico, matriz/filial, CNAE principal, situação especial e sua data: https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf . Isso não transforma o cadastro mensal em eventos processuais semanais. Um estoque cadastral futuro deverá contar CNPJs básicos distintos, classificar pelo CNAE principal da matriz e declarar referência, codificação, valores da situação especial, duplicidades, matrizes ausentes e cobertura.

Catálogo: https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj . Arquivos: https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9 . A leitura automática destes endereços não confirmou por si só os valores reais da coluna, a qualidade dos arquivos ou a referência de uma ingestão. Não foram baixados arquivos com múltiplos GB. Nesta revisão, catálogo e repositório responderam 200 à chamada HEAD; o PDF retornou 403 a esse método. O leiaute foi consultado publicamente na pesquisa, mas a rotina não transforma acesso a metadados em validação de dados.

DataJud não foi ingerido ou redistribuído; as restrições exigem licença compatível. Serasa não foi automatizado: é referência privada mensal, sem licença de automação validada nesta tarefa. Para preencher a parte semanal faltam fonte licenciada/compatível, definição dos eventos e datas, unidade de contagem e cobertura setorial. Esse bloqueio é de dados, não de código de apresentação.

## Novidades e concorrência

A versão publicada da PR #282 foi incorporada, incluindo Focus, inadimplência e cinco commodities. Sem duplicar suas entradas, esta entrega acrescenta Conceito do dia (02/11) e corrige posição do insight e base das 9h do alerta. Busca, nova seleção e estrutura de Recuperação Judicial entram nas Novidades desta release, mantendo explícita a indisponibilidade dos números semanais e do ranking de recuperação judicial.

O run 41813184848 pertence à PR #282, não a esta entrega: test-build passou e o smoke parou em timeout de networkidle no ensaio BNDES. O trabalho foi atualizado e seu deploy posterior 41814857421 terminou com sucesso. As correções concorrentes foram preservadas.

## Validação

- Suíte completa local: 508 testes aprovados, build aprovado; runtime temporário de python3 apenas para o teste Python existente no Windows.
- Testes unitários para texto completo, acentos, destaque Unicode, privacidade, rotas/contextos, meses faltantes, reversão do arraste, zeros, ano bissexto, inflação composta e revisão semanal sem contagens.
- Smokes novos de busca, carteira PF/PJ, famílias de gráficos e Recuperação Judicial; toque real via Chromium DevTools no celular, mouse/teclado no desktop, foco, Escape, formulários e responsividade.
- Regressões dos fluxos anteriores de Brent, BNDES, IPCA, fiscal e frete.
- Lint sem erros; avisos existentes de dependências de hooks. Detector mecânico de UI não apresentou achados.
- Capturas em `qa-universal/` no checkout e nos artefatos de QA. CI e deploy desta entrega são conferidos pela PR #284; não confundir com o CI da versão-base.


Atualização de acesso: a busca abre somente por Ctrl+Shift+F. O botão flutuante foi removido a pedido do usuário; dispositivos sem teclado físico não dispõem de acionador. Configurações, Base de dados, Novidades e Acessos foram retirados do catálogo, da coleta para pesquisa e dos resultados, com filtro adicional por rota. O conteúdo dessas áreas permanece acessível pela navegação normal.
