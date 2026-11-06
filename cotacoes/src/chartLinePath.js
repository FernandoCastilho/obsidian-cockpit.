// Degraus são apenas geometria: não adicionam observações à série ou ao tooltip.
export function chartLinePath(points, x, y, key = 'v', stepped = false) {
  return points.map((point, i) => {
    const px = x(point.t).toFixed(1), py = y(point[key]).toFixed(1)
    if (!i) return `M${px},${py}`
    return stepped ? `H${px}V${py}` : `L${px},${py}`
  }).join('')
}
