import { useEffect, useState } from 'react'

const fmtDate = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR') : '')
const cell = (v, decimals = 2) =>
  v === null || v === undefined || v === ''
    ? '—'
    : typeof v === 'number'
      ? v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : String(v)

const col = (c) => (typeof c === 'string' ? { label: c } : c)

function Row({ r, cols }) {
  return (
    <tr>
      <th scope="row">{r.label}</th>
      {cols.map((c, i) => (
        <td key={i} className={c.strong ? 'strong' : undefined}>{cell(r.values?.[i], r.decimals)}</td>
      ))}
    </tr>
  )
}

function ProjTable({ t }) {
  const cols = t.columns.map(col)
  const sections = t.sections ?? [{ rows: t.rows ?? [] }]
  // cabeçalho em dois níveis quando as colunas têm "group" (ex.: 2026P → Atual | Anterior)
  const groups = []
  cols.forEach((c) => {
    const last = groups[groups.length - 1]
    if (last && c.group && last.name === c.group) last.span += 1
    else groups.push({ name: c.group ?? '', span: 1 })
  })
  const grouped = cols.some((c) => c.group)
  return (
    <article className={`chart${t.wide ? ' wide' : ''}`}>
      <header>
        <h3>
          {t.title}
          {t.unit && <small>{t.unit}</small>}
        </h3>
      </header>
      <div className="scroll">
        <table className="focus-table proj-table">
          <thead>
            {grouped && (
              <tr>
                <th />
                {groups.map((g, i) => <th key={i} colSpan={g.span} className={g.name ? 'group' : undefined}>{g.name}</th>)}
              </tr>
            )}
            <tr>
              <th />
              {cols.map((c, i) => <th key={i} className={c.strong ? 'strong' : undefined}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {sections.map((s, si) => [
              s.title && (
                <tr key={`s${si}`} className="section">
                  <th colSpan={cols.length + 1}>{s.title}</th>
                </tr>
              ),
              ...s.rows.map((r) => <Row key={`${si}-${r.label}`} r={r} cols={cols} />),
            ])}
          </tbody>
        </table>
      </div>
      {t.note && <p className="status">{t.note}</p>}
    </article>
  )
}

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

  const tables = Array.isArray(data?.tables) ? data.tables.filter((t) => t?.rows?.length || t?.sections?.length) : []
  if (!tables.length) return null

  return (
    <section className="projecoes">
      <div className="history-head">
        <h2>Projeções {data.source}</h2>
      </div>
      <div className="charts">
        {tables.map((t) => <ProjTable key={t.title} t={t} />)}
      </div>
      <p className="status">
        Projeções de terceiros{data.date ? `, de ${fmtDate(data.date)}` : ''}, sujeitas a revisão. Fonte: {data.source}. Não constituem recomendação.
      </p>
    </section>
  )
}
