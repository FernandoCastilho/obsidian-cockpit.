// Revisão editorial de 05/11/2026: hipóteses para visita, sem validação empírica.
export const RECYCLING_PROFILE = {
  "id": "reciclagem",
  "scope": "Operação brasileira de reciclagem de materiais não perigosos: escolher um material, uma especificação de saída, um raio econômico de atendimento e um elo por análise. Separar triagem e pré-processamento, que vendem material segregado ou preparado, da transformação industrial em matéria-prima secundária ou produto definido que incorpora material recuperado.",
  "scopeNote": "Papel/papelão, plásticos por resina, metais ferrosos, metais não ferrosos por metal/liga e vidro por tipo/cor não formam um único mercado. Comparar propostas da mesma especificação e entrega. Se houver integração entre elos, separar capacidades, custos e receitas sem contar a transferência interna como venda externa. Esta ficha não cobre resíduos perigosos, resíduos eletroeletrônicos, compostagem, recuperação energética nem negócios de disposição final. O encaminhamento de frações não aproveitáveis é uma obrigação operacional a conferir, não outro setor incluído na análise.",
  "reviewedAt": "2026-11-05",
  "analysisKind": "hipoteses-editoriais",
  "materialCuts": [
    {
      "id": "papel-papelao",
      "label": "Papel e papelão",
      "scope": "Separar classes de aparas, origem, umidade, materiais impróprios e requisitos do comprador. Apara recebida, fardo comercial e fibra recuperada não são unidades econômicas automaticamente equivalentes. Triagem/pré-processamento: Recebimento, segregação por classe, retirada de impróprios e enfardamento, quando realizados pela operação. Transformação industrial: Desagregação, depuração e recuperação de fibra, com destintamento apenas quando previsto na rota; delimitar se a saída é polpa ou um produto de papel/papelão especificado.",
      "validation": "Conferir classe comercial, base de umidade acordada, massa recebida e expedida, rejeitos, estoque e rendimento de fibra da rota efetiva. Não somar toneladas de fardos e de polpa como se fossem vendas independentes do mesmo material."
    },
    {
      "id": "plasticos",
      "label": "Plásticos por resina",
      "scope": "Separar PET, PEAD, PEBD/PELBD, PP e outras resinas efetivamente processadas, além de cor, origem, aditivos e aplicação. Não pressupor intercambialidade entre resinas, graus ou usos. Triagem/pré-processamento: Triagem, segregação, prensagem e preparação física; indicar se moagem e lavagem são feitas internamente ou contratadas. Transformação industrial: Reciclagem mecânica com lavagem, secagem, extrusão, filtração e granulação conforme a rota; registrar floco, granulado ou produto específico como saída. A fronteira do elo depende da etapa e da saída efetivas, não apenas do nome comercial da empresa.",
      "validation": "Conferir identidade da resina, mistura com outros polímeros, umidade, contaminação, cor, rendimento e ensaios exigidos pelo comprador, como índice de fluidez ou viscosidade quando pertinentes. Aplicações com requisitos próprios, inclusive contato com alimentos, exigem verificação específica. Reciclagem química exige análise própria e não é representada por esta rota."
    },
    {
      "id": "metais-ferrosos",
      "label": "Metais ferrosos",
      "scope": "Separar classe, composição, forma, densidade e impurezas da sucata; sucata preparada e aço ou ferro fundido produzido não são a mesma oferta. Triagem/pré-processamento: Segregação, corte, prensagem ou fragmentação, conforme os ativos e serviços efetivamente disponíveis. Transformação industrial: Fusão e ajustes metalúrgicos na rota que aceite a sucata especificada; definir liga, forma e produto vendido.",
      "validation": "Conferir análise química quando aplicável, massa aproveitável, rendimento metálico e aceitação na rota do comprador. Comparar sucatas pelo desempenho e custo útil, não apenas pelo peso bruto."
    },
    {
      "id": "metais-nao-ferrosos",
      "label": "Metais não ferrosos",
      "scope": "Separar alumínio, cobre e cada outro metal/liga tratado, com teor, revestimentos e contaminações identificados. Não agregar metais distintos sob uma cotação única de sucata. Triagem/pré-processamento: Segregação por metal e liga, limpeza e preparação física permitidas na operação delimitada. Transformação industrial: Refusão e eventual refino secundário compatíveis com o metal e a instalação; delimitar lingote, liga ou outro produto de saída especificado.",
      "validation": "Conferir composição, recuperabilidade, perdas de processo e requisitos da liga final. Uma cotação de metal primário não representa automaticamente o valor da sucata entregue nem o rendimento de recuperação."
    },
    {
      "id": "vidro",
      "label": "Vidro",
      "scope": "Separar tipo e composição do vidro, cor, granulometria e presença de cerâmicas, pedras, metais e outros impróprios. Vidro de embalagem, plano e especial não são automaticamente compatíveis. Triagem/pré-processamento: Triagem, separação por tipo/cor, remoção de impróprios e preparação de caco na granulometria contratada. Transformação industrial: Fusão em instalação e composição compatíveis, delimitando o produto resultante e a proporção de caco tecnicamente admitida.",
      "validation": "Conferir aceitação por tipo/cor, contaminação, perdas e frete até o comprador apto. A massa coletada não comprova massa de caco vendável ou incorporada ao produto."
    }
  ],
  "forces": [
    {
      "id": "rivalry",
      "mechanism": "Hipótese a validar: operadores já aptos a entregar o mesmo material, grau, forma e serviço dentro do raio econômico podem disputar lotes por preço entregue, regularidade e qualidade. Na triagem, comparar fornecedores de fardos, sucata ou caco equivalentes; na transformação, comparar a saída industrial definida. Material virgem funcionalmente equivalente pode integrar a rivalidade se estiver dentro do mercado delimitado e disputar efetivamente os mesmos pedidos, sem restrição de origem ou conteúdo reciclado que impeça essa comparação.",
      "validateWith": "Definir material, elo, especificação, aplicação e entrega; confrontar propostas aceitas ou perdidas, fornecedores já homologados, capacidade disponível e motivos de escolha. Verificar se ofertas virgens e recicladas concorrem de fato pelo mesmo pedido. Não classificar automaticamente por origem, processo ou condição de importado."
    },
    {
      "id": "buyers",
      "mechanism": "Hipótese a validar: poucos compradores capazes de absorver a especificação e o volume, somados a frete elevado para outras plantas ou à demora de homologação, podem negociar descontos de qualidade, condições de aceite e prazos. Comprador de material triado não é necessariamente comprador da saída da transformação industrial; contratação de serviço de triagem também exige recorte próprio.",
      "validateWith": "Medir participação de cada comprador por material/elo, alternativas tecnicamente aptas, capacidade de absorção, custo entregue, critérios de análise, devoluções e prazos reais de homologação e pagamento. Separar concentração de receita de evidência de condições efetivamente impostas."
    },
    {
      "id": "suppliers",
      "mechanism": "Hipótese a validar: poucas origens acessíveis de material segregado com a composição necessária, exclusividade de fornecimento ou fornecedor técnico sem alternativa aprovada podem limitar a troca e dar poder sobre preço, lote, qualidade e prazo. O fornecedor a montante pode ser gerador, cooperativa, coletor ou outro preparador, conforme o elo. Material gerado internamente é fluxo próprio, não fornecedor externo.",
      "validateWith": "Identificar origens efetivas, volume e qualidade utilizáveis, contratos, exclusividades, custos de qualificar outra origem e tempo de substituição. Para serviços e peças, conferir dependência técnica e condições negociáveis. Alta de sucata, energia ou frete, isoladamente, não comprova poder de fornecedor."
    },
    {
      "id": "entrants",
      "mechanism": "Hipótese a validar: acesso recorrente à matéria-prima, área adequada, capital de giro, equipamentos e homologação podem dificultar a entrada na oferta delimitada. Triagem e enfardamento têm exigências diferentes de lavagem/extrusão, recuperação de fibra ou fusão. Requisitos ambientais e operacionais podem ser barreiras somente na medida em que se apliquem ao local, material e processo escolhidos.",
      "validateWith": "Comparar investimento e escala compatíveis com a especificação, acesso a entrada e saída, tempo de implantação, ensaios e exigências aplicáveis confirmadas com a autoridade competente. Separar operador já apto, que é rival, de projeto ou ofertante ainda não apto, que é candidato à entrada. Não presumir licenciamento exigível, obtido ou pendente sem conferência."
    },
    {
      "id": "substitutes",
      "mechanism": "Hipótese a validar: outra solução fora do mercado delimitado, como mudança de material ou projeto, reuso/refil ou extensão da vida útil na aplicação final, pode reduzir a necessidade da saída reciclada ou sua demanda derivada. Matéria-prima virgem só deve ser tratada como substituto quando estiver fora do recorte definido e puder cumprir a função por uma alternativa tecnicamente aceita; se disputar a mesma oferta dentro desse recorte, pertence à rivalidade. Material impróprio ao processo não é substituto só por ter menor preço.",
      "validateWith": "Registrar primeiro a fronteira do mercado e a necessidade atendida; depois verificar testes, limites de mistura, requisitos de conteúdo reciclado, mudanças de engenharia, custo total e decisões reais do comprador. Não contar a mesma alternativa simultaneamente como rival e substituto, nem atribuir toda variação de demanda a substituição."
    }
  ],
  "questions": [
    "Qual combinação de material, especificação de saída e elo explica a receita externa e a margem da operação, separando papel/papelão, cada resina plástica, metais ferrosos, cada metal/liga não ferrosa e tipo/cor de vidro?",
    "Para os lotes do material e elo escolhidos, que balanço de massa comprova o rendimento vendável após ajustar umidade, estoques, contaminantes, rejeitos e demais perdas pertinentes à rota?",
    "Quais compradores alternativos já aceitam a especificação vendida, com capacidade, frete e condições de homologação comprovados, e em quais pedidos o material virgem é efetivamente uma alternativa aceita?",
    "Qual margem de contribuição por tonelada vendável e qual ciclo de caixa são demonstrados pelos custos, rendimentos, condições de compra e venda e datas de pagamento e recebimento do material e elo escolhidos?",
    "Qual conferência documentada identifica os requisitos ambientais, de origem, movimentação, rastreabilidade e destino efetivamente aplicáveis a cada material e processo, distinguindo atendimento comprovado, situação ainda não verificada e eventual pendência?"
  ],
  "sensitivePoints": [
    {
      "id": "reciclagem-p1",
      "title": "Material e elo comparáveis",
      "signal": "Misturar receitas de materiais, especificações ou etapas pode ocultar diferenças de mercado e dupla contagem interna. Conferir saídas comerciais e separar triagem/pré-processamento de transformação industrial antes de comparar margem ou concorrência.",
      "questionIndex": 0
    },
    {
      "id": "reciclagem-p2",
      "title": "Massa recebida e rendimento vendável",
      "signal": "Umidade, contaminação ou perda de processo podem reduzir o material aproveitável sem reduzir proporcionalmente compra e frete. Reconciliar pesagens, bases seca/úmida, estoques, vendas e perdas por lote; o balanço não comprova sozinho a qualidade da saída.",
      "questionIndex": 1
    },
    {
      "id": "reciclagem-p3",
      "title": "Destino comercial e alternativas reais",
      "signal": "Lista de compradores potenciais pode superestimar a capacidade de venda se faltarem homologação, capacidade de absorção ou frete viável. Conferir alternativas por especificação e registrar por que material virgem pertence à rivalidade ou à substituição naquele recorte, sem presumir equivalência.",
      "questionIndex": 2
    },
    {
      "id": "reciclagem-p4",
      "title": "Contribuição e caixa por tonelada útil",
      "signal": "Preço de venda por tonelada bruta pode esconder perdas, consumo de utilidades, frete e desembolsos anteriores ao recebimento. Conciliar contribuição por tonelada vendável, dias de estoque e prazos reais; margem de contribuição não equivale a lucro líquido e não deve omitir custos relevantes da rota.",
      "questionIndex": 3
    },
    {
      "id": "reciclagem-p5",
      "title": "Aplicabilidade e evidência documental",
      "signal": "A exigência depende do material, processo, local e papel exercido na cadeia. Conferir requisitos e documentos válidos, inclusive movimentação e destino quando exigíveis; ausência de documento na visita não prova irregularidade, e sua mera apresentação não comprova toda a conformidade operacional.",
      "questionIndex": 4
    }
  ],
  "criticalInputs": [
    {
      "id": "reciclagem-carga",
      "label": "Material reciclável de entrada",
      "applicability": "Todos os materiais, sempre separados por classe de apara, resina, metal/liga ou tipo/cor de vidro e pelo elo que os recebe.",
      "metric": "t recebida e t aproveitável por lote; umidade e contaminantes em % com base declarada; custo interno em R$/t recebida e R$/t aproveitável, quando houver compra.",
      "limit": "Não há cotação única de recicláveis. Volume recebido não equivale a volume vendável; custo de aquisição de fluxo próprio ou cedido não deve ser inventado nem confundido com ausência de custo de coleta e preparação. Conferir: Pesagens, especificação contratual, amostragens, notas de compra e balanço de massa reconciliado com estoques."
    },
    {
      "id": "reciclagem-energia",
      "label": "Energia elétrica",
      "applicability": "Prensas, esteiras, trituradores, separadores, bombas e demais equipamentos efetivos; na transformação, extrusão, preparação de fibra ou fusão elétrica apenas quando presentes na rota.",
      "metric": "kWh/t processada e kWh/t vendável; demanda em kW quando aplicável; custo realizado em R$/t na mesma janela de produção.",
      "limit": "Tarifa, demanda e consumo são componentes distintos. Consumo ou conta elevados não demonstram poder de fornecedor, e intensidade de uma rota não deve ser extrapolada para outra. Conferir: Contas, medições por linha quando disponíveis, horas de operação e produção reconciliada; explicitar rateio de instalações compartilhadas."
    },
    {
      "id": "reciclagem-transporte",
      "label": "Coleta, transporte e movimentação",
      "applicability": "Entradas e saídas de todos os materiais conforme responsabilidade contratual; relevante para cargas de baixa densidade, rotas longas e entrega a comprador com especificação restrita.",
      "metric": "R$/t entregue, km por viagem, t e m³ por carga; ocupação da carga em % com capacidade de referência declarada; horas de espera.",
      "limit": "R$/t de cargas com densidade, percurso ou serviços diferentes não é comparação direta. Frota própria é recurso interno, não fornecedor externo; não contar frete incluído na compra duas vezes. Conferir: Documentos de transporte, rotas, pesagens, cubagem, contratos e registros de espera; separar coleta, transferência e entrega."
    },
    {
      "id": "reciclagem-agua-efluentes",
      "label": "Água de processo e tratamento de efluentes",
      "applicability": "Lavagem e recuperação de plásticos ou fibras e outras rotas úmidas efetivamente utilizadas; não atribuir o mesmo consumo à triagem seca ou a toda operação com vidro e metais.",
      "metric": "m³ de água captada ou comprada/t processada, m³ de efluente tratado/t e parcela de recirculação em % com denominador explícito; custo realizado em R$/t.",
      "limit": "Separar água nova de recirculada para evitar dupla contagem. Consumo e volume tratado não comprovam qualidade, autorização ou atendimento a limites de lançamento. Conferir: Medições, balanço hídrico, contratos e registros do tratamento; conferir requisitos e parâmetros aplicáveis à fonte de água, processo e destino."
    },
    {
      "id": "reciclagem-combustiveis",
      "label": "Combustíveis e energia térmica",
      "applicability": "Diesel em frota ou equipamento próprio, secagem e geração de calor quando existentes; gás ou outro combustível de fusão somente na rota industrial que efetivamente o utiliza.",
      "metric": "L de diesel/t movimentada, Nm³ de gás/t ou GJ/t processada conforme o combustível, com condições de medição declaradas; custo realizado em R$/t.",
      "limit": "Não somar litros, volumes de gás e energia sem conversão consistente. Evitar dupla contagem de combustível já embutido em frete terceirizado; não presumir uso de forno ou de secador. Conferir: Consumo medido, estoques, comprovantes, horas de equipamento e produção por processo; explicitar poder calorífico e conversão de unidades quando usados."
    },
    {
      "id": "reciclagem-manutencao",
      "label": "Manutenção, peças e consumíveis de equipamento",
      "applicability": "Lâminas, telas, filtros, rolamentos, esteiras e peças de prensas ou separadores; refratários apenas onde houver equipamento térmico compatível.",
      "metric": "Horas de parada por equipamento, prazo de reposição em dias, vida útil em horas ou t processadas e custo realizado em R$/t.",
      "limit": "Gasto elevado não prova dependência de fornecedor. Separar manutenção de reposição de ativo e verificar se a peça é realmente exclusiva ou pode ser substituída sem perda de desempenho. Conferir: Ordens de manutenção, consumo de peças, cadastro de alternativas aprovadas e histórico de reposição."
    },
    {
      "id": "reciclagem-triagem-qualidade",
      "label": "Triagem especializada, amostragem e ensaios",
      "applicability": "Seleção manual ou automatizada em todos os materiais; ensaios específicos de resina, fibra, composição metálica ou contaminação do vidro conforme exigência do processo e do comprador.",
      "metric": "Horas de triagem/t, lotes amostrados/total de lotes, rejeições por especificação em % e prazo de liberação em dias; custo realizado por ensaio ou por t.",
      "limit": "Quantidade de ensaios não assegura representatividade. A especificação e o método definem a interpretação; não usar um limite universal de contaminação para materiais ou aplicações diferentes. Conferir: Plano de amostragem, registros de triagem, método de ensaio, laudos e critérios contratuais de aceite; distinguir serviço contratado de equipe e laboratório próprios."
    },
    {
      "id": "reciclagem-insumos-processo",
      "label": "Insumos auxiliares da rota",
      "applicability": "Arame ou cintas de fardos na preparação; detergentes e outros auxiliares na lavagem; reagentes de destintamento na recuperação de fibra; aditivos e correções de liga somente nos processos em que sejam tecnicamente necessários.",
      "metric": "kg ou L de cada insumo/t processada, lote mínimo e cobertura em dias; custo realizado em R$/t, sem agregar substâncias diferentes numa quantidade única.",
      "limit": "Não recomendar formulação, substância ou dosagem universal. Registrar somente os insumos da rota efetiva; necessidade de insumo auxiliar não amplia o recorte para tratamento de resíduos perigosos. Conferir: Receita ou ficha de processo, consumo por lote, compras e alternativas tecnicamente aprovadas; conferir requisitos de uso e manuseio aplicáveis."
    },
    {
      "id": "reciclagem-pesagem",
      "label": "Pesagem, aferição e rastreabilidade de lotes",
      "applicability": "Recebimento, transferência entre etapas e expedição de todos os materiais; serviço externo de verificação de instrumentos quando contratado e aplicável.",
      "metric": "Diferença de pesagem em kg ou % com base definida, lotes identificados/total de lotes e prazo de recuperação do histórico de um lote; custo realizado do serviço.",
      "limit": "Rastreabilidade quantitativa não comprova composição, origem lícita ou conformidade integral. Requisitos metrológicos e documentais devem ser conferidos para o uso específico, sem presumir a obrigação de um certificado universal. Conferir: Registros de entrada/saída, identificação de lotes, verificações dos instrumentos e conciliação com documentos comerciais e de movimentação quando exigíveis."
    }
  ],
  "sources": [
    {
      "label": "SINIR • Manifesto de Transporte de Resíduos (MTR)",
      "url": "https://sinir.gov.br/sistemas/mtr/",
      "purpose": "Referência oficial identificada em busca indexada desta tarefa para pesquisar movimentação de resíduos. Não houve leitura integral; conferir atividade, material, sistemas estaduais e aplicabilidade antes de afirmar obrigação de MTR."
    },
    {
      "label": "SINIR • Informações sobre o sistema",
      "url": "https://sinir.gov.br/informacoes/sobre/",
      "purpose": "Referência oficial identificada em busca indexada desta tarefa para localizar contexto de MTR, CDF e DMR. Não houve leitura integral nem verificação de exigibilidade à empresa; dados e instrumentos não comprovam a hipótese competitiva ou a conformidade do cliente."
    },
    {
      "label": "Ibama • Fichas técnicas de enquadramento do CTF/APP por categorias",
      "url": "https://www.gov.br/ibama/pt-br/servicos/cadastros/ctf/ctf-app/ftes/ftes-por-categorias",
      "purpose": "Referência oficial identificada em busca indexada desta tarefa para investigar enquadramento pela atividade efetiva. Não houve leitura integral, enquadramento da empresa ou conclusão de obrigação universal; conferir também a autoridade estadual ou municipal competente."
    },
    {
      "label": "Ministério do Meio Ambiente e Mudança do Clima",
      "url": "https://www.gov.br/mma/pt-br",
      "purpose": "Fonte oficial candidata para localizar políticas e normas de resíduos e logística reversa. Exigências variam por material, papel na cadeia e regra vigente; não houve leitura direta nem validação normativa nesta redação."
    }
  ],
  "limitations": [
    "Hipóteses editoriais para preparação de visita, sem classificação de intensidade das forças, diagnóstico da empresa, pontuação de risco ou recomendação de crédito.",
    "A data informada é da revisão editorial. A redação não fez pesquisa web própria ou leitura integral das referências. Os links específicos de SINIR e Ibama foram identificados em busca indexada na tarefa; não houve validação empírica das hipóteses, apuração de cotações ou verificação da legislação aplicável à operação.",
    "Não há dados da operação, contratos, concentração de mercado ou medições disponíveis nesta ficha. As perguntas solicitam evidências; não afirmam que problemas, pendências ou regularidade já foram constatados.",
    "Escolher material, especificação, elo e praça antes de aplicar Porter. Em operações integradas, separar transações internas das vendas externas e identificar o fornecedor a montante de cada elo.",
    "Material virgem não é rival ou substituto por definição. Classificar após delimitar a oferta e comprovar comparabilidade funcional, aceitação, requisitos de origem/conteúdo reciclado e decisões do comprador. Não duplicar a mesma alternativa entre forças.",
    "Custo, volatilidade, concentração nominal ou escassez isolados não demonstram poder de negociação. Verificar dependência, alternativas viáveis, custo de troca e condições efetivamente negociadas.",
    "As métricas dos insumos são unidades de conferência, não valores observados, benchmarks ou preços publicados. R$/t deve ser preenchido com documentos comparáveis da operação, período e base de massa declarados.",
    "Licenciamento, cadastros, rastreabilidade, transporte e destinação dependem da atividade, classificação do material, local e jurisdição. Consultar os requisitos vigentes e a autoridade competente antes de concluir cumprimento ou pendência; links institucionais não são prova de conformidade.",
    "Esta ficha não representa resíduos perigosos, eletroeletrônicos, compostagem, recuperação energética, disposição final nem reciclagem química. Esses recortes requerem análise própria."
  ]
}
