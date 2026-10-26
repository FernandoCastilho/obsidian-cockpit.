import { inflateRawSync } from 'node:zlib'
export const BIS_BULK='https://data.bis.org/static/bulk/WS_CBPOL_csv_col.zip'
export const BIS_TOPIC='https://data.bis.org/topics/CBPOL'
export const BIS_TERMS='https://data.bis.org/help/legal'
export const BIS_METHOD='https://www.bis.org/statistics/cbpol/cbpol_doc.pdf'

// Read one named CSV in memory. Never extract archive paths to the filesystem.
export function csvFromBisZip(buffer) {
 if(buffer.length<22 || buffer.length>5*1024*1024) throw new Error('ZIP BIS inválido ou acima do limite')
 let end=buffer.length-22
 while(end>=Math.max(0,buffer.length-65557) && buffer.readUInt32LE(end)!==0x06054b50) end--
 if(end<0 || buffer.readUInt32LE(end)!==0x06054b50) throw new Error('Diretório ZIP BIS ausente')
 const central=buffer.readUInt32LE(end+16)
 if(central+46>buffer.length || buffer.readUInt32LE(central)!==0x02014b50) throw new Error('Diretório ZIP BIS inválido')
 const method=buffer.readUInt16LE(central+10),size=buffer.readUInt32LE(central+24),length=buffer.readUInt32LE(central+20),offset=buffer.readUInt32LE(central+42),nameLength=buffer.readUInt16LE(central+28)
 const name=buffer.subarray(central+46,central+46+nameLength).toString()
 if(name!=='WS_CBPOL_csv_col.csv' || size>12*1024*1024 || offset+30>buffer.length || buffer.readUInt32LE(offset)!==0x04034b50) throw new Error('Conteúdo ZIP BIS inesperado')
 const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28)
 if(start+length>central || ![0,8].includes(method)) throw new Error('Compressão ZIP BIS inválida')
 const body=method===8?inflateRawSync(buffer.subarray(start,start+length),{maxOutputLength:12*1024*1024}):buffer.subarray(start,start+length)
 if(body.length!==size) throw new Error('CSV BIS incompleto')
 return body.toString('utf8')
}

export function* csvRecords(text) {
 let row=[],field='',quoted=false
 for(let i=0;i<text.length;i++) {
  const c=text[i]
  if(c==='"') { if(quoted && text[i+1]==='"') {field+='"';i++} else quoted=!quoted }
  else if(c===',' && !quoted) {row.push(field);field=''}
  else if((c==='\n'||c==='\r') && !quoted) { if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))yield row;row=[];field='' }
  else field+=c
 }
 if(quoted)throw new Error('CSV BIS truncado')
 if(field || row.length) {row.push(field);yield row}
}

export function parseBisJapan(csv, now=Date.now()) {
 const records=csvRecords(csv),header=records.next().value
 if(!header || !['FREQ','REF_AREA','Series','SOURCE_REF','COMPILATION'].every(k=>header.includes(k)))throw new Error('Cabeçalho BIS incompatível')
 const at=k=>header.indexOf(k), today=new Date(now).toISOString().slice(0,10)
 let selected
 for(const row of records) if(row[at('FREQ')]==='D' && row[at('REF_AREA')]==='JP' && row[at('Series')]==='D:JP') {
  if(selected)throw new Error('Série diária japonesa duplicada')
  selected=row
 }
 if(!selected || !/Bank of Japan/i.test(selected[at('SOURCE_REF')]) || !/uncollateralized overnight call rate/i.test(selected[at('COMPILATION')].split(';')[0])) throw new Error('Instrumento ou fonte BIS Japão incompatível')
 const observations=[]
 for(let i=0;i<header.length;i++) {
  const date=header[i],raw=selected[i]?.trim()
  // Before Aug/2024 Japan used a target band. Do not turn the BIS scalar into that band.
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || date<'2024-08-01' || date>today || !raw)continue
  if(!Number.isFinite(Date.parse(date)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0,10)!==date)throw new Error('Data BIS inválida')
  if(!/^-?\d+(?:\.\d+)?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw)<-10 || Number(raw)>100)throw new Error('Observação BIS inválida')
  observations.push({date,value:Number(raw),approximate:true,sourceUrl:BIS_TOPIC})
 }
 observations.sort((a,b)=>a.date.localeCompare(b.date))
 if(!observations.length)throw new Error('Série BIS Japão vazia')
 const points=observations.filter((p,i)=>!i || p.value!==observations[i-1].value)
 return {points,sourceUrl:BIS_TOPIC,sourceName:'Bank of Japan · compilado pelo BIS',provider:'BIS',lastObservationDate:observations.at(-1).date,coverageStart:observations[0].date,checkedAt:now,termsUrl:BIS_TERMS,methodUrl:BIS_METHOD,translationNote:'Tradução não oficial do BIS.'}
}

export async function collectBisJapan(now=Date.now(),fetchImpl=fetch) {
 const response=await fetchImpl(BIS_BULK,{signal:AbortSignal.timeout(30000)})
 if(!response.ok)throw new Error(`BIS HTTP ${response.status}`)
 return parseBisJapan(csvFromBisZip(Buffer.from(await response.arrayBuffer())),now)
}
