// Pesquisa pública do Agente Setorial; revisão de conteúdo em 2026-11-06.
const soow = { label: 'Soow Sigma · portfólio', url: 'https://www.soow.com.br/' }
const soowManaged = { label: 'Soow · monitoramento de TI e ambientes industriais', url: 'https://www.soow.com.br/servico/monitoramento-continuo-mssp-it-ot/' }
const soowIndustrial = { label: 'Soow · segurança industrial', url: 'https://www.soow.com.br/solucao/industrial-security/' }
const cetic = { label: 'Cetic.br · TIC Empresas 2025, B18', url: 'https://www.cetic.br/es/tics/pesquisa/2025/empresas/B18/expandido/' }
const cetic2021 = { label: 'Cetic.br · TIC Empresas 2021, B18', url: 'https://cetic.br/pt/tics/pesquisa/2021/empresas/B18/' }
const cetic2023 = { label: 'Cetic.br · TIC Empresas 2023, B18', url: 'https://cetic.br/pt/tics/pesquisa/2023/empresas/B18/' }
const cetic2024 = { label: 'Cetic.br · TIC Empresas 2024, B18', url: 'https://cetic.br/pt/tics/pesquisa/2024/empresas/B18/' }
const cyber = { label: 'Brasscom · Relatório de Cibersegurança, outubro/2026, p. 7', url: 'https://brasscom.org.br/wp-content/uploads/2026/10/BRI2-2026-018-Relatorio-de-Ciberseguranca-v30.pdf' }
const tempest = { label: 'Vision/Tempest · comunicado de fusão', url: 'https://www.tempest.com.br/vision-e-tempest' }
const logicalis = { label: 'Logicalis · serviços gerenciados', url: 'https://www.la.logicalis.com/pt-br/solucoes-e-servicos/por-servico/servicos-gerenciados' }
const anpd = { label: 'ANPD · regulamentações vigentes', url: 'https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/' }
const ibge = { label: 'IBGE · Pesquisa Mensal de Serviços', url: 'https://www.ibge.gov.br/estatisticas/todos-os-produtos-estatisticas/9229-pesquisa-mensal-de-servicos.html' }
const porto = { label: 'Porto Digital · balanço de 2025', url: 'https://portodigital.org/noticia/porto-digital-cresce-19-e-ultrapassa-24-mil-colaboradores/' }
const israel = { label: 'Israel · diretoria nacional de cibersegurança', url: 'https://www.gov.il/en/Departments/israel_national_cyber_directorate' }

