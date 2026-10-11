// Calendários de feriados por praça. Brasil, Nova York (Federal Reserve), Londres e Japão são calculados por regra;
// a China vem de dados oficiais (ato do Conselho de Estado, via holiday-cn), porque muda todo ano e tem dias de compensação.
// Datas em 'AAAA-MM-DD'. Nenhum feriado é inventado: sem dado para um ano da China, o app avisa em vez de supor.

const pad = (n) => String(n).padStart(2, '0')
export const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const ms = (s) => Date.parse(`${s}T12:00:00Z`)
export const addDays = (s, n) => new Date(ms(s) + n * 864e5).toISOString().slice(0, 10)
export const dow = (s) => new Date(ms(s)).getUTCDay() // 0 = domingo
const isWeekend = (s) => dow(s) === 0 || dow(s) === 6

// Páscoa (algoritmo gregoriano anônimo)
export function easter(y) {
  const a = y % 19
  const b = Math.floor(y / 100)
  const c = y % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return iso(y, month, day)
}

// n-ésimo dia da semana do mês (n = 1..5), ou o último (n = -1)
export function nthWeekday(y, m, wd, n) {
  if (n > 0) {
    const first = iso(y, m, 1)
    return addDays(first, ((wd - dow(first) + 7) % 7) + (n - 1) * 7)
  }
  const last = iso(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate())
  return addDays(last, -((dow(last) - wd + 7) % 7))
}

const sortMap = (list) => new Map(list.sort((a, b) => (a[0] < b[0] ? -1 : 1)))

function brazil(y) {
  const e = easter(y)
  return sortMap([
    [iso(y, 1, 1), 'Confraternização Universal'],
    [addDays(e, -48), 'Carnaval (segunda)'],
    [addDays(e, -47), 'Carnaval (terça)'],
    [addDays(e, -2), 'Sexta-feira Santa'],
    [iso(y, 4, 21), 'Tiradentes'],
    [iso(y, 5, 1), 'Dia do Trabalho'],
    [addDays(e, 60), 'Corpus Christi'],
    [iso(y, 9, 7), 'Independência do Brasil'],
    [iso(y, 10, 12), 'Nossa Senhora Aparecida'],
    [iso(y, 11, 2), 'Finados'],
    [iso(y, 11, 15), 'Proclamação da República'],
    ...(y >= 2024 ? [[iso(y, 11, 20), 'Consciência Negra']] : []),
    [iso(y, 12, 25), 'Natal'],
  ])
}

const saoPaulo = (y) => sortMap([[iso(y, 1, 25), 'Aniversário da cidade de São Paulo'], [iso(y, 7, 9), 'Revolução Constitucionalista (estadual SP)']])

// Federal Reserve: domingo vira segunda; sábado não é compensado (os bancos abrem na sexta).
function newYork(y) {
  const fixed = (m, d, name) => {
    const s = iso(y, m, d)
    return dow(s) === 0 ? [addDays(s, 1), `${name} (observado)`] : dow(s) === 6 ? null : [s, name]
  }
  return sortMap(
    [
      fixed(1, 1, 'Ano Novo'),
      [nthWeekday(y, 1, 1, 3), 'Martin Luther King Jr.'],
      [nthWeekday(y, 2, 1, 3), 'Dia dos Presidentes'],
      [nthWeekday(y, 5, 1, -1), 'Memorial Day'],
      y >= 2021 ? fixed(6, 19, 'Juneteenth') : null,
      fixed(7, 4, 'Independência dos EUA'),
      [nthWeekday(y, 9, 1, 1), 'Labor Day'],
      [nthWeekday(y, 10, 1, 2), 'Columbus Day'],
      fixed(11, 11, 'Veterans Day'),
      [nthWeekday(y, 11, 4, 4), 'Thanksgiving'],
      fixed(12, 25, 'Natal'),
    ].filter(Boolean),
  )
}

// Reino Unido: feriado de fim de semana passa para o próximo dia útil, sem colidir com outro feriado.
function london(y) {
  const e = easter(y)
  const out = new Map()
  const put = (s, name) => {
    let d = s
    while (isWeekend(d) || out.has(d)) d = addDays(d, 1)
    out.set(d, d === s ? name : `${name} (compensado)`)
  }
  put(iso(y, 1, 1), 'Ano Novo')
  out.set(addDays(e, -2), 'Good Friday')
  out.set(addDays(e, 1), 'Easter Monday')
  out.set(nthWeekday(y, 5, 1, 1), 'Early May bank holiday')
  out.set(nthWeekday(y, 5, 1, -1), 'Spring bank holiday')
  out.set(nthWeekday(y, 8, 1, -1), 'Summer bank holiday')
  put(iso(y, 12, 25), 'Natal')
  put(iso(y, 12, 26), 'Boxing Day')
  return sortMap([...out])
}

