// Barras horizontais com base em zero para comparar valores em R$ (custos, rendimentos). O vencedor/destaque usa a cor de ação.
export default function HBars({ rows, title }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  return (
    <div className="hbars" role="group" aria-label={title}>
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <span className="hbar-label">{r.label}</span>
          <span className="hbar-track" aria-hidden="true">
            <i className={r.strong ? 'strong' : ''} style={{ width: `${Math.max(2, (Math.abs(r.value) / max) * 100)}%` }} />
          </span>
          <b className="hbar-val">{r.text}</b>
        </div>
      ))}
    </div>
  )
}
