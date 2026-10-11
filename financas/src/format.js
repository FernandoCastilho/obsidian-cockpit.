const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const money = (v) => brl.format(v || 0)
export const plain = (v) => num.format(v || 0)
export const monthName = (m) => {
  const [y, mm] = m.split('-').map(Number)
  const s = new Date(Date.UTC(y, mm - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const monthShort = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 15)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')
export const dayLabel = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })
export const shiftMonth = (m, d) => {
  const [y, mm] = m.split('-').map(Number)
  const t = new Date(Date.UTC(y, mm - 1 + d, 1))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`
}
export const currentMonth = () => new Date().toISOString().slice(0, 7)
