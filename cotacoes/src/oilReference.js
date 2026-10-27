export function latestBrentSpot(data, today=new Date().toISOString().slice(0,10)) {
 if(data?.benchmark!=='Brent'||data?.kind!=='spot'||data?.unit!=='USD/barril')return null
 const points=(Array.isArray(data.points)?data.points:[]).filter(p=>/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(Date.parse(p.date+'T12:00:00Z'))&&new Date(p.date+'T12:00:00Z').toISOString().slice(0,10)===p.date&&p.date<=today&&Number.isFinite(p.value)&&p.value>0).sort((a,b)=>a.date.localeCompare(b.date))
 return points.at(-1) ?? null
}
