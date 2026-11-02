import { useEffect, useRef, useState } from 'react'
import { TABLES, reconciliationPreview, recordKey } from './journal.js'
import { Icone } from './ui.jsx'
import './Conflitos.css'

const LABELS = { subcategoria_id: 'Categoria', tipo: 'Tipo', revisado: 'Revisado', pago: 'Pagamento', valor_mes: 'Valor do mês', descricao: 'Descrição', descricao_original: 'Descrição original', descricao_limpa: 'Descrição', valor: 'Valor', valor_padrao: 'Valor padrão', dia_vencimento: 'Dia do vencimento', data: 'Data', data_caixa: 'Data do caixa', pessoa_id: 'Pessoa', conta_id: 'Conta', forma_pagamento: 'Forma de pagamento', pagador: 'Pagador', ativa: 'Ativa', status: 'Situação', obs: 'Observações' }
const TIPOS = { receita: 'Receita', despesa: 'Despesa', transferencia: 'Transferência', pagto_fatura: 'Pagamento de fatura', investimento: 'Investimento', reembolso: 'Reembolso' }
const chave = (r) => recordKey(r.aba, r.id, r.periodo)
const descricao = (r) => {
  const h = TABLES[r.aba].headers
  return r.row[h.indexOf('descricao')] || r.row[h.indexOf('descricao_limpa')] || r.row[h.indexOf('descricao_original')] || r.id
}
const mostrar = (campo, valor, data) => {
  if (valor === '' || valor == null) return 'Não informado'
  if (['data', 'data_caixa'].includes(campo) && typeof valor === 'number') return new Date((valor - 25569) * 86400000).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  if (['valor', 'valor_mes', 'valor_padrao'].includes(campo)) return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (campo === 'subcategoria_id') return data.subcategorias.find((s) => s.id === valor)?.nome ?? String(valor)
  if (campo === 'tipo') return TIPOS[valor] ?? String(valor)
  if (campo === 'pago') return valor === 'Sim' ? 'Pago' : 'Não pago'
  return String(valor)
}

export default function Conflitos({ records, data, ocupado, erro, onFechar, onResolver, onAtualizar, planilhaUrl }) {
  const dialog = useRef(null)
  const titulo = useRef(null)
  const [selecionado, setSelecionado] = useState(() => records[0] ? chave(records[0]) : '')
  useEffect(() => {
    const anterior = document.activeElement
    const node = dialog.current
    node.showModal()
    titulo.current?.focus()
    return () => { if (node.open) node.close(); if (anterior?.isConnected) anterior.focus() }
  }, [])

  const r = records.find((x) => chave(x) === selecionado) ?? records[0]
  if (!r) return null
  let manter = null, origem = null
  try { manter = reconciliationPreview(r, 'keep_app'); origem = reconciliationPreview(r, 'use_source') } catch { /* Registro removido ou ambíguo: não oferecer gravação. */ }
  const externas = r.sourceRow ? TABLES[r.aba].headers.flatMap((campo, i) => r.base[i] === r.sourceRow[i] ? [] : [{ campo, antes: r.base[i], agora: r.sourceRow[i] }]) : []
  const diferencas = manter ? TABLES[r.aba].headers.flatMap((campo, i) => manter[i] === origem[i] ? [] : [{ campo, manter: manter[i], origem: origem[i] }]) : []

  return (
    <dialog className="folha recon-dialog" ref={dialog} aria-labelledby="recon-titulo" aria-describedby="recon-explica" aria-busy={ocupado}
      onCancel={(e) => { e.preventDefault(); if (!ocupado) onFechar() }}
      onClick={(e) => { if (e.target === e.currentTarget && !ocupado) { const box = e.currentTarget.getBoundingClientRect(); if (e.clientY < box.top || e.clientX < box.left || e.clientX > box.right) onFechar() } }}>
      <header className="folha-topo">
        <div><h2 id="recon-titulo" ref={titulo} tabIndex={-1}>Revisar alteração</h2><small>Escolha os valores que deseja manter.</small></div>
        <button className="icone recon-fechar" disabled={ocupado} onClick={onFechar} aria-label="Fechar revisão"><Icone nome="fechar" /></button>
      </header>
      <div className="recon-corpo">
        {records.length > 1 && <ul className="recon-registros" aria-label="Registros para revisar">{records.map((x) => <li key={chave(x)}><button type="button" disabled={ocupado} aria-pressed={chave(x) === chave(r)} onClick={() => setSelecionado(chave(x))}>{descricao(x)} <small>{x.id}</small></button></li>)}</ul>}
        <p className="recon-nome"><b>{descricao(r)}</b><small>{r.id}{r.aba === 'ContasFixas' && ' · ' + r.periodo.split('-').reverse().join('/')}</small></p>
        <p id="recon-explica">O histórico será preservado. As duas opções incorporam os demais campos da planilha.</p>
        {externas.length > 0 && <section aria-label="O que mudou na planilha"><p><b>O que mudou na planilha</b></p><dl className="recon-compara recon-externas">{externas.map(({ campo, antes, agora }) => <div key={campo}><dt>{LABELS[campo] ?? campo.replaceAll('_', ' ')}</dt><dd><span>Antes</span><b>{mostrar(campo, antes, data)}</b></dd><dd><span>Agora</span><b>{mostrar(campo, agora, data)}</b></dd></div>)}</dl></section>}
        {manter ? (diferencas.length ? <dl className="recon-compara">{diferencas.map(({ campo, manter: a, origem: b }) => <div key={campo}>
          <dt>{LABELS[campo] ?? campo.replaceAll('_', ' ')}</dt>
          <dd><span>Manter valores do Caixa</span><b>{mostrar(campo, a, data)}</b></dd>
          <dd><span>Usar valores da planilha</span><b>{mostrar(campo, b, data)}</b></dd>
        </div>)}</dl> : <p>Os valores das duas opções são iguais. Confirme a atualização do registro para continuar.</p>) : <p className="erro">Não há um registro único disponível na planilha para essa escolha. Corrija a planilha e atualize os dados.</p>}
        {erro && <p className="erro" role="alert">{erro}</p>}
      </div>
      <footer className="recon-acoes">
        {manter ? <>
          {diferencas.length > 0 && <button className="secundario" disabled={ocupado} onClick={() => onResolver(r, 'keep_app')}>Manter valores do Caixa</button>}
          <button className="secundario" disabled={ocupado} onClick={() => onResolver(r, 'use_source')}>{diferencas.length ? 'Usar valores da planilha' : 'Confirmar valores da planilha'}</button>
        </> : <><button className="secundario" disabled={ocupado} onClick={onAtualizar}>Atualizar dados</button><a href={planilhaUrl} target="_blank" rel="noreferrer">Ver planilha</a></>}
        {ocupado && <p role="status">Salvando…</p>}
      </footer>
    </dialog>
  )
}
