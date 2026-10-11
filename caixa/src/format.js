const nf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Partes do valor para destacar os reais e deixar os centavos discretos.
export function partes(n) {
  const [inteiro, centavos] = nf.format(Math.abs(n)).split(',')
  return { neg: n < 0 && Math.abs(n) >= 0.005, inteiro, centavos }
}
export const brl = (n) => `${n < 0 ? '−' : ''}R$ ${nf.format(Math.abs(n))}`
export const inteiroBr = (n) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const nomeMes = (aaaamm) => MESES[Number(aaaamm.slice(5)) - 1]
export const rotuloMes = (aaaamm) => `${nomeMes(aaaamm)} de ${aaaamm.slice(0, 4)}`
export const dataCurta = (iso) => `${iso.slice(8)} ${nomeMes(iso.slice(0, 7)).slice(0, 3)}`
export const mesAtual = () => new Date().toISOString().slice(0, 7)
export const deslocarMes = (aaaamm, d) => {
  const [a, m] = aaaamm.split('-').map(Number)
  const t = a * 12 + (m - 1) + d
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
