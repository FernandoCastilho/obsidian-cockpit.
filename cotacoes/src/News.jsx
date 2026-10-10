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

  const generated = data?.generatedAt && new Date(data.generatedAt)

  return (
    <section className="news">
      <div className="history-head">
        <h2>Notícias</h2>
      </div>
      {!data && !error && <p className="status">Carregando notícias…</p>}
      {error && <p className="status">Notícias indisponíveis no momento ({error}).</p>}
      {data && Object.keys(data.stale ?? {}).length > 0 && (
        <p className="status stale">
          Sem manchetes novas para {Object.keys(data.stale).join(', ')}; mantidas as da última coleta bem-sucedida.
        </p>
      )}
      {data && (
        <div className="charts">
          {CURRENCIES.map((c) => {
            const items = data.news?.[c.code] ?? []
            return (
              <article key={c.code} className="chart news-box" style={{ '--series': colors[c.code] }}>
                <header>
                  <h3>
                    <i className="swatch" /> {c.code}
                    <small>{c.name}</small>
                  </h3>
                </header>
                {items.length ? (
                  <ul className="news-bullets" tabIndex={0} aria-label={`Notícias de ${c.code}`}>
                    {items.map((n) => (
                      <li key={n.link}>
                        <a href={n.link} target="_blank" rel="noopener noreferrer" title={n.original ? `Original: ${n.original}` : undefined}>
                          {n.title}
                        </a>
                        <span className="meta">
                          {n.source} · {ago(n.t)}
                          {n.original && ' · traduzida do inglês'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="status">Nenhuma manchete encontrada.</p>
                )}
              </article>
            )
          })}
        </div>
      )}
      {generated && Date.now() - generated.getTime() > 3 * 3600e3 && (
        <p className="status stale">Atenção: as notícias foram coletadas há mais de 3 horas; a atualização automática pode ter parado.</p>
      )}
      {generated && (
        <p className="status">
          Atualizado às {generated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · a cada hora · Google
          Notícias, Valor Econômico e Investing.com. Manchetes em inglês são traduzidas automaticamente. As matérias pertencem às
          fontes.
        </p>
      )}
    </section>
  )
}
