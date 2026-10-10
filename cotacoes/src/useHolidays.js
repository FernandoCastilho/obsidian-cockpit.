import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildCn } from './holidays.js'

const KEY = 'cotacoes-pracas'
export const DEFAULT_PRACAS = ['BR', 'NY', 'CN']
const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return Array.isArray(v) && v.length ? v : DEFAULT_PRACAS
  } catch {
    return DEFAULT_PRACAS
  }
}

// feriados.json (China, dados oficiais) é gerado a cada hora no deploy; as demais praças são calculadas no navegador.
// As praças escolhidas ficam guardadas só neste navegador.
export function useHolidays() {
  const [file, setFile] = useState(null)
  const [pracas, setPracasState] = useState(read)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`./feriados.json?t=${Math.floor(Date.now() / 600000)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setFile)
      .catch(() => {})
    return () => ctrl.abort()
  }, [])
  const setPracas = useCallback((next) => {
    setPracasState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* sem armazenamento: vale só nesta sessão */
    }
  }, [])
  const ctx = useMemo(() => ({ cn: buildCn(file) }), [file])
  return { ctx, pracas, setPracas, loaded: !!file }
}
