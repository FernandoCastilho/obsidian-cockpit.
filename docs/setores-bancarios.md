# Setores: proposta para atendimento bancário PJ

Proposta editorial, não taxonomia oficial, cadastro de empresas ou cobertura completa da economia. A B3 inspira a referência de grandes ramos, mas o painel deve atender também empresas privadas, menores e atividades transversais. Não há equivalência automática com CNAE, setores B3 ou índices de bolsa.

## Navegação

Setores/Insumos → organização → grupo → tema. Somente os temas do grupo escolhido aparecem no quadro. O caminho selecionado fica visível; escolhas por seção e grupo são preservadas na sessão, incluindo recarga e navegação de retorno. Armazenam-se apenas identificadores de navegação; não há dados financeiros de clientes.

Os links antigos `#setores/industria`, `veiculos-pesados`, `comercio`, `servicos`, `telecom` e os cinco insumos continuam válidos. As mesmas notícias, fontes, datas, retenção e indicadores existentes foram preservados. O painel não publica automaticamente notícias de um grupo em outro por semelhança de nome.

## Proposta de agrupamentos

| Grupo editorial | Temas propostos |
| --- | --- |
| Agro e alimentos | Agricultura e insumos agrícolas; pecuária e proteína animal; alimentos e bebidas |
| Indústria e transformação | Indústria; veículos pesados; metalmecânica e máquinas; químicos e plásticos; têxtil, vestuário e móveis |
| Comércio e distribuição | Comércio e consumo; atacado e distribuição; varejo essencial; bens duráveis e comércio eletrônico |
| Transportes e logística | Cargas; passageiros; armazenagem e operadores logísticos |
| Construção e imobiliário | Construção civil; infraestrutura; incorporação e serviços imobiliários |
| Tecnologia e comunicação | Internet e telecom; software e TI; comunicação e mídia |
| Saúde e cuidados | Hospitais, clínicas e cuidados; diagnósticos; produtos e equipamentos |
| Educação e serviços empresariais | Serviços; educação privada; serviços profissionais; terceirização e facilities |
| Turismo, lazer e alimentação | Turismo e hospedagem; restaurantes e alimentação; lazer e entretenimento |
| Energia e saneamento | Energia elétrica e renováveis; água, saneamento e resíduos |
| Financeiro e seguros | Serviços financeiros e cooperativas de crédito; seguros e intermediação |
| Extrativismo e materiais básicos | Mineração e materiais básicos; petróleo, gás e biocombustíveis |

São 12 grupos e 37 temas. As atividades não são necessariamente exclusivas: uma empresa diversificada pode exigir leitura em mais de um tema. Veículos pesados permanece transversal, sem ser tratado como um segmento oficial B3.

## Cobertura e lacunas

Cinco temas existentes têm coleta de notícias: Indústria, Veículos pesados, Comércio e consumo, Serviços, Internet e telecom. Veículos pesados também mantém os seis indicadores mensais da ANFAVEA, sem ampliar sua definição ou transformar dados mensais em semanais. Os cinco insumos mantêm as fontes e limitações já existentes; o aço continua sem série de preço própria.

Os 32 temas novos ainda não têm notícias ou indicadores específicos integrados. A interface declara isso, não mostra valores, contagens de empresas, variações, rankings nem datas fictícias de atualização. O roteiro de visita desses temas contém perguntas gerais de atendimento PJ, não análise individual de crédito ou recomendação de produto.

Antes de ampliar indicadores: definir o conceito de cada métrica, universo, fonte, permissão de uso, periodicidade e histórico; validar se o dado representa a atividade brasileira ou apenas empresas listadas. Esta entrega não transforma o catálogo em cobertura completa de informações setoriais.

## Referência B3

Fontes oficiais: [Critério de classificação](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/acoes/consultas/criterio-de-classificacao/) e [Consulta de classificação setorial](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/acoes/consultas/classificacao-setorial/). Os nomes dos 11 setores econômicos foram confirmados na pesquisa de 05/11/2026. É data de conferência, não de vigência oficial.

A organização oficial é Setor → Subsetor → Segmento e se refere a empresas listadas. Não se confunde com segmentos de governança. A árvore vigente completa de subsetores e segmentos não foi certificada e não foi copiada de versões antigas. A referência separada mostra os nomes dos setores, a procedência e a lacuna dos demais níveis; não atribui notícias editoriais ou indicadores a uma categoria oficial sem validação.

A página de consulta informa atualização semanal e proíbe coleta automatizada, inclusive por IA. Não foi criado scraper, chamada aos endpoints internos nem atualização automatizada. A referência é estática e declarada como tal. Para incorporar a base integral será necessária fonte validada e permissão compatível.

## Isolamento e revisão

Branch `codex/setores-b3-cascata`, worktree separado do FINIMP e das correções de auditoria. Não publicar ou fazer merge sem decisão explícita. Validar estrutura, cobertura, navegação, acessibilidade e fontes antes de aprovar a proposta como próxima versão do painel.
