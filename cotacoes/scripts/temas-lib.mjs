// Notícias por setor (indústria, comércio, serviços) e por insumo (cobre, alumínio, aço, minério de ferro, petróleo e diesel).
// Mesma coleta da reforma tributária: buscas no Google Notícias, só títulos que tratam do tema, histórico de 7 dias.
import { mergeItems, WINDOW_DAYS } from './reforma-lib.mjs'
export { WINDOW_DAYS }

const re = (s) => new RegExp(s, 'i')
// `termos`: o título precisa citar o assunto. `contexto` (opcional): e precisa trazer contexto econômico, para tirar ruído
// (por exemplo, "cobre" também é verbo; "serviços" é palavra genérica).
export const TEMAS = [
  { id: 'industria', grupo: 'setor', label: 'Indústria',
    queries: ['indústria brasileira produção industrial', 'indústria PMI Brasil CNI Anfavea', 'indústria custos juros dólar exportação', 'siderurgia petroquímica montadoras produção Brasil'],
    termos: re('ind[úu]stria|industrial|f[áa]brica|montadora|siderurg|petroqu[íi]m|Anfavea|\\bCNI\\b|Abimaq|Abiquim|Fiesp|manufatur'),
    contexto: re('produ[çc][ãa]o|PMI|custo|demanda|vendas|exporta|importa|juros|d[óo]lar|tarifa|emprego|investimento|queda|alta|cresc|capacidade|estoque') },
  { id: 'comercio', grupo: 'setor', label: 'Comércio e consumo',
    queries: ['varejo vendas comércio Brasil', 'consumo das famílias confiança do consumidor', 'vendas no varejo IBGE CNC', 'supermercados e-commerce vendas Black Friday'],
    termos: re('varejo|com[ée]rcio|consumo|consumidor|lojista|supermercad|e-commerce|Abras|\\bCNC\\b|Black Friday'),
    contexto: re('vendas|confian[çc]a|infla[çc][ãa]o|cr[ée]dito|juros|endividamento|inadimpl|queda|alta|cresc|índice|pesquisa|IBGE|IPCA|renda') },
  { id: 'servicos', grupo: 'setor', label: 'Serviços',
    queries: ['setor de serviços volume IBGE', 'transporte logística frete Brasil', 'bancos crédito setor financeiro Brasil', 'tecnologia telecom serviços Brasil economia'],
    termos: re('setor de servi[çc]os|volume de servi[çc]os|\\bPMS\\b|log[íi]stica|transporte (?:rodovi|ferrovi|a[ée]re|de carga|mar[íi]tim)|frete|ferrovia|aviação|companhias a[ée]reas|turismo|bancos?\\b|fintech|telecom|tecnologia'),
    contexto: re('receita|volume|demanda|custo|tarifa|pre[çc]o|cr[ée]dito|juros|lucro|resultado|queda|alta|cresc|IBGE|investimento|leil[ãa]o|concess') },
  { id: 'telecom', grupo: 'setor', label: 'Internet e telecom',
    queries: ['telecomunicações internet banda larga Anatel', 'telecom 5G operadoras Vivo Claro TIM', 'provedores de internet fibra Brasil', 'data center nuvem internet infraestrutura Brasil'],
    termos: re('telecom|internet|banda larga|\\b5G\\b|fibra [óo]ptica|operadoras?|Anatel|provedor(?:es)?|Vivo\\b|\\bTIM\\b|\\bClaro\\b|data center|conectividade'),
    contexto: re('receita|invest|leil[ãa]o|espectro|tarifa|pre[çc]o|assinantes|clientes|lucro|resultado|regula|licen|expans|rede|cobertura|queda|alta|cresc|fus[ãa]o|aquisi|contrato') },
  { id: 'cobre', grupo: 'insumo', label: 'Cobre',
    queries: ['cobre preço LME', 'cobre China demanda estoques', 'cobre mineração Chile Peru produção', 'cobre tarifa Estados Unidos commodities'],
    termos: re('\\bcobre\\b|copper|Codelco|Freeport'),
    contexto: re('pre[çc]o|tonelada|\\bLME\\b|min[ée]rio|mina|mineradora|Chile|Peru|China|demanda|estoque|metal|metais|tarifa|commodit|oferta|produ[çc][ãa]o|Vale|Sossego|Salobo|Cara[íi]ba') },
  { id: 'aluminio', grupo: 'insumo', label: 'Alumínio',
    queries: ['alumínio preço LME', 'alumínio produção China tarifa', 'alumínio Albras Alcoa Novelis CBA', 'alumínio bauxita energia eletrointensivos'],
    termos: re('alum[íi]nio|aluminum|aluminium|bauxita|Albras|Novelis|\\bCBA\\b'),
    contexto: re('pre[çc]o|tonelada|\\bLME\\b|tarifa|China|produ[çc][ãa]o|energia|demanda|estoque|oferta|exporta|importa|custo|eletrointensiv') },
  { id: 'aco', grupo: 'insumo', label: 'Aço',
    queries: ['aço preço siderurgia Brasil', 'aço importação China antidumping', 'Gerdau CSN Usiminas aço resultado', 'aço tarifa produção demanda'],
    termos: re('\\baço\\b|siderurg|Gerdau|\\bCSN\\b|Usiminas|Aço Brasil|laminados?|\\bsteel\\b'),
    contexto: re('pre[çc]o|importa[çc]|antidumping|tarifa|produ[çc][ãa]o|China|demanda|custo|siderurg|vendas|cota|resultado|estoque|exporta') },
  { id: 'minerio', grupo: 'insumo', label: 'Minério de ferro',
    queries: ['minério de ferro preço China', 'minério de ferro Vale produção', 'minério de ferro Dalian demanda siderurgia', 'minério de ferro exportação Brasil'],
    termos: re('min[ée]rio de ferro|iron ore|Dalian|Vale\\b'),
    contexto: re('pre[çc]o|tonelada|China|demanda|produ[çc][ãa]o|exporta|Dalian|siderurg|estoque|cota[çc][ãa]o|oferta|embarque|porto') },
  { id: 'petroleo', grupo: 'insumo', label: 'Petróleo e diesel',
    queries: ['petróleo Brent preço OPEP', 'diesel preço Petrobras ANP', 'gasolina diesel reajuste combustíveis', 'petróleo estoques EIA produção'],
    termos: re('petr[óo]leo|\\bBrent\\b|diesel|gasolina|combust[íi]ve|Petrobras|\\bANP\\b|\\bOPEP\\b|\\bOPEC\\b'),
    contexto: re('pre[çc]o|barril|reajuste|estoque|produ[çc][ãa]o|OPEP|OPEC|demanda|oferta|refinaria|pol[íi]tica de pre|cota[çc][ãa]o|alta|queda|importa|exporta') },
]
export const TEMA_IDS = TEMAS.map((t) => t.id)
export const relevanteTema = (tema, title) => tema.termos.test(title) && (!tema.contexto || tema.contexto.test(title))

export function temasFile(porTema, now, { stale = false, errors = [] } = {}) {
  return { schemaVersion: 1, generatedAt: now, windowDays: WINDOW_DAYS, stale, errors, temas: Object.fromEntries(TEMAS.map((t) => [t.id, { label: t.label, grupo: t.grupo, items: porTema[t.id] ?? [] }])) }
}
export const mergeTema = (tema, fresh, previous, now) => mergeItems(fresh, previous, now, WINDOW_DAYS, (title) => relevanteTema(tema, title))
