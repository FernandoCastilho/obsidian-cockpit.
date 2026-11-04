export const RECOVERY_STAGES = [
  {id:'pedido',title:'Pedidos',description:'Requerimentos apresentados. A data de apresentação precisa ser verificada na base de eventos.'},
  {id:'deferimento',title:'Deferimentos do processamento',description:'Decisões de processamento; não equivalem à apresentação do pedido nem à concessão.'},
  {id:'concessao',title:'Concessões',description:'Decisões de concessão da recuperação. Contagem separada das etapas anteriores.'},
]
export function recoveryWeek(value = Date.now()) {
  const iso=typeof value==='string' ? value : new Date(value).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null
  const d=new Date(iso+'T12:00:00Z')
  if(!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==iso)return null
  d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7)
  const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6)
  return {start,end:d.toISOString().slice(0,10)}
}
export function shiftRecoveryWeek(week,days) { const d=new Date(week.start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return recoveryWeek(d.toISOString().slice(0,10)) }
export function normalizeRecoveryStatus(data) {
  if(data?.schemaVersion!==1 || !Number.isFinite(data.reviewedAt) || !Number.isFinite(data.nextReviewAt) || data.nextReviewAt<data.reviewedAt || data.weekly?.status!=='unavailable' || !data.weekly?.counts || Object.values(data.weekly.counts).some(v=>v!==null) || !Array.isArray(data.weekly.sectors) || data.weekly.sectors.length!==0 || data.registry?.status!=='not-ingested' || data.registry?.count!==null || !Array.isArray(data.sourceChecks))throw new Error('Cobertura de recuperação judicial não validada')
  return data
}
