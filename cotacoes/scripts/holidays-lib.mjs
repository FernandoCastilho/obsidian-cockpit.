// Feriados da China: dados do ato anual do Conselho de Estado, no formato do projeto holiday-cn (feriados e dias de compensação).
export const CN_NAMES = {
  元旦: 'Ano Novo',
  春节: 'Festival da Primavera',
  清明节: 'Qingming',
  劳动节: 'Dia do Trabalho',
  端午节: 'Festival do Barco-Dragão',
  中秋节: 'Festival do Meio do Outono',
  国庆节: 'Dia Nacional',
  抗战胜利日: 'Dia da Vitória',
}

// JSON do ano -> { papers, days:[{date, isOffDay, name, nameEn}] }, ou null se o ano ainda não foi publicado (arquivo sem dias).
export function parseHolidayCn(json) {
  const days = (json?.days ?? [])
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d?.date) && typeof d.isOffDay === 'boolean')
    .map((d) => ({ date: d.date, isOffDay: d.isOffDay, name: d.name, nameEn: CN_NAMES[d.name] ?? d.name }))
  return days.length ? { papers: json.papers ?? [], days } : null
}

export const cnUrl = (year) => `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`
