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

// Gestos: um clique simples passa para a página; arrastar risca. Com Ctrl o gesto vira retângulo; com Shift, seta (Ctrl vale mais se os dois estiverem apertados).
export const DRAG_PX = 5
export const kindOf = ({ ctrlKey, shiftKey } = {}) => (ctrlKey ? 'rect' : shiftKey ? 'arrow' : 'free')
export const isDrag = (a, b, limit = DRAG_PX) => Math.hypot(b.x - a.x, b.y - a.y) > limit
// Retângulo e seta ficam inteiros enquanto o botão está apertado e se apagam aos poucos depois de soltar.
export const shapeAlpha = (now, releasedAt) => (releasedAt == null ? 1 : lifeOf(now - releasedAt))
// Duas pontas da cabeça da seta, de comprimento `len`, abertas a `spread` rad da linha a→b.
export function arrowHead(a, b, len = 16, spread = Math.PI / 7) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  return [ang + Math.PI - spread, ang + Math.PI + spread].map((t) => ({ x: b.x + len * Math.cos(t), y: b.y + len * Math.sin(t) }))
}
