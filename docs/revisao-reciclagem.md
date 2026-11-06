# Revisão editorial da ficha Reciclagem

Revisão: 05/11/2026. Entrega limitada ao artefato editorial. Não houve pesquisa web própria, leitura integral das referências, alteração do repositório ou validação empírica do setor. Foram incorporados três links oficiais identificados em busca indexada pelo responsável pela tarefa.

## Conteúdo entregue

- Objeto `reciclagem-ficha.json` compatível com os campos atuais de perfil: `id`, `scope`, `scopeNote`, `reviewedAt`, `analysisKind`, `forces`, `questions`, `sensitivePoints`, `sources` e `limitations`.
- Dois campos complementares para a integração informada pelo responsável: `materialCuts` com `id`, `label`, `scope`, `validation`; e `criticalInputs` com `id`, `label`, `applicability`, `metric`, `limit`. O componente-base consultado não os renderizava; a publicação na nova interface é uma etapa separada.
- Exatamente cinco forças, cinco perguntas e cinco pontos sensíveis com vínculo sequencial `questionIndex: 0..4`.
- Cinco recortes materiais: papel/papelão, plásticos por resina, metais ferrosos, metais não ferrosos por metal/liga e vidro por tipo/cor. Ferrosos e não ferrosos são apresentados separadamente por diferença de composição, processo e mercado.
- Nove insumos/serviços críticos, cada qual com aplicabilidade, unidade/métrica, evidência de conferência e limite de interpretação. Nenhum valor ou preço foi inventado.

## Decisões de delimitação

O perfil é um roteiro para selecionar um mercado, não a afirmação de que toda reciclagem constitui um mercado único. A análise exige material, especificação de saída, elo e praça. Triagem/pré-processamento e transformação industrial devem ser separados. Em planta integrada, a transferência de uma etapa a outra não constitui venda externa adicional.

A posição de moagem, lavagem e preparação física na cadeia deve ser explicitada pela operação e sua saída, evitando impor uma fronteira industrial apenas pelo nome de uma etapa. A ficha descreve rotas mecânicas/físicas e processos térmicos de fusão compatíveis com os materiais. Reciclagem química não está implicitamente representada.

Resíduos perigosos, eletroeletrônicos, compostagem, recuperação energética e disposição final foram excluídos. Conferir o encaminhamento de rejeitos do processo não transforma esta ficha em análise do negócio de disposição final.

## Revisão das cinco forças

1. **Rivalidade:** ofertas já aptas da mesma especificação, aplicação e entrega. Material virgem pode integrar esse conjunto se disputar efetivamente o mesmo pedido no mercado delimitado.
2. **Compradores:** concentração e restrições de alternativa só indicam mecanismo de poder quando combinadas com frete, homologação, capacidade e condições efetivamente negociadas. O comprador varia por elo.
3. **Fornecedores:** dependência de origens de material apto ou de recurso técnico específico pode dar poder de negociação. Alta de preços, energia ou frete isoladamente não comprova a força. Fluxo próprio não é fornecedor externo.
4. **Entrantes:** investimento, giro, acesso a material, saída comercial e qualificação devem corresponder ao elo escolhido. Exigências ambientais só entram na análise quando confirmadamente aplicáveis; não foram presumidas.
5. **Substitutos:** solução funcional fora do mercado delimitado. Material virgem só entra aqui se a delimitação e a substituição tecnicamente aceita sustentarem a classificação. Não deve aparecer simultaneamente como rival e substituto na mesma análise. Reuso, refil ou mudança de material podem afetar a demanda derivada, mas o mecanismo exige evidência.

## Correspondência entre perguntas e pontos sensíveis

1. Material/elo e receita externa → comparabilidade e ausência de dupla contagem.
2. Balanço de massa dos lotes → rendimento, umidade, estoque, rejeitos e perdas.
3. Compradores alternativos e aceitação de material virgem → saída comercial e classificação correta das alternativas.
4. Contribuição por tonelada e ciclo de caixa → custos da rota, rendimento, prazos e necessidade de capital de giro.
5. Conferência de requisitos aplicáveis → documentação e distinção entre atendimento demonstrado, informação não verificada e eventual pendência.

As cinco entradas são perguntas únicas, ainda que peçam evidências relacionadas. A quinta não presume infração nem cumprimento legal. O ponto correspondente ressalta que documento não apresentado na visita não comprova irregularidade e que apresentação documental não garante conformidade integral.

## Insumos e serviços críticos

O JSON cobre material de entrada; energia elétrica; coleta/transporte/movimentação; água e efluentes nas rotas úmidas; combustíveis e calor quando usados; manutenção/peças; triagem e ensaios; auxiliares de processo; pesagem e rastreabilidade.

As unidades distinguem recebimento, processamento, saída aproveitável e saída vendável. Bases seca/úmida e períodos precisam ser declarados. Os campos em R$/t representam medição interna a preencher, não cotação ou benchmark. Combustível incluído em frete, água recirculada e transferências internas recebem alertas contra dupla contagem.

## Referências e limites de uso

Os links específicos de MTR e informações do SINIR e das fichas de enquadramento do CTF/APP do Ibama foram identificados em busca indexada nesta tarefa pelo responsável e repassados à redação. São referências oficiais para conferência, sem alegação de leitura integral ou de obrigação universal. O portal do MMA permanece uma referência candidata. Não foram incorporadas estatísticas, conclusões jurídicas ou supostos preços dessas instituições. A aplicabilidade local e a autoridade competente ainda precisam ser verificadas.

O JSON preserva os avisos de hipótese editorial e não oferece classificação de risco, recomendação de crédito, avaliação jurídica, parâmetro universal de contaminação ou comprovação de conformidade.

## Integração a conferir pelo responsável pelo painel

- Incorporar o perfil ao catálogo e ao filtro de setores conforme a implementação existente.
- Renderizar os recortes materiais e os insumos/serviços críticos se o requisito for exibi-los, pois o componente consultado só apresenta os campos antigos.
- Preservar as ressalvas sobre fontes não consultadas, métricas sem valores e material virgem dependente do recorte.
- Não reutilizar o aviso comum de equivalência de produtos para reclassificar automaticamente todo material virgem como rival: a ficha exige fronteira e evidência técnica/comercial específicas.
- A entrega editorial não atesta cadastro do setor na interface, execução de testes de aplicação, funcionamento de fontes ou publicação.
