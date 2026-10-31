// Reforma tributária: tudo o que saiu na imprensa na semana (Google Notícias, RSS), acumulado por dia.
export const TOPIC = 'reforma-tributaria'
export const WINDOW_DAYS = 7
export const MAX_ITEMS = 400
export const SITE_VALOR = 'site:valor.globo.com'
// Várias buscas para cobrir o tema: o RSS devolve só parte das matérias de cada consulta.
export const QUERIES = [
  'reforma tributária',
  'reforma tributária IBS CBS imposto seletivo',
  'reforma tributária regulamentação Congresso Senado Câmara',
  `reforma tributária ${SITE_VALOR}`,
  'reforma tributária Fazenda Haddad Appy',
  'split payment cashback IVA dual transição',
]

// Só entra matéria cujo título trata do tema (a busca às vezes devolve assunto vizinho; "CBS" também é emissora).
const DIRECT = /reforma\s+tribut|imposto\s+seletivo|split\s+payment|\bIVA\s+dual|comit[êe]\s+gestor|\bLC\s*214|PLP\s*(68|108)|tribut[aá]ria\s+do\s+consumo/i
const SIGLAS = /\b(IBS|CBS)\b/
const TRIBUTO = /tribut|imposto|al[ií]quota|\bIVA\b|cr[ée]dito\s+fiscal|ICMS|\bISS\b|PIS|Cofins/i
// IBS e CBS juntos já identificam o tema; uma sigla só precisa de contexto de tributo.
export const relevante = (title) => DIRECT.test(title) || (/\bIBS\b/.test(title) && /\bCBS\b/.test(title)) || (SIGLAS.test(title) && TRIBUTO.test(title))

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, ' ').trim()
const validItem = (it) => it && typeof it.title === 'string' && it.title.trim() && /^https?:\/\//.test(it.link ?? '') && Number.isFinite(it.t) && it.t > 0

// Junta as matérias novas às já publicadas, tira repetidas (mesmo link ou mesmo título), descarta o que passou da janela e ordena da mais recente.
export function mergeItems(fresh, previous, now = Date.now(), windowDays = WINDOW_DAYS) {
  const seenLink = new Set(), seenTitle = new Set(), out = []
  const limit = now - windowDays * 864e5
  for (const it of [...fresh, ...previous].filter(validItem).filter((x) => relevante(x.title)).sort((a, b) => b.t - a.t)) {
    const k = norm(it.title)
    if (it.t < limit || it.t > now + 36e5 || seenLink.has(it.link) || seenTitle.has(k)) continue
    seenLink.add(it.link); seenTitle.add(k)
    out.push({ title: it.title.trim(), link: it.link, source: it.source || 'Google Notícias', t: it.t })
    if (out.length >= MAX_ITEMS) break
  }
  return out
}

export function reformaFile(items, now, { stale = false, error = null } = {}) {
  return { schemaVersion: 1, generatedAt: now, topic: TOPIC, windowDays: WINDOW_DAYS, stale, error, items }
}
