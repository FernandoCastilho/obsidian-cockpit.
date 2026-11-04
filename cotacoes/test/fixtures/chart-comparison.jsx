import React from 'react'
import {createRoot} from 'react-dom/client'
import MultiLinhas from '../../src/MultiLinhas.jsx'
import {Plot} from '../../src/HistoryChart.jsx'
import IpcaGrupoChart from '../../src/IpcaGrupoChart.jsx'
import SofrChart from '../../src/Sofr.jsx'
import Sparkline from '../../src/Sparkline.jsx'
import {AcessosPanel} from '../../src/Acessos.jsx'
import {AvisosProvider} from '../../src/Avisos.jsx'
import '../../src/styles.css'
import '../../src/Terminal.css'
const monthly=Array.from({length:36},(_,i)=>({t:Date.UTC(2023,10+i,15,12),v:2+i/20}))
const two=[{key:'PF',name:'PF',points:monthly,color:'#ffb000'},{key:'PJ',name:'PJ',points:monthly.map(p=>({...p,v:p.v/2})),color:'#4cc3ff'}]
const daily=Array.from({length:800},(_,i)=>[Date.UTC(2024,0,1+i,12),4+Math.sin(i/90),3.8,4.2])
function App(){const [width,setWidth]=React.useState(window.innerWidth-48);React.useEffect(()=>{const resize=()=>setWidth(window.innerWidth-48);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize)},[]);return <AvisosProvider><main style={{padding:16}}><h1>Ensaio com dados fictícios</h1><section id="multi"><h2>Séries múltiplas</h2><MultiLinhas series={two.map(s=>({...s,points:s.points.slice(-12)}))} history={two} frequency="month" rate width={width} fmt={v=>v.toFixed(2)+'%'} ariaLabel="Ensaio PF e PJ"/></section><section id="single"><h2>Linha histórica</h2><Plot points={monthly.slice(-12).map(p=>({...p,bid:p.v}))} history={monthly.map(p=>({...p,bid:p.v}))} width={width} color="#ffb000" label="Taxa de teste" code="test" nice rate scales={false}/></section><section id="bars"><IpcaGrupoChart name="Grupo fictício" months={monthly.map(p=>({period:new Date(p.t).toISOString().slice(0,7),mom:p.v/10}))} onClose={()=>{}}/></section><section id="sofr"><SofrChart macro={{sofr:daily,sofrAvg:daily.map(r=>[r[0],r[1],r[1],r[1]])}} range={{start:new Date(daily.at(-200)[0]),end:new Date(daily.at(-1)[0])}}/></section><section id="spark" style={{width:200,position:'relative'}}><Sparkline points={monthly.map(p=>({...p,bid:p.v}))}/></section><AcessosPanel/></main></AvisosProvider>}
createRoot(document.getElementById('root')).render(<App/> )
