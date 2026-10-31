// Moedas de que uma manchete provavelmente fala: as da busca que a trouxe (USD, EUR, JPY, CNH) mais as citadas no título.
// Só serve para mostrar a bandeira ao lado do título; não classifica a notícia nem altera filtros.
export const MOEDAS = [
  { code: 'USD', nome: 'dólar', re: /d[óo]lar|\bdollar\b|\bUS\$|\bUSD\b|Federal Reserve|\bFed\b|\bFOMC\b|Tesouro americano|Treasur(?:y|ies)|Wall Street|\bEUA\b|Estados Unidos|\bTrump\b|\bPowell\b/i },
  { code: 'EUR', nome: 'euro', re: /\beuros?\b|\beurozone\b|\bEUR\b|\bBCE\b|Banco Central Europeu|zona do euro|\bLagarde\b|\bECB\b|Eurozona|Uni[ãa]o Europeia/i },
  { code: 'JPY', nome: 'iene', re: /\bienes?\b|\byen\b|Bank of Japan|\bJPY\b|Banco do Jap[ãa]o|\bBoJ\b|Jap[ãa]o|T[óo]quio|\bNikkei\b/i },
  { code: 'CNH', nome: 'yuan', re: /\byuans?\b|renminbi|\bCNH\b|\bCNY\b|\bPBoC\b|\bPBOC\b|China|Pequim/i },
  { code: 'GBP', nome: 'libra', re: /\blibra\b|\bpound\b|\bsterling\b|\bGBP\b|Banco da Inglaterra|Bank of England|Reino Unido|Londres|esterlina/i },
  { code: 'BRL', nome: 'real', re: /\bSelic\b|\bCopom\b|\bIPCA\b|Ibovespa|\breais\b|\b(?:o|do|ao|no|pelo) real\b|Banco Central do Brasil|\bBC\b|Tesouro Nacional|Haddad|Galípolo/i },
]
const NOME = Object.fromEntries(MOEDAS.map((m) => [m.code, m.nome]))
export const nomeDaMoeda = (code) => NOME[code] ?? code

// Ordem estável: primeiro as da busca, depois as do texto, sem repetir.
export function moedasDaManchete(item) {
  const out = []
  const add = (c) => { if (NOME[c] && !out.includes(c)) out.push(c) }
  for (const c of item?.codes ?? []) add(c)
  const texto = `${item?.title ?? ''} ${item?.original ?? ''}`
  for (const m of MOEDAS) if (m.re.test(texto)) add(m.code)
  return out
}
