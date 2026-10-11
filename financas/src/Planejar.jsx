import { useState } from 'react'
import Orcamento from './Orcamento.jsx'
import Anual from './Anual.jsx'
import Vencimentos from './Vencimentos.jsx'
import Fluxo from './Fluxo.jsx'

const SECOES = [['orc', 'Orçamento'], ['venc', 'Vencimentos'], ['fluxo', 'Fluxo'], ['ano', 'Anual']]

export default function Planejar({ data, month, pessoa, secao, onSecao }) {
  return (
    <>
      <div className="seg" role="tablist" aria-label="Planejar">
        {SECOES.map(([id, nome]) => (
          <button key={id} role="tab" aria-selected={secao === id} className={secao === id ? 'on' : ''} onClick={() => onSecao(id)}>{nome}</button>
        ))}
      </div>
      {secao === 'orc' && <Orcamento data={data} month={month} pessoa={pessoa} />}
      {secao === 'venc' && <Vencimentos data={data} pessoa={pessoa} />}
      {secao === 'fluxo' && <Fluxo data={data} pessoa={pessoa} />}
      {secao === 'ano' && <Anual data={data} year={Number(month.slice(0, 4))} pessoa={pessoa} />}
    </>
  )
}
export const usaMes = (secao) => secao === 'orc' || secao === 'ano'
