import { useEffect, useState } from 'react'

const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '')
const cell = (v) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'number' ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v))

// Projeções de terceiros (ex.: Itaú BBA) lidas de projecoes.json, em tabelas de qualquer formato.
export default function Projecoes() {
  const [data, setData] = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`./projecoes.json?t=${Math.floor(Date.now() / 600000)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  const tables = Array.isArray(data?.tables) ? data.tables.filter((t) => t?.rows?.length) : []
  if (!tables.length) return null

  return (
    <section className="projecoes">
      <div className="history-head">
        <h2>Projeções {data.source}</h2>
      </div>
      <div className="charts">
        {tables.map((t) => (
          <article key={t.title} className="chart">
            <header>
              <h3>
                {t.title}
                {t.unit && <small>{t.unit}</small>}
              </h3>
            </header>
            <div className="scroll">
              <table className="focus-table">
                <thead>
                  <tr>
                    <th />
                    {t.columns.map((c) => <th key={c}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      {t.columns.map((c, i) => <td key={c}>{cell(r.values?.[i])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {t.note && <p className="status">{t.note}</p>}
          </article>
        ))}
      </div>
      <p className="status">
        Projeções de terceiros{data.date ? `, de ${fmtDate(data.date)}` : ''}, sujeitas a revisão. Fonte: {data.source}. Não constituem recomendação.
      </p>
    </section>
  )
}
