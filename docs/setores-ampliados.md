# Ampliação editorial de Setores e Insumos

Implementação reconstruída na nuvem a partir de `eeecfc9d8d9560e010a3584e812ba74a95c6d9f5`. Não é uma recuperação byte a byte do candidato anterior `502016a`, que não estava acessível. Nenhum push, merge ou deploy faz parte deste pacote.

## Escopo e leitura correta

- As 38 folhas da visão bancária e os cinco insumos visíveis recebem uma ficha própria, com recorte, cinco forças de Porter, cinco perguntas e pontos sensíveis ligados às perguntas.
- São hipóteses editoriais de investigação, não conclusões empíricas sobre a concorrência, diagnóstico do cliente, rating ou recomendação de crédito. As fontes de contexto são referências para pesquisa, não evidência de que cada mecanismo tenha sido medido.
- Cada ficha informa a data da revisão editorial. Essa data não é atualizada por uma consulta de notícias nem pode ser interpretada como período de um indicador.
- Temas amplos explicitam o modelo escolhido. Por exemplo, uma ficha de bovinos de corte não cobre toda a proteína animal; a ficha de diesel é a do comprador/operador de frota, não de uma refinaria.
- A visão B3, rotas, memória de seleção e referências de preço existentes são preservadas. As fichas genéricas anteriores deixam de ser apresentadas nesta tela.

## Notícias e direitos

Inventário de fontes, condições, datas e testes reais: [fontes-noticias-setoriais.md](fontes-noticias-setoriais.md).

A nova tela lê `public/sector-news.json`, separada do coletor legado de Google Notícias usado em outras partes do projeto. O pacote não certifica os direitos dos coletores legados nem altera a cobertura de outras telas.

O cadastro `src/sectorNews.js` contém fontes homologadas e candidatas desativadas. Domínio governamental, disponibilidade pública e atribuição não são tratados, isoladamente, como autorização irrestrita. Cada fonte ativa tem registro de licença, rota, tipos admitidos e recortes compatíveis. O coletor verifica novamente a licença esperada e as condições de acesso.

Só são publicados título original, instituição, tipo, URL direta, publicação original, coleta e licença. Não há fotos, corpo integral, tradução automática, resumo nem inferência da notícia. Comunicados institucionais não são apresentados como imprensa independente. Atribuição e licença ficam junto ao item, além do registro em Configurações → Base de dados.

A homologação para uso de manchetes e a disponibilidade de coleta automática são condições diferentes. Um snapshot obtido em pesquisa não comprova que o cron conseguiu consultar o mesmo endereço. Falhas e limitações de acesso são registradas, sem troca de domínio, proxy ou repetição para contornar restrições.

### Datas e estados

- Janela de 120 horas móveis, validada na coleta e novamente no navegador a cada minuto visível.
- Datas futuras, inválidas e itens fora da janela são excluídos.
- Publicação original não é substituída por atualização da página. Quando só a data é confirmada, não se inventa hora; usa-se inclusão conservadora do intervalo possível.
- O último sucesso de cada fonte é preservado em falhas. Gerar um arquivo não transforma uma tentativa em sucesso.
- `ok`, `partial`, `empty`, `failed` e `unavailable` são estados distintos. Zero resultados não prova que não existam notícias no setor.
- Não existe cota mínima de matérias. O relatório de cobertura registra os temas com itens e as lacunas; contagens mudam conforme a janela avança.

## Arquivos

- `src/sectorProfiles.js` e `src/recyclingProfile.js`: conteúdo editorial das 43 fichas.
- `src/SectorProfile.jsx` e CSS: apresentação das perguntas, pontos sensíveis, forças e limites.
- `src/sectorNews.js`: cadastro, relevância, validação de links/datas, deduplicação e estados por fonte/tema.
- `scripts/sector-news-lib.mjs`: coleta limitada a fontes habilitadas, verificação de condições e construção do snapshot.
- `scripts/fetch-sector-news.mjs`: comando explícito `--live` ou `--offline`, com gravação atômica.
- `src/SectorNews.jsx`: apresentação com janela revalidada, atribuição e avisos de cobertura.
- `.github/workflows/pages.yml`: etapa `--offline` apenas revalida a janela. Não consulta fontes externas; somente terá efeito se este código for publicado com a autorização aplicável.

A coleta externa está desabilitada em todos os ambientes deste candidato, inclusive local. Ainda falta homologar guardas e persistência de suspensões e do último sucesso entre execuções. A interface mostra esse limite. O comando --live sempre falha antes de ler arquivos ou acessar a rede. --offline exige snapshot existente e estruturalmente válido; ausência ou corrupção não pode gerar estado vazio nem sobrescrever a saída. Os testes reais históricos não representam aprovação para novas coletas.

## Verificação e limites

Testes de contrato verificam 43 IDs, 215 perguntas distintas, cinco forças por ficha e ligação dos pontos sensíveis. Testes de apresentação renderizam os componentes React e exercitam foco e estados de notícia. Testes de notícias cobrem relevância positiva/negativa dos temas, datas-limite, fontes não homologadas, falhas, licença, robots e URLs indevidas.

Esses testes não substituem revisão semântica independente, revisão dos direitos por fonte ou validação visual e interativa em navegador. O relatório de entrega informa o que foi efetivamente executado no candidato final. A fixture Python de `test/commodities.test.mjs` e preview/socket não foram executados novamente devido às restrições anteriores. Não houve consulta a `git status`.

As 18 correções de UX recuperadas em paralelo não estão incorporadas neste branch setorial. A reconciliação entre candidatos e a auditoria conjunta devem ocorrer antes de qualquer publicação.

## Revisão conceitual após auditoria

A revisão v2 separa equivalentes nacionais/importados (rivalidade), soluções fora do mercado que cumprem a mesma função (substitutos) e mecanismos verificáveis de barganha/dependência (poder dos fornecedores). Custos, sazonalidade e caixa permanecem nos pontos sensíveis, sem serem tratados sozinhos como forças competitivas. As 42 fichas foram reavaliadas, com 111 forças alteradas e 99 mantidas após leitura, não apenas os exemplos apontados. Ver a matriz completa em `docs/revisao-porter-v2.md`. Testes de regressão não substituem revisão semântica humana ou independente.

## Inclusão de Reciclagem

O novo tema possui cinco recortes materiais, cinco perguntas e insumos/serviços por aplicabilidade. Notícias mantêm cinco dias e cobertura parcial, com reclassificação offline de comunicado de plásticos já existente. Ver [reciclagem.md](reciclagem.md). A revisão v2 das 42 fichas anteriores permanece como registro histórico; este incremento tem revisão própria.
