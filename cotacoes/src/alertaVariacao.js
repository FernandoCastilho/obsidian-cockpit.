// Alerta de variação do dólar e do euro: quando a cotação atual se afasta mais de 0,30% (para cima ou para baixo) da primeira
// cotação do dia (primeiro ponto de hoje no intraday, horário de Brasília). Um alerta por moeda e por sentido em cada dia.
import { marketDate } from './marketReturns.js'
import { quoteAgeState } from './quoteFreshness.js'

export const LIMITE_PCT = 0.3
export const MOEDAS_ALERTA = { USD: 'Dólar', EUR: 'Euro' }

// `firsts`: { USD: { t, v }, EUR: { t, v } } com o primeiro ponto de hoje. `quotes`: cotações atuais do app.
export function alertasDoDia({ quotes, firsts, now = Date.now(), limite = LIMITE_PCT }) {
  const hoje = marketDate(now)
  const out = []
  for (const code of Object.keys(MOEDAS_ALERTA)) {
    const f = firsts?.[code], q = quotes?.[code]
    if (!f || !Number.isFinite(f.v) || !(f.v > 0) || !Number.isFinite(new Date(f.t).getTime()) || marketDate(f.t) !== hoje) continue
    if (!q || quoteAgeState(q, now) || !Number.isFinite(q.bid) || !(q.bid > 0) || q.timestamp < f.t || marketDate(q.timestamp) !== hoje) continue
    const pct = (q.bid / f.v - 1) * 100
    // Não trate o ruído de ponto flutuante no limite exato como um cruzamento.
    if (Math.abs(pct) - limite <= 1e-10) continue
    const dir = pct > 0 ? 'alta' : 'queda'
    out.push({ id: `${hoje}:${code}:${dir}`, code, nome: MOEDAS_ALERTA[code], dir, pct, base: f.v, baseAt: f.t, atual: q.bid, at: q.timestamp })
  }
  return out
}

export function textoAlerta(a) {
  const pct = Math.abs(a.pct).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const v = (x) => x.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
  const h = (t) => new Date(t).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  return `${a.nome} em ${a.dir} de ${pct}% desde a primeira cotação do dia (${v(a.base)} às ${h(a.baseAt)} → ${v(a.atual)} às ${h(a.at)}).`
}

// Base do alerta: a primeira cotação a partir da abertura (9h de Brasília). A coleta de madrugada (de hora em hora) não conta como
// início do dia; sem ponto depois das 9h, ainda não existe base e não há alerta.
const horaBr = (t) => Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(new Date(t)))
export function baseDoDia(points) {
  const ok = (points ?? []).filter((p) => Number.isFinite(p?.t) && Number.isFinite(new Date(p.t).getTime()) && Number.isFinite(p.bid) && p.bid > 0).sort((a, b) => a.t - b.t)
  const p = ok.find((x) => horaBr(x.t) >= 9) ?? null
  return p ? { t: p.t, v: p.bid } : null
}
