// Memória das calculadoras: guarda no navegador os últimos valores digitados (só neste aparelho) e permite voltar aos padrões.
import { useRef, useState } from 'react'

const PREFIX = 'calc:'
const sameKind = (a, b) => typeof a === typeof b && Array.isArray(a) === Array.isArray(b)

function read(key, initial) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return initial
    const v = JSON.parse(raw)
    return sameKind(v, initial) && (typeof v !== 'object' || Object.keys(initial).every((k) => k in v)) ? v : initial
  } catch {
    return initial
  }
}
function write(key, value, initial) {
  try {
    if (JSON.stringify(value) === JSON.stringify(initial)) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* armazenamento bloqueado: a calculadora segue funcionando sem memória */
  }
}

// const mem = useCalcMemory('giro'); const [value, setValue] = mem.use('value', '500.000,00')
// mem.dirty = algum campo difere do padrão; mem.reset() volta todos ao padrão e apaga o que foi guardado.
export function useCalcMemory(ns) {
  const reg = useRef(new Map())
  const [, bump] = useState(0)
  const use = (name, initial) => {
    const key = `${ns}.${name}`
    const [value, set] = useState(() => read(key, initial))
    reg.current.set(key, { initial, value, set })
    const setSaved = (next) => {
      const v = typeof next === 'function' ? next(value) : next
      set(v)
      write(key, v, initial)
    }
    return [value, setSaved]
  }
  return {
    use,
    get dirty() {
      return [...reg.current.values()].some((e) => JSON.stringify(e.value) !== JSON.stringify(e.initial))
    },
    reset() {
      for (const [key, e] of reg.current) {
        e.set(e.initial)
        write(key, e.initial, e.initial)
      }
      bump((n) => n + 1)
    },
  }
}
