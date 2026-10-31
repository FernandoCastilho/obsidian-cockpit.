// Laser pointer (estilo Excalidraw): o traço aparece enquanto o botão está pressionado e some aos poucos, mais fino e mais transparente com a idade.
export const DECAY_MS = 1500
export const MAX_WIDTH = 7
export const COLOR = '255,59,48'

// Fração de vida do ponto: 1 recém-criado, 0 no fim do tempo de apagamento.
export const lifeOf = (age) => Math.max(0, 1 - age / DECAY_MS)
// Largura e opacidade de um trecho com essa idade (fino e transparente ao envelhecer; nunca desaparece de repente).
export const styleOf = (age) => { const l = lifeOf(age); return { width: MAX_WIDTH * (0.3 + 0.7 * l), alpha: l } }
// Remove os pontos que já passaram do tempo; traços já soltos e vazios saem da lista (o que está sendo desenhado fica).
export function prune(strokes, now) {
  return strokes
    .map((s) => (s.drawing ? s : { ...s, points: s.points.filter((p) => now - p.t < DECAY_MS) }))
    .filter((s) => s.drawing || s.points.length > 1)
}
// Descarta pontos velhos de um traço em andamento (mantém o rastro curto, como o laser).
export const trim = (points, now) => points.filter((p) => now - p.t < DECAY_MS)
