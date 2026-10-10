import { useMemo, useState } from 'react'
import { CURRENCIES } from './useQuotes.js'
import { useNews } from './useNews.js'
import { buildFeed } from './feed.js'

const stamp = (t) => {
  if (!t) return '—'
  const d = new Date(t)
  const today = d.toDateString() === new Date().toDateString()
  return today ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const Tickers = ({ codes, colors }) =>
  codes.map((c) => (
    <b key={c} className="tk" style={{ '--tk': colors[c] }}>
      {c}
    </b>
  ))

export default function News({ colors }) {
  const { data, error } = useNews()
  const [filter, setFilter] = useState('ALL')
  const all = useMemo(() => buildFeed(data?.news, 'ALL', 60), [data])
  const feed = useMemo(() => buildFeed(data?.news, filter, 60), [data, filter])
  const strip = all.slice(0, 14)
  const generated = data?.generatedAt && new Date(data.generatedAt)
  const seconds = Math.max(40, strip.length * 8)

  return (
    <section className="news">
      <div className="history-head">
        <h2>Notícias</h2>
      </div>
      {!data && !error && <p className="status">Carregando notícias…</p>}
      {error && <p className="status">Notícias indisponíveis no momento ({error}).</p>}
      {data && Object.keys(data.stale ?? {}).length > 0 && (
        <p className="status stale">Sem manchetes novas para {Object.keys(data.stale).join(', ')}; mantidas as da última coleta bem-sucedida.</p>
      )}
      {strip.length > 0 && (
        <div className="wire" role="region" aria-label="Manchetes em rolagem (pausa ao passar o mouse)">
          <div className="wire-track" style={{ animationDuration: `${seconds}s` }}>
            {[0, 1].map((k) => (
              <span key={k} className="wire-set" aria-hidden={k === 1 ? 'true' : undefined}>
                {strip.map((n) => (
                  <a key={n.link} href={n.link} target="_blank" rel="noopener noreferrer" tabIndex={k === 1 ? -1 : undefined}>
                    <Tickers codes={n.codes} colors={colors} /> {n.title} <small>{stamp(n.t)}</small>
                  </a>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}
      {data && (
        <>
          <div className="seg feed-filter" role="group" aria-label="Filtrar por moeda">
            {['ALL', ...CURRENCIES.map((c) => c.code)].map((c) => (
              <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}>
                {c === 'ALL' ? 'Todas' : c}
              </button>
            ))}
          </div>
          {feed.length ? (
            <ul className="feed">
              {feed.map((n) => (
                <li key={n.link}>
                  <time className="feed-time">{stamp(n.t)}</time>
                  <span className="feed-tk">
                    <Tickers codes={n.codes} colors={colors} />
                  </span>
                  <span className="feed-body">
                    <a href={n.link} target="_blank" rel="noopener noreferrer" title={n.original ? `Original: ${n.original}` : undefined}>
                      {n.title}
                    </a>
                    <small className="muted">
                      {n.source}
                      {n.original && ' · traduzida do inglês'}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="status">Nenhuma manchete encontrada.</p>
          )}
        </>
      )}
      {generated && Date.now() - generated.getTime() > 3 * 3600e3 && (
        <p className="status stale">Atenção: as notícias foram coletadas há mais de 3 horas; a atualização automática pode ter parado.</p>
      )}
      {generated && (
        <p className="status">
          Atualizado às {generated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · a cada hora · Google Notícias, Valor Econômico e
          Investing.com. O ticker indica a moeda que a notícia tende a afetar. Manchetes em inglês são traduzidas automaticamente. As matérias pertencem às fontes.
        </p>
      )}
    </section>
  )
}
