# Controle de juros: pesquisa histórica para Aprender

Revisão: 06/11/2026. Recorte dos episódios: 1942–2024. Não é acompanhamento de taxas atuais, previsão ou recomendação de investimento.

## Escopo editorial

O estudo responde à pergunta sobre países que seguraram juros e o que aconteceu. Não transforma a expressão informal “forçado” em uma classificação única. Separa taxa básica, controle do rendimento de títulos, repressão financeira e tabelamento do crédito. O Brasil aparece explicitamente como contraste: os documentos consultados comprovam decisões do Copom e condições macroeconômicas, mas não estabelecem uma imposição política específica nem isolam a causa da crise.

Seis casos: Estados Unidos na guerra; Reino Unido e outras economias no pós-guerra; Brasil em 2012–2015; Japão no controle da curva; Austrália na pandemia; Turquia nos cortes de 2021 e na posterior reversão. Cada caso tem contexto, instrumento, resultado, limites, cronologia e links próprios. A ordem segue o início de cada episódio, com a ressalva de que o segundo é um recorte multinacional.

## Fontes e sustentação

Os links exatos estão em `cotacoes/src/jurosForcados.js`, em `FONTES_JUROS`, e são exibidos na interface. São documentos das autoridades responsáveis e pesquisas originais, não notícias como base principal. As avaliações dos bancos centrais são identificadas como avaliações institucionais, não como identificação causal independente.

| Caso | Evidência principal | Limite de interpretação |
| --- | --- | --- |
| Estados Unidos | Federal Reserve History registra 0,375% no curto e 2,5% no longo em 1942, compras necessárias para defender o rendimento, inflação de 17,6% entre junho/1946 e junho/1947 e acordo de 1951. História institucional do Fed de NY complementa o mecanismo. | Não confundir inflação anualizada de um mês de 1951 com inflação em 12 meses. O estudo não usa esse número. Guerra, oferta e retirada de controles compõem o contexto. |
| Reino Unido/pós-guerra | Pesquisa original de Reinhart e Sbrancia publicada pelo FMI em 2015 e versão de 2011 no BIS. Restrição de alternativas de poupança, rendimentos reais negativos, redução do encargo da dívida. | A faixa de 1% a 5% do PIB é economia média anual de juros entre os países da amostra de 12 economias no período 1945–1980. Não é dado exclusivo do Reino Unido ou ganho agregado de bem-estar. Working paper não equivale a recomendação do FMI. |
| Brasil | Comunicados do Copom de outubro/2012 e julho/2015; avaliação do FMI publicada em abril/2015; carta aberta do BCB de janeiro/2016 sobre inflação de 2015. | O FMI de abril/2015 ainda contém projeções para 2015: não usá-las como realizado. O IPCA realizado de 10,67% vem da carta de janeiro/2016. A Selic não era teto de toda a curva. |
| Japão | Decisão original de setembro/2016; ata de dezembro/2022; decisão de março/2024. | −0,1% incidia sobre uma parcela das reservas; não sobre todos os depósitos da população. YCC encerrou em 2024, mas compras de títulos continuaram. Não equiparar a trajetória japonesa à da Turquia. |
| Austrália | Revisão oficial do RBA de junho/2022 sobre o instrumento usado em 2020–2021. | O próprio RBA registra benefícios para captação/crédito e custos de saída. Não atribuir ao YCC isoladamente todo o efeito do pacote. |
| Turquia | Relatório anual do banco central de 2021 confirma corte de 19% para 14%; FMI sobre 2022 documenta pressão cambial e inflação próxima de 85% em outubro; relatório do banco central de 2024 confirma alta a 50% em março e inflação anual de 44,4% em dezembro. | Inflação é de 12 meses; juros são taxas anuais, não valores diretamente equivalentes. Choques externos também existiram. Recuperação inicial não demonstra sustentabilidade nem o contrário. |

Consulta documental feita por busca pública e leitura de páginas oficiais. Algumas páginas do BCB dependem de JavaScript: os trechos indexados oficiais foram confrontados com a carta aberta em PDF e a cronologia do FMI. O PDF do working paper do FMI retornou 403 na extração; o resumo oficial e a publicação no BIS foram usados para o que é afirmado. A página de release do IBGE também retornou 403 na extração e não é dependência do estudo, pois a carta oficial do BCB confirma o IPCA de 2015. Nenhum contorno de restrição foi utilizado.

## Implementação e integração

Base: `fc058bbf6de4f604296d101df50932b9a0ed1d08`, repositório FernandoCastilho/painel-especialista, branch local `feat/aprender-juros-historia` em checkout isolado. Nenhum push, merge ou deploy feito por este trabalho.

- Novo conceito `juros-forcados` em “Juros e câmbio”, com pesquisa em módulo próprio.
- Renderização opcional de `estudoHistorico` em Aprender, sem mudar conceitos antigos.
- Seis cartões expansíveis com controles nativos de teclado, links seguros e comparação responsiva.
- Busca local inclui o corpo histórico; a busca global já indexa o conteúdo estruturado do conceito.
- Mapa de conexões liga a inflação, diferencial de juros e custo de funding.
- Exemplo didático calcula retorno real pela fórmula composta, com teste numérico.
- Não incluir `searchContent.generated.json` no patch. Regenerar após integrar com os estudos setoriais.

## Validação

- 34 testes focados passaram: educação, navegação de Aprender e 5 novos testes do estudo.
- Suíte completa: 1.063 testes passaram, zero falhas.
- Build Vite passou.
- ESLint: zero erros; cinco avisos preexistentes em Calendario.jsx, Curves.jsx e SeriesHistory.jsx.
- Renderização SSR verificou os seis casos, links, datas, controles e ressalvas. O teste não equivale a inspeção visual no navegador.
- Prévia local inicia em 127.0.0.1:4179, mas o navegador separado retornou ERR_CONNECTION_REFUSED ao acessá-la. Não houve validação visual desktop/mobile nessa etapa. O integrador deve inspecionar a página na prévia acessível antes de publicar e repetir build, lint e suíte após integrar.

Não foram incluídos gráficos: as taxas dos casos medem instrumentos e prazos diferentes, de modo que um gráfico comparativo simples induziria falsa equivalência.
