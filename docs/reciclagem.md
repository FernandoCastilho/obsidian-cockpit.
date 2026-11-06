# Reciclagem: tema próprio do Painel do Especialista

Inclusão solicitada em 05/11/2026. Base deste incremento: `98eb01224392da38b904e5c6b530044079e740cc`, candidato amplo que já aplica cinco dias a notícias. Trabalho em cópia separada; sem publicação, alteração dos diretórios anteriores ou incorporação automática das 18 correções paralelas.

## Escopo

Antes não havia tema de reciclagem. O rótulo de saneamento mencionava resíduos, mas a ficha cobre água/esgoto, não recuperação de materiais. Foi acrescentado `reciclagem`, com rota `setores/reciclagem`, no grupo editorial Energia e saneamento. São agora 38 temas setoriais mais cinco insumos: 43 fichas, 215 forças, 215 perguntas distintas e 215 pontos sensíveis.

A ficha separa triagem/pré-processamento da transformação industrial e exige escolher material, especificação e raio de atendimento. Os cinco recortes são papel/papelão, plásticos por resina, metais ferrosos, metais não ferrosos por metal/liga e vidro por tipo/cor. Não representa resíduos perigosos, eletroeletrônicos, compostagem, recuperação energética, disposição final ou reciclagem química.

Há cinco perguntas e pontos sensíveis, com cinco forças de Porter. Insumos/serviços críticos são detalhados por aplicabilidade, métrica e limite, sem cotação inventada. Matéria-prima virgem só é classificada como rival ou substituto depois de definir o mercado e a equivalência contratual; a mesma alternativa não deve ser contada nas duas forças. A seção de materiais e a de insumos ficam em detalhes expansíveis para manter o roteiro de visita legível.

## Referências e limites

Referências oficiais identificadas por busca indexada em 05/11/2026, não uma revisão integral dos documentos nem um parecer de enquadramento:

- SINIR, MTR: https://sinir.gov.br/sistemas/mtr/
- SINIR, instrumentos e contexto: https://sinir.gov.br/informacoes/sobre/
- Ibama, fichas por categorias do CTF/APP: https://www.gov.br/ibama/pt-br/servicos/cadastros/ctf/ctf-app/ftes/ftes-por-categorias

A aplicabilidade depende de atividade, material, processo, localização e autoridade competente, inclusive regras estaduais/municipais. Não houve conclusão sobre licença, cadastro ou regularidade de qualquer empresa. Referências de contexto não comprovam as hipóteses de Porter.

## Notícias dos últimos cinco dias

Mantida a política compartilhada de 120 horas. A coleta externa continua desabilitada, inclusive localmente. Somente o snapshot já existente foi reclassificado e revalidado offline, sem renovar coleta ou último sucesso das fontes.

Na inclusão, há um comunicado institucional do IPEN/CNEN: “Encontro discute tecnologia de radiação na reciclagem”, publicado em 03/11/2026, originalmente coletado em 05/11/2026 às 10:04:48.507 UTC. Fonte direta: https://www.gov.br/ipen/pt-br/assuntos/mais-noticias/encontro-discute-tecnologia-de-radiacao-na-reciclagem

A evidência já existente delimita o comunicado à reciclagem de plásticos e a um encontro previsto para 9–13/11. A data do evento não é data de publicação. Não é preço, volume produzido ou resultado econômico e não cobre papel, metais ou vidro. O título original, a atribuição e a licença CC BY-ND 3.0 permanecem junto ao item.

MMA/SINIR foi registrado como fonte candidata não habilitada para notícias, sem supor direitos, adaptação ou coleta aprovada. O estado é parcial e permanecerá explícito; depois da expiração, a lista poderá ficar vazia. Não há promessa de cobertura exaustiva, imprensa independente ou número mínimo artificial de notícias.

O snapshot original permanece nos candidatos anteriores. Nesta cópia, `sector-news.json` é um arquivo derivado: inclui o novo tema e remove itens fora da janela atual. `generatedAt` marca apenas revalidação local, não nova coleta. Datas, restrições e último sucesso histórico são preservados.

## Verificação

Testes de estrutura e renderização cobrem 43 fichas, cinco perguntas por ficha, materiais, insumos, navegação, busca, critérios de notícia, expiração em 120 horas e não ativação do coletor legado. Testes estruturais não substituem a revisão semântica independente.

Resultados finais de testes, lint, build e auditoria são registrados no relatório da entrega. Não executar `commodities.test.mjs` (fixture Python anteriormente negada), Git status, preview/socket ou QA visual por meio desses caminhos. Não acessar Secovi nem repetir operações negadas.
