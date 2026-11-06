# Notícias setoriais: implementação e evidências

**Atualização de política, 05/11/2026:** o candidato de cinco dias aplica 120 horas de publicação. Os registros abaixo documentam a coleta anterior, feita com 168 horas, e não foram reescritos como se houvesse nova coleta. O snapshot original permanece intacto; a interface revalida a regra atual. Veja `noticias-cinco-dias.md`.

Revisão: 05/11/2026. Escopo: 37 temas editoriais + 5 insumos existentes. Fontes e resultados são parciais; nenhuma contagem mínima artificial. Nenhum arquivo legado de coleta foi executado. Secovi, Investing e Google News RSS não foram acessados.

## Contrato e segurança

- `src/sectorNews.js`: cadastro de temas/fontes, regras individuais, revisões editoriais fixadas por URL + título, validação de notícias e `normalizeSectorNews(data, now)`. Importável no Node e no navegador, sem JSX.
- `scripts/sector-news-lib.mjs`: parsing de páginas oficiais, robots conservador, coleta sequencial e integração com o mesmo validador utilizado no navegador.
- `scripts/fetch-sector-news.mjs`: no candidato v2, `--live` está desabilitado em todos os ambientes, antes de leitura de estado ou rede. `--offline` exige snapshot existente e válido e somente revalida seus dados, sem renovar último sucesso. Não há fallback para estado vazio.
- `public/sector-news.json`: só manchetes reais, originais, com atribuição, URL direta, publicação, coleta, tipo e licença. Sem fotos, texto integral ou cotas por tema.
- Rejeita esquema inválido, fonte não homologada, URLs inseguras/fora da rota cadastrada, atribuição falsa, licença ausente/incorreta, datas futuras e matérias fora de 168 horas. Não promove comunicado institucional a imprensa independente.
- Reavalia a janela no cliente. O desaparecimento de uma matéria na próxima hora pode ser correto: a janela é móvel, não sete dias civis.
- Tipos: `comunicado`, `estatistica`, `imprensa`. Nenhuma fonte de imprensa independente foi presumida disponível nesta entrega.
- `checkedAt` é a tentativa; `lastSuccessAt` só muda com leitura efetivamente bem-sucedida. Falhas não apagam matérias ainda válidas, mas o estado de falha permanece visível.
- Não há redirects automáticos. 401/403/429, desafio, robots restritivo ou mudança de licença interrompem a fonte; `accessSuspended` impede novas tentativas automáticas até revisão explícita.
- Ritmo próprio de prudência: sequencial, intervalo de 1,1 segundo por artigo, no máximo 40 artigos por fonte, uma página de índice e orçamento total de 10 minutos. Esses são limites da implementação, não limites oficiais prometidos pelos sites. Um `Crawl-delay` maior interrompe para revisão.

## Publicação original e precisão

O parser usa metadados `article:published_time`, `DC.date.issued`/equivalentes e `datePublished` de JSON-LD `Article`/`NewsArticle`. Não usa `dateModified`, `DC.date.created`, data do evento ou atualização da página como publicação. Metadados originais que discordam geram erro.

Quando não existe fuso confirmado, preserva a data ISO `YYYY-MM-DD`, marca `datePrecision: day` e só aceita se o intervalo completo possível em UTC (do dia anterior às 10h ao dia posterior às 11h59m59s) estiver dentro das 168 horas. Não inventa hora Brasília. Isso pode excluir matérias próximas das bordas mesmo que pareçam recentes. O campo `t` é só para ordenação nesses casos; a UI não deve exibir hora.

Verificação complementar direta de JSON-LD:

- MDIC, acordo Noruega: `datePublished = 2026-10-31T17:44:50-03:00`.
- MDIC, exportações/alumínio: `datePublished = 2026-10-29T10:18:00-03:00`. Expira em 05/11 às 13h18 UTC; nenhum horário de atualização pode estender isso.
- MDIC, certificados: `datePublished = 2026-11-04T09:32:00-03:00`.
- IPEN, reciclagem: `datePublished = 2026-11-03T00:00:00-03:00`; a meia-noite pode ser horário editorial/administrativo. `DC.date.created=13:38:04` e `dateModified=13:51:34` não substituem a publicação original.

## Direitos: fontes habilitadas individualmente

