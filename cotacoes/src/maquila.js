import { nf } from './format.js'

// Conta didática do art. 37 da Lei paraguaia 7.547/2025.
// As duas bases precisam estar na mesma moeda. Não apura tributos de uma operação real.
export function tributoMaquila({ valorAgregado, faturaExportacao }) {
  if (![valorAgregado, faturaExportacao].every((v) => Number.isFinite(v) && v >= 0)) return null
  return Math.max(valorAgregado, faturaExportacao) * 0.01
}

const EXEMPLO = { valorAgregado: 40_000, faturaExportacao: 50_000 }
const usd = (valor) => `US$ ${nf(valor, 0)}`

export const CONCEITO_MAQUILA = {
  id: 'lei-de-maquila',
  topico: 'Comércio exterior',
  nome: 'Lei de Maquila no Paraguai',
  frase: 'É o regime paraguaio para produzir bens ou prestar serviços destinados ao exterior, sob contrato com empresa estrangeira e programa aprovado.',
  crianca: [
    'Uma empresa no exterior contrata uma operação no Paraguai para fabricar, transformar ou prestar um serviço que será utilizado fora do país. Essa operação pode entrar no regime de maquila se cumprir os requisitos e tiver seu programa aprovado.',
    'Não basta abrir uma empresa no Paraguai. A empresa maquiladora precisa estar domiciliada no país, ter contrato de maquila com uma empresa domiciliada no exterior e obter aprovação do programa pelas autoridades paraguaias. A contratante estrangeira, chamada de matriz na lei, não precisa ser a controladora societária.',
    'O tributo único é de 1% sobre o maior entre o valor agregado no Paraguai e o valor da fatura de exportação aplicável ao programa. A composição dessa fatura precisa ser validada conforme a operação. Não é simplesmente 1% do lucro. Os benefícios estão ligados ao programa aprovado, não a toda atividade ou receita do grupo.',
    'Para avaliar se faz sentido, compare o custo completo: produção, frete, desembaraço, tributos no destino, câmbio e capital de giro. Pergunte qual é o produto e sua NCM, quem contrata e importa, quem é dono dos estoques e em que moeda ocorre o pagamento.',
  ],
  analogia: 'É como contratar uma oficina em outro país para uma etapa da produção: o contrato e o programa definem o serviço, os insumos e as entregas. O incentivo daquela oficina não elimina os custos e as regras da chegada ao destino.',
  lacunas: [
    'Maquila não garante origem Mercosul nem importação sem tributos no Brasil. É preciso conferir a NCM, o requisito específico de origem e a prova válida. Não existe uma regra universal de “40% local = tarifa zero”; o setor automotivo tem regras próprias.',
    'Mesmo quando existe preferência tarifária, os demais tributos e controles da importação brasileira não desaparecem automaticamente. O regime paraguaio e o tratamento no país de destino são análises separadas.',
    'Na maquiladora pura, a venda no mercado paraguaio pode alcançar até 10% do volume exportado no último ano, observados os procedimentos, a nacionalização e os tributos internos. Não é venda local livre tributada a 1%. Serviços exportados precisam ser aproveitados no exterior.',
    'A admissão temporária suspende tributos dos bens autorizados, mas exige controle e cumprimento de prazo. Para insumos e matérias-primas, são 12 meses, prorrogáveis por até outros 12 com justificativa e aprovação. Não são 24 meses automáticos.',
    'A Lei 1.064/1997 é o marco anterior. O art. 42 da Lei 7.547/2025 manteve a aplicação integral da lei anterior por 12 meses de transição, contados da vigência da nova lei; encerrado o prazo, os programas vigentes são incorporados de pleno direito ao novo regime, sem ato adicional. Em 05/11/2026, esse prazo já havia transcorrido. São preservados os direitos indicados no art. 42, como benefícios concedidos, admissões temporárias e seus prazos, investimentos, garantias, registros e saldos, além da vigência indefinida dos programas anteriores abrangidos. Confira os atos e direitos específicos de cada programa.',
    'O cadastro e o programa passam pelo VUE/SIMEX e exigem documentos da empresa, contrato e informações operacionais. Se a aprovação usar carta de intenção, a lei atual exige o contrato em até 180 dias contados da resolução que aprova o programa, sob pena de caducidade da aprovação. A página resumida do MIC ainda contém trecho antigo de 120 dias: prevalece a lei aplicável.',
    'Continuam relevantes as obrigações aduaneiras, trabalhistas, previdenciárias e ambientais. Falhas de inventário, desvios de insumos ou descumprimento do programa podem gerar multas, suspensão ou cancelamento. Em operações relacionadas ao Brasil, verifique também preços de transferência quando aplicáveis.',
  ],
  preciso: {
    texto: 'Base atual: Lei 7.547/2025, de 8 de setembro de 2025, regulamentada pelo Decreto 5.714/2026, de 6 de abril de 2026. O programa é aprovado por resolução conjunta do Ministério da Indústria e Comércio (MIC) e do Ministério da Economia e Finanças (MEF), após análise do CNIME. Pelo art. 37, a base do tributo único é o maior entre o valor agregado no território paraguaio e a fatura de exportação. O valor agregado inclui bens e serviços adquiridos no país, remunerações e contribuições previdenciárias, depreciação de bens de capital próprios da maquiladora e remuneração pela maquila. As exonerações do art. 38 estão vinculadas às atividades do programa e têm condições e exceções. A conta abaixo mostra apenas a regra do 1%, não a carga total de uma operação.',
    formula: 'tributo único = 1% × maior(valor agregado no Paraguai, valor da fatura de exportação)',
  },
  exemplo: {
    titulo: 'Como escolher a base do 1% (valores fictícios)',
    passos: [
      `Suponha, na mesma moeda e para o mesmo período, valor agregado no Paraguai de ${usd(EXEMPLO.valorAgregado)} e fatura de exportação de ${usd(EXEMPLO.faturaExportacao)}. São bases didáticas já apuradas. O exemplo apenas compara as bases; não calcula a composição fiscal da fatura.`,
      `A base é o maior valor: ${usd(Math.max(EXEMPLO.valorAgregado, EXEMPLO.faturaExportacao))}. O tributo único ilustrativo é 1% × ${usd(EXEMPLO.faturaExportacao)} = ${usd(tributoMaquila(EXEMPLO))}.`,
      `Se o valor agregado fosse ${usd(60_000)} e a fatura continuasse em ${usd(EXEMPLO.faturaExportacao)}, a base seria ${usd(60_000)} e o tributo seria ${usd(tributoMaquila({ ...EXEMPLO, valorAgregado: 60_000 }))}.`,
    ],
    resultado: `No primeiro cenário, ${usd(tributoMaquila(EXEMPLO))}; no segundo, ${usd(tributoMaquila({ ...EXEMPLO, valorAgregado: 60_000 }))}. A comparação das duas bases importa. A conta não estima o custo total da operação nem os tributos no destino.`,
  },
  teste: {
    pergunta: 'Uma empresa produz sob maquila no Paraguai e vende ao Brasil. Pode concluir que paga apenas 1% e que a importação brasileira está livre de tributos?',
    resposta: 'Não. O 1% é o tributo único do regime paraguaio sobre a base definida na lei, dentro do programa. No Brasil, é preciso avaliar a origem Mercosul, a NCM, os tributos e os controles de importação. A vantagem só pode ser medida comparando a operação completa.',
  },
  noApp: { texto: 'Em Cenários › Commodities, acompanhe referências internacionais dos insumos. Elas ajudam na análise de custo, mas não determinam elegibilidade, origem ou carga tributária da maquila.', tab: 'cenarios', view: 'commodities' },
  ajuda: [
    'Conteúdo educacional verificado em 05/11/2026. A base atual e as regras de transição estão identificadas no texto; as fontes oficiais ficam na seção Fontes.',
    'Elegibilidade, origem e carga tributária dependem do programa, do produto, da operação e da legislação aplicável. Os exemplos usam valores fictícios na mesma moeda e não substituem validação jurídica, tributária e aduaneira.',
  ],
  fontes: [
    { nome: 'BACN · Lei 7.547/2025, especialmente arts. 1–5, 11–18, 37–39 e 42', url: 'https://www.bacn.gov.py/leyes-paraguayas/12853/ley-n-75472025-del-regimen-de-maquila' },
    { nome: 'MIC · Decreto 5.714/2026, regulamentação do regime', url: 'https://www.mic.gov.py/wp-content/uploads/2026/04/DECRETO-N%C2%B0-5714-2026.pdf' },
    { nome: 'MIC · Maquila e acesso ao registro SIMEX (há resumo antigo sobre carta de intenção)', url: 'https://www.mic.gov.py/maquila24/' },
    { nome: 'SE-CNIME · Resolução 14/2026, requisitos documentais', url: 'https://www.mic.gov.py/wp-content/uploads/2026/05/Resolucion-de-Recaudos-Documentales-SE-CNIME-N%C2%B0-14-2026.pdf' },
    { nome: 'Mercosul · Novo Regime de Origem, em vigor desde 18/07/2024', url: 'https://www.mercosur.int/pt-br/novo-regime-de-origem-do-mercosul-rom-entra-em-vigor-dia-18-de-julho' },
    { nome: 'Siscomex · Simuladores de tratamento tributário e administrativo', url: 'https://www.gov.br/siscomex/pt-br/sistemas-de-comercio-exterior/simuladores' },
    { nome: 'Receita Federal · IN RFB 2.161/2023, preços de transferência', url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=133782' },
  ],
}
