// Endereço da aba BNDES: #bndes/<família>/<série>?p=<período>, para colar no e-mail ou no Teams e abrir exatamente no mesmo gráfico.
// Comparação: c=ID1,ID2,... (duas ou mais séries, de qualquer família, no mesmo gráfico: TFB com TFC, por exemplo).
// Período: p=3m, 6m, 12m, 2a, 5a ou tudo; ou d=AAAA-MM-DD..AAAA-MM-DD para um intervalo de datas.
import { DEFAULT_SELECTION, FAMILIES } from './bndesView.js'

export const PRESET_CODE = { 3: '3m', 6: '6m', 12: '12m', 24: '2a', 60: '5a', all: 'tudo' }
const PRESET_OF = Object.fromEntries(Object.entries(PRESET_CODE).map(([k, v]) => [v, k === 'all' ? 'all' : Number(k)]))
const DAY = /^\d{4}-\d{2}-\d{2}$/
export const DEFAULT_ROUTE = { family: 'tfb', id: DEFAULT_SELECTION.tfb, preset: 12, custom: null, compare: [] }

// sub = tudo depois de "#bndes/" (ex.: "tfc/C02?p=12m"); `ids` = séries válidas por família, para ignorar série desconhecida.
export function parseRoute(sub, ids = {}) {
  const [path = '', query = ''] = String(sub ?? '').split('?')
  const [f, s] = path.split('/')
  const family = FAMILIES.some((x) => x.id === f) ? f : DEFAULT_ROUTE.family
  const valid = ids[family]
  const id = f === family && s && (!valid || valid.includes(s)) ? s : DEFAULT_SELECTION[family]
  const q = new URLSearchParams(query)
  let preset = DEFAULT_ROUTE.preset, custom = null
  const d = q.get('d')
  const [a, b] = d ? d.split('..') : []
  if (DAY.test(a ?? '') && DAY.test(b ?? '') && a <= b) custom = { start: a, end: b }
  else if (q.get('p') in PRESET_OF) preset = PRESET_OF[q.get('p')]
  // c=A,B,C: séries da mesma família no mesmo gráfico (só vale com duas ou mais, todas conhecidas)
  // A comparação atravessa as famílias (ex.: TFB com TFC): vale o código de qualquer série conhecida.
  const known = new Set(Object.values(ids).flat())
  const wanted = [...new Set(String(q.get('c') ?? '').split(',').filter(Boolean))].filter((v) => !known.size || known.has(v))
  const compare = wanted.length >= 2 ? wanted : []
  return { family, id, preset, custom, compare }
}

// Sempre completo (família, série e período), para o endereço copiado reproduzir a tela.
export function buildRoute({ family, id, preset, custom, compare = [] }) {
  return `${family}/${id ?? DEFAULT_SELECTION[family]}?${custom ? `d=${custom.start}..${custom.end}` : `p=${PRESET_CODE[preset] ?? '12m'}`}${compare.length >= 2 ? `&c=${compare.join(',')}` : ''}`
}
