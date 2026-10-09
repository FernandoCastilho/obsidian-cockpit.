// Bandeiras desenhadas em SVG: aparecem em qualquer sistema (o Windows não desenha emojis de bandeira).
const f = (n) => +n.toFixed(2)

function star(cx, cy, r, angle) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = angle + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.382 : r
    pts.push(`${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`)
  }
  return pts.join(' ')
}

const body = {
  USD: () => {
    const h = 20 / 13
    const stripes = Array.from({ length: 13 }, (_, i) => `<rect y="${f(i * h)}" width="30" height="${f(h)}" fill="${i % 2 ? '#fff' : '#b22234'}"/>`).join('')
    const dots = Array.from({ length: 12 }, (_, i) => `<circle cx="${f(1.8 + (i % 4) * 2.9)}" cy="${f(1.9 + Math.floor(i / 4) * 2.9)}" r=".6" fill="#fff"/>`).join('')
    return `${stripes}<rect width="12" height="${f(7 * h)}" fill="#3c3b6e"/>${dots}`
  },
  EUR: () => {
    const stars = Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6
      return `<polygon points="${star(15 + 6.5 * Math.sin(a), 10 - 6.5 * Math.cos(a), 1.3, -Math.PI / 2)}" fill="#fc0"/>`
    }).join('')
    return `<rect width="30" height="20" fill="#039"/>${stars}`
  },
  JPY: () => '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>',
  CNH: () => {
    const small = [[12, 2.4], [14.4, 4.8], [14.4, 8.4], [12, 10.8]]
      .map(([x, y]) => `<polygon points="${star(x, y, 1, Math.atan2(6 - y, 6 - x))}" fill="#ffde00"/>`)
      .join('')
    return `<rect width="30" height="20" fill="#de2910"/><polygon points="${star(6, 6, 3, -Math.PI / 2)}" fill="#ffde00"/>${small}`
  },
}

export const flagSvg = (code, attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" ${attrs}>${(body[code] ?? body.USD)()}<rect x=".25" y=".25" width="29.5" height="19.5" rx="1.5" fill="none" stroke="#0004" stroke-width=".5"/></svg>`

let cache
// PNGs (data URI) para colar no e-mail/Teams, onde SVG e emoji de bandeira não funcionam bem.
export function flagPngs() {
  cache ??= Promise.all(
    Object.keys(body).map(
      (code) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            const c = document.createElement('canvas')
            // tamanho natural pequeno (como um emoji): e-mail/Teams podem ignorar width/height e usar o natural
            c.width = 18
            c.height = 12
            c.getContext('2d').drawImage(img, 0, 0, 18, 12)
            resolve([code, c.toDataURL('image/png')])
          }
          img.onerror = () => resolve([code, null])
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(flagSvg(code, 'width="18" height="12"'))}`
        }),
    ),
  ).then(Object.fromEntries)
  return cache
}
