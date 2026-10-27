import { useState } from 'react'
import { useCalcMemory } from './calcMemory.js'
import CalcMemory from './CalcMemory.jsx'
import MoneyInput from './MoneyInput.jsx'
import { parseNum } from './calc.js'
import { calculateNcg } from './ncg.js'
import './Ncg.css'

const FIELDS = [
 ['monthlySales','Vendas mensais (R$)','Média mensal representativa das vendas.'],
 ['monthlyCogs','Custo vendido mensal (R$)','CMV/CPV do mesmo período, não despesas totais.'],
 ['pmr','Prazo médio de recebimento (dias)','Pondere todas as vendas pelo valor. À vista = 0 dia.'],
 ['pme','Prazo médio de estoque (dias)','Tempo médio entre entrada e venda do estoque.'],
 ['pmp','Prazo médio de pagamento (dias)','Pondere todas as compras pelo valor. À vista = 0 dia.'],
 ['additionalReserve','Reserva adicional desejada (R$)','Além da NCG. Digite 0 se não houver reserva adicional.'],
 ['existingCoverage','Cobertura já existente (R$)','Recursos efetivamente destinados a cobrir esta NCG e reserva, sem contar duas vezes.'],
]
const EMPTY=Object.fromEntries([...FIELDS.map(([key])=>[key,'']),['monthlyPurchases','']])
const EXAMPLE={monthlySales:'300.000',monthlyCogs:'210.000',pmr:'30',pme:'40',pmp:'30',additionalReserve:'30.000',existingCoverage:'250.000',monthlyPurchases:''}
const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const num=v=>v.toLocaleString('pt-BR',{maximumFractionDigits:2})
export default function Ncg(){
 const mem=useCalcMemory('ncg')
 const [values,setValues]=mem.use('values',EMPTY)
 const [example,setExample]=useState(()=>JSON.stringify(values)===JSON.stringify(EXAMPLE))
 const parsed=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.trim()===''?null:parseNum(v)]))
 const result=calculateNcg(parsed)
 const invalid=Object.entries(parsed).filter(([,v])=>v!==null&&(!Number.isFinite(v)||v<0)).map(([k])=>k)
 const set=(key,value)=>{setExample(false);setValues(prev=>({...prev,[key]:value}))}
 const baseReady=FIELDS.slice(0,5).every(([key])=>parsed[key]!==null)
 const field=(key,label,help)=><label key={key} htmlFor={`ncg-${key}`}><span className="ncg-label">{label}</span>{label.includes('(R$)')?<MoneyInput id={`ncg-${key}`} value={values[key]} onChange={v=>set(key,v)} aria-invalid={invalid.includes(key)} aria-describedby={`ncg-help-${key}`} />:<input id={`ncg-${key}`} inputMode="decimal" autoComplete="off" value={values[key]} onChange={e=>set(key,e.target.value)} aria-invalid={invalid.includes(key)} aria-describedby={`ncg-help-${key}`} />}<small id={`ncg-help-${key}`}>{help}</small></label>
 return <article className="chart ncg">
  <p className="ncg-intro">Estime o capital preso no ciclo comercial. Valores mensais e base de 30 dias, sem conversas ou etapas adicionais.</p>
  <CalcMemory mem={mem} />
  <div className="ncg-actions"><button type="button" className="more" onClick={()=>{setValues(EXAMPLE);setExample(true)}}>Carregar exemplo fictício</button><button type="button" className="more" onClick={()=>{setValues(EMPTY);setExample(false)}}>Limpar campos</button></div>
  {example&&<p className="ncg-notice" role="status">Exemplo fictício para demonstração. Não representa uma empresa real.</p>}
  <div className="ncg-grid">
   <div className="ncg-inputs">
    <section className="calc-section"><h3 className="calc-sub">Ciclo comercial</h3><div className="ncg-fields ncg-cycle">{FIELDS.slice(0,5).map(([key,label,help])=>field(key,label,help))}</div></section>
    <section className="calc-section"><h3 className="calc-sub">Reserva e cobertura</h3><div className="ncg-fields">{FIELDS.slice(5).map(([key,label,help])=>field(key,label,help))}</div></section>
    <details className="ncg-advanced"><summary>Premissas e ajuste de compras</summary>
     <p>Por padrão, compras mensais ≈ custo vendido mensal, supondo estoque estável. Ajuste se as compras do período forem diferentes.</p>
     {field('monthlyPurchases','Compras mensais (R$), opcional','Vazio utiliza o custo vendido. Digite 0 somente se realmente não houver compras.')}
     <p>Use a mesma base de valores e período nos prazos e montantes. Sazonalidade e crescimento exigem cenários específicos.</p>
    </details>
   </div>
   <div className="ncg-results" aria-live="polite" aria-atomic="true">
    <div className="ncg-result"><span>NCG comercial estimada</span><strong>{result.valid?brl(result.ncg):'—'}</strong><small>Clientes + estoque − fornecedores</small></div>
    <div className="ncg-result ncg-primary"><span>Recursos adicionais estimados</span><strong>{result.valid&&result.additionalResources!==null?brl(result.additionalResources):'—'}</strong><small>Máximo entre zero e NCG + reserva − cobertura</small></div>
    <div className="ncg-result"><span>Ciclo financeiro</span><strong>{result.valid?`${num(result.cycleDays)} dias`:'—'}</strong><small>Recebimento + estoque − pagamento</small></div>
    {result.errors.calculation?<p role="alert" className="ncg-notice">Os valores excedem o limite numérico. Revise os campos.</p>:invalid.length>0?<p role="alert" className="ncg-notice">Revise os campos destacados: use números finitos, iguais ou maiores que zero.</p>:!baseReady?<p className="ncg-notice">Preencha os cinco primeiros campos para calcular a NCG. Campo vazio não significa zero.</p>:result.valid&&result.additionalResources===null?<p className="ncg-notice">Para estimar recursos adicionais, informe reserva e cobertura. Digite 0 explicitamente quando não houver.</p>:null}
    {result.valid&&<div className="ncg-breakdown"><span>Clientes <b>{brl(result.receivables)}</b></span><span>Estoque <b>{brl(result.inventory)}</b></span><span>Fornecedores <b>{brl(result.suppliers)}</b></span><small>{result.purchasesAssumed?'Premissa: compras iguais ao custo vendido.':'Compras mensais ajustadas manualmente.'}</small></div>}
    {result.valid&&result.ncg<0&&<p className="ncg-notice">NCG negativa: fornecedores financiam o ciclo comercial estimado. Isso não prova sobra de caixa total.</p>}
   </div>
  </div>
  <div className="ncg-cautions"><p><b>Não é um valor recomendado de empréstimo.</b> A cobertura não é apenas o saldo bancário nem toda a dívida da empresa. Inclua capital próprio e financiamentos que já sustentam este giro e permanecerão disponíveis no horizonte analisado, além de caixa livre adicional destinado a ele. Não abata automaticamente dívidas que financiaram imobilizado ou prejuízos, ou que vencem antes desse horizonte. Não conte o mesmo recurso duas vezes nem inclua financiamento ainda não contratado.</p><p>Estimativa simplificada, não substitui NCG contábil ou fluxo de caixa. Não inclui automaticamente impostos, salários, adiantamentos ou outras contas operacionais. Para serviços, projetos, produção longa ou sazonalidade, revise a adequação do modelo antes de usar o resultado.</p></div>
 </article>
}
