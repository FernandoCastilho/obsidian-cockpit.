function brentSeries(data, today) {
 if(data?.benchmark!=='Brent'||data?.kind!=='spot'||data?.unit!=='USD/barril')return []
 return (Array.isArray(data.points)?data.points:[]).filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(Date.parse(p.date+'T12:00:00Z'))&&new Date(p.date+'T12:00:00Z').toISOString().slice(0,10)===p.date&&p.date<=today&&Number.isFinite(p.value)&&p.value>0).sort((a,b)=>a.date.localeCompare(b.date))
}
export function latestBrentSpot(data, today=new Date().toISOString().slice(0,10)) {
 return brentSeries(data,today).at(-1) ?? null
}

const dayNumber=d=>Date.parse(d+'T12:00:00Z')/864e5
// Variações do Brent spot da EIA sobre as observações diárias publicadas: dia (última contra a anterior), mês e ano
// (última contra a última observação anterior ao início do período; base a mais de 7 dias do início = sem cobertura).
export function brentReturns(data, today=new Date().toISOString().slice(0,10)) {
 const points=brentSeries(data,today),last=points.at(-1),prev=points.at(-2)
 const empty={last:last??null,delta:null,day:null,month:null,year:null}
 if(!last)return empty
 const since=start=>{const base=points.filter(p=>p.date<start).at(-1);return base&&last.date>=start&&dayNumber(start)-dayNumber(base.date)<=7?{value:(last.value/base.value-1)*100,baseDate:base.date}:null}
 return {last,delta:prev?last.value-prev.value:null,day:prev?(last.value/prev.value-1)*100:null,month:since(last.date.slice(0,7)+'-01'),year:since(last.date.slice(0,4)+'-01-01')}
}