Não foi inferida uma licença apenas do domínio gov.br. O rodapé de cada fonte/artigo abaixo foi lido e declara CC Atribuição-SemDerivações 3.0 Não Adaptada. A [licença oficial](https://creativecommons.org/licenses/by-nd/3.0/) permite redistribuição inclusive comercial mediante atribuição, preservação e demais condições. Esta implementação usa títulos intactos, metadados e links, não adapta artigos nem sugere endosso.

O [robots do gov.br](https://www.gov.br/robots.txt) foi lido: as regras de restrição encontradas não cobrem as rotas cadastradas abaixo. O coletor revalida o arquivo antes de cada execução live. Isso não é um parecer jurídico nem licença genérica para qualquer conteúdo do domínio.

| Fonte | Evidência da licença e escopo |
|---|---|
| Anvisa | https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-suspende-equipamento-para-radioterapia-superficial |
| MAPA | https://www.gov.br/agricultura/pt-br/ultimas-noticias |
| ANTT | https://www.gov.br/antt/pt-br/assuntos/ultimas-noticias-antt |
| MDIC | https://www.gov.br/mdic/pt-br/assuntos/noticias |
| ANP | https://www.gov.br/anp/pt-br/canais_atendimento/imprensa/noticias-comunicados |
| ANEEL | https://www.gov.br/aneel/pt-br/assuntos/noticias/2026/workshop-debate-proposta-sobre-rateio-de-custos-da-reserva-de-capacidade-com-baterias |
| ANM | https://www.gov.br/anm/pt-br/assuntos/noticias |
| ANA | https://www.gov.br/ana/pt-br/assuntos/noticias-e-eventos/noticias/sistema-cantareira-continuara-a-operar-na-faixa-de-atencao-em-novembro-1 |
| Ministério do Turismo | https://www.gov.br/turismo/pt-br/assuntos/noticias/mais-de-2-milhoes-de-passageiros-devem-movimentar-aeroportos-do-brasil-durante-o-feriado-de-finados |
| Susep | https://www.gov.br/susep/pt-br/central-de-conteudos/noticias/2026/novembro/susep-transmite-1o-encontro-de-educacao-financeira-e-securitaria-do-norte-e-nordeste-nesta-quinta-feira-05 |
| CVM | https://www.gov.br/cvm/pt-br/assuntos/noticias/2026/destaques-da-cvm-em-outubro |
| ANS | https://www.gov.br/ans/pt-br/assuntos/noticias/beneficiario/deliberacoes-da-645a-reuniao-da-diretoria-colegiada |
| IPEN/CNEN | https://www.gov.br/ipen/pt-br/assuntos/mais-noticias/encontro-discute-tecnologia-de-radiacao-na-reciclagem |

A [política de uso da ANA](https://www.gov.br/ana/pt-br/politica-de-uso) contém condições próprias do banco de imagens. Não foram baixadas nem republicadas imagens. O direito de usar manchete/link não foi extrapolado para esse acervo.

## Fontes não habilitadas e bloqueios

- **IBGE:** API v3 oficial confirmada em https://servicodados.ibge.gov.br/api/docs/noticias?versao=3. A página de licença https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2080-agencia-de-noticias/an-artigos-diversos/9277-licenca.html retornou 403. Snippet de busca não substitui revisão integral. Limites e robots não verificados. Desativada, sem contorno.
- **Anatel:** página de notícias retornou desafio humano com support ID em pesquisa web. Desativada, sem nova tentativa.
- **MEC:** página principal retornou CAPTCHA/support ID. Nenhum seed de Fies foi admitido só pelo snippet. Desativado, sem nova tentativa.
- **BCB:** candidato sem homologação de acesso/direitos nesta entrega. A alternativa CVM tem escopo de mercado de capitais e não será apresentada como indicador bancário.
- **Agência Brasil:** direitos comerciais não foram presumidos. Não integrada.
- **USITC:** notícia/robots acessíveis na pesquisa complementar, mas licença de republicação não confirmada. Não integrada.
- **Comissão Europeia/DG Trade:** candidato PET Spunbond de 30/10/2026, com CC BY 4.0 e robots verificados na pesquisa complementar. Não integrado ao adaptador gov.br nesta entrega; não necessário para preencher contagem ou duplicar cobertura. Seu recorte é UE/China, não impacto brasileiro automaticamente.

### Anvisa: importante distinguir detecção de bloqueio comprovado

A pesquisa web abriu artigos originais e a licença. Em teste direto separado, o índice acionou o detector conservador de desafio (`support id is`, `testing whether you are a human`, `captcha` ou `access denied`). O HTML dessa resposta não foi persistido, portanto **não é possível determinar se houve desafio real ou referência incidental a script**. A evidência preserva esse limite, não inventa o trecho.

A coleta automática da Anvisa foi suspensa. Não houve retry, troca de rota/proxy ou tentativa de resolver desafio. O detector foi refinado e testado com fixtures para ignorar scripts, mas a fonte não foi reexecutada. As matérias manuais ainda dentro da janela permanecem com atribuição e estado de falha/último sucesso explícitos. Arquivo de tentativa: `sector-news-live-check.json`.

## Relevância e contexto

Há regras positivas/negativas e exemplos individuais para os 42 temas. Entre as rejeições testadas: cobre como verbo, Claro/vivo como palavras comuns, ANM como Academia Nacional de Medicina, dispositivos móveis versus móveis, comércio exterior versus varejo doméstico, banco de sangue versus financeiro, conteúdo patrocinado e notícia de acidente versus produção de caminhões.

Uma notícia só pelo corpo é admitida por revisão editorial explícita fixada no código a **URL exata + título original**. O registro guarda trecho literal curto e recorte. Tags arbitrárias no JSON não concedem essa exceção.

Exemplos de recortes:
- MDIC/Noruega: vestuário e máquinas, não todo o varejo brasileiro.
- MDIC/alumínio: exportações maio–setembro/2026 versus 2025, não variação semanal de preço.
- IPEN: anúncio de encontro sobre plásticos, não resultado econômico realizado.
- MTur: previsão anterior a Finados, não balanço observado.
- CVM: retrospectiva de outubro publicada em novembro, não nova consulta naquele dia.
- ANS: cartões de desconto não são apresentados como planos de saúde.
- ANA: Cantareira/Região Metropolitana de São Paulo, não condição de todos os sistemas brasileiros.

## Verificações operacionais

- Testes focais registrados em `sector-news-tests.txt`; fixtures artificiais existem apenas no teste, nunca no produto.
- Lint focal dos quatro arquivos de código/teste passou.
- **MAPA live passou:** 17 páginas de matérias lidas; uma página de índice. Resultados e rejeições por idade/fronteira em `sector-news-mapa-live.json`. Não usar o sucesso de uma fonte como sucesso de todas.
- `sector-news-initial-capture.json` e `sector-news-extended-capture.json` registram a coleta manual real. Não são prova de execução automática.
- `sector-news-remaining-live.json` registra a execução independente das demais fontes homologadas. A tabela final de cobertura é gerada a partir do arquivo público final, não por promessa.

## Comandos

- `node --test test/sector-news.test.mjs`
- `node scripts/fetch-sector-news.mjs --offline --input public/sector-news.json --output /caminho/de/validacao.json`
- `node scripts/fetch-sector-news.mjs --live` é recusado localmente e no CI. A persistência de restrições e os demais guardas precisam ser homologados antes de qualquer reativação.

Não houve publicação, push ou alteração de conta externa. O arquivo JSON não declara completude semanal para todos os setores.

### Fechamento operacional (05/11/2026, 10h12 UTC)

A execução live terminou. Foram lidas com sucesso páginas de matérias em **9 fontes**: MAPA (17), ANTT (8), MDIC (4), ANP (7), ANM (15), ANA (6), CVM (1), ANS (2) e IPEN (1). A contagem é de páginas lidas, não matérias exibidas: itens velhos, futuros/ambíguos e irrelevantes continuam descartados.

ANEEL, MTur e Susep retornaram índices sem candidatos que o parser pudesse validar; o estado é falha de parsing/descoberta, não “setor sem notícias” nem bloqueio confirmado. As seleções manuais elegíveis dessas fontes permanecem, com estado de falha visível. Uma leitura complementar direta de artigo MTur foi impedida pelo controle de execução por falta de evidência de autorização no contexto delegado; não houve contorno. Não foi criado artefato de resultado e o desfecho da execução não foi confirmado. Isso não autoriza afirmar que o site negou acesso.

O snapshot reconciliado às 10h12 UTC contém **26 manchetes únicas em 22 dos 42 temas**. Os outros 20 temas têm ausência explícita. Há 33 temas com cobertura parcial, 5 indisponíveis e 4 com falha (alguns preservam manchetes anteriores ainda válidas). A matriz completa está em `sector-news-coverage.json`. Contagens não devem ser fixadas na interface: a janela continua a avançar.

**Não foi habilitada coleta contínua neste candidato.** Um checkout efêmero de CI perderia suspensões e último sucesso se lesse apenas o JSON versionado. Por segurança, o CLI recusa `--live` quando `CI` está definido, antes de acessar a rede. O workflow deve executar somente `--offline` até existir armazenamento persistente homologado, carregado de forma fail-closed. A mescla local conserva suspensões por OR e preserva as tentativas/sucessos mais recentes; isso não equivale a persistência entre checkouts.

A data de revisão de direitos/editorial é armazenada com precisão de dia (05/11/2026), sem inventar hora. Publicação e coleta usam a precisão realmente disponível, como descrito acima.

Conferência do GET complementar MTur após chegada da autorização original: a sessão já não existia e o arquivo de saída permaneceu ausente. Não foi repetida a requisição, pois o resultado continuou incerto. A ausência dessa verificação permanece declarada; não foram criadas manchetes para compensá-la.

Na implementação inicial, a bateria focal tinha 24/24 testes aprovados. A v2 acrescenta regressões de coleta desabilitada, estado inválido e robots conservador; os resultados finais estão no relatório do pacote. O teste do arquivo público aceita zero notícias quando a janela expira; não há requisito artificial de manter conteúdo antigo para o build passar.

### Endurecimento v2

A auditoria apontou que o modo local poderia começar sem estado anterior. Esse caminho foi desabilitado, não apenas o CI. A biblioteca não possui transporte de rede real implícito e recusa o fetch global; seus testes usam transporte injetado. Nenhum caminho operacional do CLI alcança essas rotinas de coleta. Isso não é uma barreira de sistema operacional contra alguém que altere o código ou injete outro transporte deliberadamente. O snapshot público original foi preservado byte a byte. Não foram feitas novas consultas externas nesta correção.

O parser de robots agora rejeita sintaxe e diretivas desconhecidas, caminhos inválidos, agente ausente e Crawl-delay não numérico/negativo/infinito. É uma opção conservadora de interrupção para revisão, não uma alegação de cobertura integral de todos os formatos e extensões existentes.
