// Presentation-only filtering: dates and holiday rules remain in holidays.js.
export function groupHolidayRows(rows, place = 'all') {
  const selected = rows.filter((row) => place === 'all' || row.places.includes(place))
    .sort((a, b) => a.d.localeCompare(b.d) || a.name.localeCompare(b.name))
  const groups = []
  for (const row of selected) {
    const month = row.d.slice(0, 7)
    if (groups.at(-1)?.month !== month) groups.push({ month, rows: [] })
    groups.at(-1).rows.push(row)
  }
  return groups
}
