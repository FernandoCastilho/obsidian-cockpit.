import { useEffect, useState } from 'react'
import { chaveInsight, sortearInsight } from './insightAprender.js'

// Linha "💡 Aprender" no Mercado: muda a cada entrada no app e a cada atualização manual das cotações (evento quotes-refresh).
const KEY = 'insight-aprender-ultimo'
const ultimo = () => { try { return sessionStorage.getItem(KEY) ?? '' } catch { return '' } }
const novo = () => { const i = sortearInsight(Math.random, ultimo()); try { sessionStorage.setItem(KEY, chaveInsight(i)) } catch { /* sem armazenamento */ } return i }

export default function InsightAprender({ goto }) {
  const [i, setI] = useState(novo)
  useEffect(() => {
    const trocar = () => setI(novo())
    window.addEventListener('quotes-refresh', trocar)
    return () => window.removeEventListener('quotes-refresh', trocar)
  }, [])
  if (!i) return null
  return (
    <p className="insight-aprender" aria-live="polite">
      <span aria-hidden="true">💡</span>
      <span><b>{i.nome}</b> · <i>{i.tipo}:</i> {i.texto}</span>
      {goto && <button type="button" className="linklike" onClick={() => goto('aprender', i.id)}>Ver em Aprender ›</button>}
    </p>
  )
}
