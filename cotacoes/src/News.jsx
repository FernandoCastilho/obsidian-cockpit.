import { useEffect, useState } from 'react'
import { CURRENCIES } from './useQuotes.js'

const ago = (t) => {
  const min = Math.max(0, Math.round((Date.now() - t) / 60000))
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  return new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function News({ colors }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(CURRENCIES[0].code)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`./news.json?t=${Math.floor(Date.now() / 600000)}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => e.name !== 'AbortError' && setError(e.message))
    return () => ctrl.abort()
  }, [])

  const items = data?.news?.[tab] ?? []
  const generated = data?.generatedAt && new Date(data.generatedAt)

  return (
    <section className="news">
      <div className="history-head">
        <h2>Notícias</h2>
        <div className="seg" role="tablist" aria-label="Moeda das notícias">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              role="tab"
              id={`tab-${c.code}`}
              aria-selected={tab === c.code}
              aria-controls="news-panel"
              style={{ '--series': colors[c.code] }}
              onClick={() => setTab(c.code)}
            >
              <i className="swatch" /> {c.code}
            </button>
          ))}
        </div>
      </div>
      <div id="news-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="news-list">
        {!data && !error && <p className="status">Carregando notícias…</p>}
        {error && <p className="status">Notícias indisponíveis no momento ({error}).</p>}
        {data && !items.length && <p className="status">Nenhuma manchete encontrada para esta moeda.</p>}
        <ul>
          {items.map((n) => (
            <li key={n.link}>
              <a href={n.link} target="_blank" rel="noopener noreferrer">
                {n.title}
              </a>
              <span className="meta">
                {n.source} · {ago(n.t)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {generated && (
        <p className="status">
          Atualizado às {generated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · a cada hora · Google
          Notícias, Valor Econômico e Investing.com. As matérias pertencem às fontes.
        </p>
      )}
    </section>
  )
}