// Japão: regra dos feriados nacionais (equinócios por fórmula, válida de 1980 a 2099), feriado de domingo compensado e "feriado dos cidadãos".
function japan(y) {
  const eq = (c) => Math.floor(c + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))
  const base = new Map([
    [iso(y, 1, 1), 'Ano Novo'],
    [nthWeekday(y, 1, 1, 2), 'Dia da Maioridade'],
    [iso(y, 2, 11), 'Fundação Nacional'],
    [iso(y, 2, 23), 'Aniversário do Imperador'],
    [iso(y, 3, eq(20.8431)), 'Equinócio de Primavera'],
    [iso(y, 4, 29), 'Dia de Showa'],
    [iso(y, 5, 3), 'Dia da Constituição'],
    [iso(y, 5, 4), 'Dia do Verde'],
    [iso(y, 5, 5), 'Dia das Crianças'],
    [nthWeekday(y, 7, 1, 3), 'Dia do Mar'],
    [iso(y, 8, 11), 'Dia da Montanha'],
    [nthWeekday(y, 9, 1, 3), 'Respeito aos Idosos'],
    [iso(y, 9, eq(23.2488)), 'Equinócio de Outono'],
    [nthWeekday(y, 10, 1, 2), 'Dia do Esporte'],
    [iso(y, 11, 3), 'Dia da Cultura'],
    [iso(y, 11, 23), 'Ação de Graças Trabalhista'],
  ])
  const out = new Map(base)
  for (const [s, name] of base) {
    if (dow(s) === 0) {
      let d = addDays(s, 1)
      while (out.has(d)) d = addDays(d, 1)
      out.set(d, `${name} (compensado)`)
    }
  }
  for (const s of [...out.keys()]) {
    const mid = addDays(s, 1)
    if (!out.has(mid) && out.has(addDays(s, 2)) && dow(mid) !== 0) out.set(mid, 'Feriado dos cidadãos')
  }
  for (const s of [iso(y, 1, 2), iso(y, 1, 3), iso(y, 12, 31)]) if (!out.has(s)) out.set(s, 'Feriado bancário')
  return sortMap([...out])
}

export const CALENDARS = [
  { id: 'BR', label: 'Brasil (B3/ANBIMA)', short: 'Brasil', rule: brazil },
  { id: 'SP', label: 'São Paulo (cidade e estado)', short: 'São Paulo', rule: saoPaulo },
  { id: 'NY', label: 'Nova York (Federal Reserve)', short: 'Nova York', rule: newYork },
  { id: 'UK', label: 'Londres', short: 'Londres', rule: london },
  { id: 'JP', label: 'Tóquio', short: 'Tóquio', rule: japan },
  { id: 'CN', label: 'China (continental)', short: 'China', rule: null },
]
export const calLabel = (id) => CALENDARS.find((c) => c.id === id)?.short ?? id

// Dados da China: { 2026: { off: Map(data → nome), work: Set(dias úteis em fim de semana) } }, montado a partir do arquivo coletado.
export function buildCn(file) {
  const out = {}
  for (const [year, y] of Object.entries(file?.years ?? {})) {
    const off = new Map()
    const work = new Set()
    for (const d of y.days ?? []) (d.isOffDay ? off.set(d.date, d.nameEn ?? d.name) : work.add(d.date))
    if (off.size) out[year] = { off, work }
  }
  return out
}

const cache = new Map()
export function holidayMap(cal, year, ctx = {}) {
  if (cal === 'CN') return ctx.cn?.[year]?.off ?? new Map()
  const key = `${cal}${year}`
  if (!cache.has(key)) cache.set(key, CALENDARS.find((c) => c.id === cal).rule(year))
  return cache.get(key)
}
const nameOf = (cal, s, ctx) => holidayMap(cal, Number(s.slice(0, 4)), ctx).get(s)

// A China só tem dado quando o ato do ano foi publicado: devolve os anos sem dado, para avisar o usuário.
export const cnMissingYears = (years, ctx = {}) => [...new Set(years)].filter((y) => !ctx.cn?.[y])

export function isBusinessDay(s, cal, ctx = {}) {
  if (cal === 'CN' && ctx.cn?.[s.slice(0, 4)]?.work.has(s)) return true // sábado/domingo de compensação trabalha
  return !isWeekend(s) && !nameOf(cal, s, ctx)
}
export const isBusinessDayAll = (s, cals, ctx = {}) => cals.every((c) => isBusinessDay(s, c, ctx))

// Motivos pelos quais a data não é dia útil nas praças escolhidas
export function offReasons(s, cals, ctx = {}) {
  const out = []
  for (const c of cals) {
    if (isBusinessDay(s, c, ctx)) continue
    const n = nameOf(c, s, ctx)
    out.push({ cal: c, name: n ?? 'fim de semana' })
  }
  return out
}

export function nextBusinessDay(s, cals, ctx = {}) {
  let d = s
  for (let i = 0; i < 40 && !isBusinessDayAll(d, cals, ctx); i++) d = addDays(d, 1)
  return d
}

// Dias úteis entre duas datas (a inicial não conta, a final conta), comuns a todas as praças informadas
export function busDaysIn(from, to, cals, ctx = {}) {
  if (!(ms(to) > ms(from))) return 0
  let n = 0
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (isBusinessDayAll(d, cals, ctx)) n++
  return n
}

// Feriados (em dia de semana) nas praças escolhidas, nos próximos `days` dias a partir de `from` (inclusive)
export function upcomingHolidays(from, days, cals, ctx = {}) {
  const out = []
  for (let i = 0; i <= days; i++) {
    const d = addDays(from, i)
    for (const c of cals) {
      const name = nameOf(c, d, ctx)
      if (name && !isWeekend(d)) out.push({ date: d, cal: c, name })
    }
  }
  return out
}
