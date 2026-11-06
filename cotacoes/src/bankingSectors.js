import { SETORES } from './insumos.js'

// Proposta editorial para atendimento PJ, não classificação oficial ou cobertura completa.
// B3 inspira os grandes ramos; atividades privadas e temas transversais são mantidos.
export const BANKING_GROUPS = [
  {label:'Agro e alimentos',topics:[['agricultura','Agricultura e insumos agrícolas'],['pecuaria','Pecuária e proteína animal'],['alimentos-bebidas','Alimentos e bebidas']]},
  {label:'Indústria e transformação',topics:[['industria','Indústria'],['veiculos-pesados','Veículos pesados'],['metalmecanica','Metalmecânica e máquinas'],['quimicos-plasticos','Químicos e plásticos'],['textil-moveis','Têxtil, vestuário e móveis']]},
  {label:'Comércio e distribuição',topics:[['comercio','Comércio e consumo'],['atacado-distribuicao','Atacado e distribuição'],['varejo-essencial','Varejo essencial'],['varejo-duraveis','Bens duráveis e comércio eletrônico']]},
  {label:'Transportes e logística',topics:[['transporte-cargas','Transporte de cargas'],['transporte-passageiros','Transporte de passageiros'],['armazenagem-logistica','Armazenagem e operadores logísticos']]},
  {label:'Construção e imobiliário',topics:[['construcao-civil','Construção civil'],['infraestrutura','Obras de infraestrutura'],['mercado-imobiliario','Incorporação e serviços imobiliários']]},
  {label:'Tecnologia e comunicação',topics:[['telecom','Internet e telecom'],['software-ti','Software e serviços de TI'],['comunicacao-midia','Comunicação e mídia']]},
  {label:'Saúde e cuidados',topics:[['saude-assistencial','Hospitais, clínicas e cuidados'],['diagnosticos','Diagnósticos e laboratórios'],['produtos-saude','Produtos e equipamentos de saúde']]},
  {label:'Educação e serviços empresariais',topics:[['servicos','Serviços'],['educacao','Educação privada'],['servicos-profissionais','Serviços profissionais'],['terceirizacao','Terceirização e facilities']]},
  {label:'Turismo, lazer e alimentação',topics:[['turismo-hospedagem','Turismo e hospedagem'],['alimentacao-servicos','Restaurantes e alimentação'],['lazer-entretenimento','Lazer e entretenimento']]},
  {label:'Energia e saneamento',topics:[['energia','Energia elétrica e renováveis'],['saneamento','Água, saneamento e resíduos'],['reciclagem','Reciclagem','papel papelão aparas plástico PET PEAD PEBD PELBD PP metais ferrosos não ferrosos sucata cobre alumínio vidro triagem reprocessamento recuperação materiais economia circular']]},
  {label:'Financeiro e seguros',topics:[['servicos-financeiros','Serviços financeiros e cooperativas de crédito'],['seguros','Seguros e intermediação']]},
  {label:'Extrativismo e materiais básicos',topics:[['mineracao','Mineração e materiais básicos'],['oleo-gas','Petróleo, gás e biocombustíveis']]},
]
// Reciclagem usa a camada setorial nova; não entra no coletor legado de SETORES.
export const BANKING_TOPICS = BANKING_GROUPS.flatMap(group=>group.topics.map(([id,label,keywords=''])=>({id,label,keywords,grupo:group.label,editorial:true,available:id==='reciclagem'||SETORES.some(topic=>topic.id===id)})))
export const bankingTopic = id => BANKING_TOPICS.find(topic=>topic.id===id)
export const resolveBankingTopic = route => bankingTopic(String(route??'').split('?')[0])?.id || null
export const BANKING_VISIT_QUESTIONS = [
  'Como o negócio gera receita, quais clientes concentram as vendas e qual é o prazo de recebimento?',
  'Qual é o ciclo entre comprar, produzir ou prestar o serviço, receber e pagar fornecedores?',
  'Qual é a finalidade do crédito, como o caixa paga a dívida e quais garantias e riscos precisam ser avaliados?',
]
