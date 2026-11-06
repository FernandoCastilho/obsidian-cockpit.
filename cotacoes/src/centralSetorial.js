// Catálogo inicial do Agente Setorial v0.2.1. Lista de recortes, não de estudos realizados.
export const CATALOGO_SETORIAL = [
  ['base-florestal', 'Base florestal e madeira', ['Florestas plantadas','Serrarias','Lâminas','Compensados','MDF e MDP','Móveis']],
  ['transporte-logistica', 'Transporte e logística', ['Carga geral','Transporte de madeira','Transporte de grãos','Transporte refrigerado','Transporte de produtos perigosos','Armazenagem','Logística portuária']],
  ['papel-celulose', 'Papel, celulose e embalagens', ['Celulose','Papel','Papelão ondulado','Caixas','Sacos industriais','Tubetes']],
  ['alimentos-agroindustria', 'Alimentos e agroindústria', ['Frigoríficos','Laticínios','Moinhos','Óleos vegetais','Alimentos processados','Bebidas']],
  ['metalmecanico', 'Metalmecânico e máquinas', ['Fundição','Usinagem','Estruturas metálicas','Máquinas industriais','Máquinas agrícolas','Equipamentos']],
  ['automotivo', 'Automotivo e autopeças', ['Componentes automotivos','Implementos rodoviários','Reposição de autopeças','Distribuidores de peças']],
  ['construcao', 'Construção e materiais', ['Construção residencial','Galpões','Infraestrutura','Cimento','Cerâmica','Vidros','Esquadrias']],
  ['textil', 'Têxtil e vestuário', ['Fiação','Tecelagem','Malharia','Tinturaria','Confecção','Tecidos técnicos']],
  ['quimicos', 'Químicos, plásticos e borracha', ['Resinas','Transformação plástica','Embalagens flexíveis','Tintas','Limpeza','Borracha']],
  ['atacado', 'Atacado e distribuição', ['Distribuição de alimentos','Distribuição de medicamentos','Distribuição de materiais de construção','Distribuição de insumos industriais','Distribuição de equipamentos']],
].map(([id, label, topics]) => ({ id, label, topics }))
export const TOPICOS_ESTUDO = ['Resumo executivo','Funcionamento e cadeia de valor','Empresas, concorrência e polos de referência','Histórico e indicadores','Conjuntura e impactos','Economia da empresa e financiamento','Cenários e sinais de acompanhamento','Preparação de visita','Fontes, método e limitações']
export const normalizeSector = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