export const TIC_STUDY = {
  title: 'Integração de TI e infraestrutura digital',
  reviewedAt: '2026-11-06',
  summary: [
    'Inferência setorial: digitalização, nuvem e proteção de ambientes ampliam a necessidade de integrar e operar tecnologias. A oportunidade depende da capacidade de entregar com margem e receber no prazo.',
    'O ponto central para crédito é separar equipamentos e licenças, projetos de implantação e serviços continuados. Crescimento de receita pode conviver com piora do caixa, inclusive em contratos recorrentes.',
    'Exemplo de atuação: a Soow Sigma reúne conectividade, cibersegurança, monitoramento e segurança industrial. O enquadramento como integradora é analítico; o portfólio não comprova qual atividade predomina em seu faturamento.',
  ],
  charts: [
    { id: 'nuvem', title: 'Adoção de serviços pagos em nuvem', unit: '% das empresas com acesso à Internet', scope: 'Empresas formais brasileiras com 10 ou mais pessoas ocupadas, nos mercados cobertos pela TIC Empresas, e acesso à Internet. Indicador de demanda potencial, não de receita das integradoras.', years: [2021, 2023, 2024, 2025], max: 100, period: '2021, 2023, 2024 e 2025', source: cetic, method: 'Dados observados de pesquisa empresarial, na tabela B18 de cada edição. Não há ponto de 2022 neste conjunto; as barras representam apenas os anos indicados. Diferenças pequenas não indicam significância estatística sem margens de erro. As três séries podem se sobrepor; não somar percentuais.', series: [
      { label: 'Armazenamento ou banco de dados', values: [45, 48, 49, 54] },
      { label: 'Capacidade de processamento', values: [29, 33, 33, 36] },
      { label: 'Software de segurança', values: [44, 46, 46, 45] },
    ] },
    { id: 'cyber', title: 'Gastos em cibersegurança no Brasil', unit: 'R$ bilhões', scope: 'Hardware, software e serviços. Histórico estimado pela fonte; valores nominais, sem descontar inflação. Não mede apenas integradoras.', years: [2023, 2024, 2025], period: '2023–2025', source: cyber, method: 'Estimativas de estudo setorial, não estatística oficial. Foram mantidos apenas os anos históricos estimados. As projeções para 2026 em diante não entram como resultado realizado.', series: [{ label: 'Histórico estimado pela fonte', values: [13.4, 17.8, 22.2] }] },
  ],
  sections: [
    { id: 'negocio', title: 'Funcionamento e cadeia de valor', paragraphs: ['Síntese analítica: fabricantes e desenvolvedores fornecem equipamentos, licenças e plataformas; distribuidores viabilizam o canal. A integradora desenha a solução, combina fornecedores, implanta e pode assumir a operação. O cliente contrata equipamentos, projeto, suporte ou serviço continuado.', 'Enquadramento: setor TIC → subsetor Integração de TI e infraestrutura digital. Cibersegurança, redes, serviços gerenciados e comunicação são especialidades. Não confundir com fabricação, distribuição, operadoras de telecomunicações ou desenvolvimento de software. CNAE cadastral deve ser confirmado, sem inferir pelo site.'], columns: ['Modelo', 'Resultado e caixa', 'O que medir'], rows: [
      ['Equipamentos e licenças', 'Condição de compra, estoque e prazo ao cliente; recebimento pode depender da entrega.', 'Margem por pedido; antecipações; exposição cambial; pagamentos e recebimentos vinculados.'],
      ['Implantação', 'Horas e materiais antes da medição; atraso no aceite ou mudança de escopo pode consumir a margem.', 'Cronograma físico-financeiro; marcos de aceite; retrabalho; serviços ainda não faturados.'],
      ['Serviços gerenciados', 'Receita contratada menos equipe, plataforma e capacidade operacional; implantação e licenças podem ser antecipadas.', 'Margem por contrato; renovações; cancelamentos; reajustes; capacidade e custo do atendimento.'],
      ['Consultoria e incidentes', 'Especialização e disponibilidade técnica; demanda e mobilização variáveis.', 'Utilização da equipe; prazo de recebimento; responsabilidade contratual.'],
    ], sources: [soow, soowManaged, soowIndustrial] },
    { id: 'concorrencia', title: 'Empresas, mercados e polos de referência', paragraphs: ['Exemplos de atuação, sem ranking, participação de mercado ou equivalência de porte: Soow Sigma (integração e segurança industrial), Logicalis (integração e serviços gerenciados) e Vision/Tempest (segurança especializada). Não representam uma média estatística do recorte.', 'Mercados compradores e forma de contratar são uma dimensão separada: indústria, serviços e setor público podem exigir integrações, níveis de serviço e critérios de aceite diferentes. A composição da carteira de cada empresa precisa ser apurada.', 'Recife/Porto Digital é referência brasileira de articulação entre empresas, formação e pesquisa; a referência abrange o distrito de tecnologia, não exclusivamente integradoras. Israel mantém estrutura pública dedicada à defesa cibernética civil; isso é referência institucional, sem ranking comparativo de países.'], sources: [soow, logicalis, tempest, porto, israel] },
    { id: 'indicadores', title: 'Histórico e indicadores', paragraphs: ['O armazenamento e o processamento em nuvem aumentam nas observações recuperadas; software de segurança não apresenta avanço contínuo. As bases têm coberturas diferentes e não devem ser somadas.', 'A série de adoção de nuvem recuperada cobre apenas quatro observações entre 2021 e 2025. Não foi obtida série mais longa comparável nem a taxa mensal específica de TIC na PMS. O crescimento geral dos serviços não foi usado como substituto.'], sources: [cetic2021, cetic2023, cetic2024, cetic, cyber, ibge] },
    { id: 'conjuntura', title: 'Conjuntura, notícias e movimentos empresariais', columns: ['Movimento', 'Evidência pública', 'Implicação analítica'], rows: [
      ['Consolidação · 03/11/2026', 'Comunicado Vision/Tempest informa fechamento da fusão após aprovação do CADE, com SPX controladora e Embraer acionista relevante.', 'Escala técnica e comercial pode elevar a competição; integração exige retenção de profissionais e contratos.'],
      ['Nuvem e terceirização', 'Pesquisa empresarial mostra adoção de armazenamento e processamento pagos em nuvem.', 'Mais ambientes para integrar; nuvem com ferramentas incorporadas também pode substituir serviços separados.'],
      ['Resposta a incidentes', 'ANPD mantém regulamento de comunicação de incidente de segurança.', 'Aumenta a relevância de rastreabilidade e divisão contratual de responsabilidades; obrigação concreta depende do caso.'],
    ], paragraphs: ['Estrutura: especialização, dependência de fabricantes e necessidade de continuidade. Ciclo: orçamento do cliente, postergação de projetos e condições de pagamento. A expansão dos gastos agregados não comprova melhora da margem das empresas médias.', 'Notícias são um recorte pesquisado em 06/11/2026; não um fluxo automático. A fusão acima está dentro dos sete dias anteriores à pesquisa. Não foram incluídas notícias sem confirmação primária.'], sources: [tempest, cetic, anpd] },
    { id: 'caixa', title: 'Economia da empresa e financiamento', paragraphs: ['Encaixes analíticos propostos, sem comprovação de frequência de uso pelo subsetor. Não representam oferta, aprovação, elegibilidade ou condições de um banco. Não foi encontrada base suficiente para publicar margem, prazo de caixa ou taxa de crédito “típicos”.', 'Ponto cego: receita recorrente pode incluir implantação deficitária, licenças pagas antecipadamente, reajuste insuficiente e responsabilidades elevadas. Recebível com aceite pendente ou prestação futura não equivale a obrigação já exigível.'], columns: ['Necessidade', 'Estrutura a avaliar', 'Risco e evidência'], rows: [
      ['Compra e execução antes do recebimento', 'Giro alinhado ao cronograma; recebíveis após confirmação de exigibilidade.', 'Aceite, concentração, documentação e recebimentos vinculados.'],
      ['Importação direta', 'Financiamento à importação e proteção cambial aderente ao fluxo real.', 'Moeda, repasse, desembaraço e prazo de entrega. Não presumir que toda integradora importa diretamente.'],
      ['Equipamentos para operação própria', 'Financiamento de investimento compatível com a vida útil e o contrato.', 'Obsolescência; cancelamento; recuperação do equipamento.'],
      ['Obrigações contratuais', 'Garantia adequada às obrigações comprovadas.', 'Condições de execução e limites de responsabilidade.'],
      ['Expansão de serviços', 'Giro para implantação e equipe, condicionado a margem e renovação.', 'Capacidade ociosa e custo fixo crescendo antes da receita.'],
      ['Recebíveis e alternativas de mercado', 'Avaliar cessão e estruturas compatíveis com escala e documentação.', 'Proibição de cessão; contraprestação futura; custo total e acesso da empresa média.'],
    ] },
    { id: 'insumos', title: 'Insumos, indicadores e pontos cegos', columns: ['Insumo ou indicador', 'Como afeta o negócio', 'Acompanhar'], rows: [
      ['Equipamentos e licenças', 'Compras, prazos, renovação tecnológica e dependência do fabricante.', 'Antecipações, estoque, descontos, reajuste e câmbio líquido.'],
      ['Especialistas e certificações', 'Capacidade de entrega e custo fixo.', 'Utilização da equipe, retenção, horas de retrabalho e custo por contrato.'],
      ['Nuvem e conectividade', 'Custo de operação e capacidade.', 'Consumo versus preço contratado; dependência da plataforma e disponibilidade.'],
      ['Receita por modelo', 'Mistura de revenda, projeto e serviço pode ocultar margem e caixa.', 'Composição e margem por modelo/contrato; não só faturamento consolidado.'],
      ['Renovação e recebimento', 'Previsibilidade depende das cláusulas reais.', 'Contratos a renovar, cancelamento, concentração, prazo e faturamento dependente de aceite.'],
    ], paragraphs: ['Indicadores externos: adoção de nuvem, gastos em cibersegurança e PMS de TIC quando recuperada. Métricas da empresa dependem de dados fornecidos e autorizados; não há números privados da Soow neste estudo.'] },
    { id: 'swot', title: 'SWOT · forças, fraquezas, oportunidades e ameaças', paragraphs: ['Avaliação analítica do recorte; não diagnóstico da Soow Sigma.'], columns: ['Dimensão', 'Leitura'], rows: [
      ['Forças', 'Conhecimento do ambiente do cliente; integração de fornecedores; capacidade técnica e continuidade.'],
      ['Fraquezas', 'Dependência de especialistas e fabricantes; certificação; dificuldade de medir margem de contratos complexos.'],
      ['Oportunidades', 'Modernização de redes; nuvem; segurança industrial; operação terceirizada.'],
      ['Ameaças', 'Venda direta; disputa de preço; obsolescência; falhas, incidentes e responsabilidade contratual.'],
    ] },
    { id: 'porter', title: 'Concorrência · cinco forças de Porter', paragraphs: ['Mecanismos analíticos condicionados ao recorte, sem pontuação de intensidade ou ranking.'], columns: ['Força', 'Mecanismo e validação'], rows: [
      ['Fornecedores', 'Poder cresce com tecnologia proprietária e certificação difícil de substituir. Ver concentração e alternativas homologadas.'],
      ['Clientes', 'Compras por preço e licitações pressionam negociação. Ver concentração, critérios de contratação e custo de substituição.'],
      ['Rivalidade', 'Integradoras, especialistas e prestadores globais disputam entrega e preço. Ver perdas comerciais e diferenciação efetiva.'],
      ['Entrantes', 'Revenda simples tende a ter barreiras menores; operação crítica exige equipe, processos e reputação. Ver exigências contratuais e certificações.'],
      ['Substitutos', 'Equipe interna, ferramentas incorporadas na nuvem e contratação direta atendem parte da mesma necessidade. Ver decisão de fazer internamente ou contratar.'],
    ] },
    { id: 'cenarios', title: 'Cenários e sinais de acompanhamento', paragraphs: ['Hipóteses qualitativas do agente para os próximos 12 a 24 meses, contados da pesquisa. Sem probabilidades ou taxas de crescimento inventadas.'], columns: ['Cenário', 'Premissas e efeito possível', 'Sinais'], rows: [
      ['Base', 'Modernização continua, com exigência de retorno; demanda seletiva e pressão por eficiência.', 'Conversão comercial; renovação e margem por contrato.'],
      ['Favorável', 'Maior terceirização, segurança industrial e nuvem; receita contratada cresce com custo inicial de implantação.', 'Novos contratos com margem preservada e recebimento previsível.'],
      ['Adverso', 'Projetos adiados, pressão de preço, câmbio e equipe mais caros; margem cai e necessidade de giro aumenta.', 'Atrasos de aceite; cancelamentos e prazo de recebimento subindo.'],
    ] },
  ],
  method: 'Brasil como base, informações públicas e análise própria do Agente Setorial. Fato, inferência e cenário estão identificados junto ao conteúdo. Fontes empresariais descrevem suas próprias operações; não provam média ou posição de mercado. Consulta em 06/11/2026; data de publicação indicada quando disponível. Adoção de nuvem: pesquisa empresarial, tabela B18 de cada ano. Cibersegurança: estudo associativo baseado em estimativas de mercado, não estatística oficial. Referências exibidas restritas a órgãos públicos; a proveniência completa é preservada no registro de pesquisa.',
  sources: [
    ...[soow, soowManaged, soowIndustrial].map(item => ({ ...item, purpose: 'Portfólio público; sem data de publicação informada. Não comprova receita, margem ou atividade preponderante.' })),
    ...[cetic2021, cetic2023, cetic2024, cetic].map(item => ({ ...item, purpose: 'B18: contratação de serviços pagos de nuvem, percentuais de empresas com Internet; período no título. Universo da pesquisa, não de integradoras.' })),
    { ...cyber, purpose: 'Publicado em outubro/2026; histórico estimado 2023–2025 em R$ bilhões; cobertura inclui hardware, software e serviços. Página 7.' },
    { ...tempest, purpose: 'Comunicado de 03/11/2026 sobre fechamento da fusão; não usado para estimar receitas setoriais.' },
    { ...logicalis, purpose: 'Portfólio público de serviços gerenciados; exemplo de atuação, sem ranking. Data de publicação não informada.' },
    { ...anpd, purpose: 'Repositório oficial para conferir regulação; sem reproduzir prazos legais ou inferir obrigação individual.' },
    { ...ibge, purpose: 'Fonte oficial de conjuntura mensal. Valor específico do subgrupo TIC não recuperado neste estudo.' },
    { ...porto, purpose: 'Ecossistema brasileiro como referência institucional; abrange mais atividades que integração de TI.' },
    { ...israel, purpose: 'Estrutura pública de cibersegurança civil; referência institucional, sem ranking de países.' },
  ],
  limitations: [
    'Não foi dimensionado o mercado exclusivo de integradoras médias; não usar gastos agregados como seu faturamento.',
    'Não foram recuperadas margens de erro da pesquisa empresarial, série longa comparável ou indicador mensal específico de TIC. Não afirmar significância de pequenas mudanças.',
    'Não são conhecidas composição de receita, margens, importações ou financiamento da Soow. “Soul Sigma” foi associada à Soow Sigma pelo contexto; identidade cadastral não foi confirmada.',
    'Não há ranking demonstrado de empresas, margem média, prazo médio de caixa ou frequência de uso de produtos bancários.',
    'Projeções numéricas de gastos em 2026 em diante foram excluídas dos gráficos históricos. Cenários são hipóteses analíticas.',
  ],
}
