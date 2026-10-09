import { useEffect, useState } from 'react'

// macro.json é gerado a cada hora pelo GitHub Actions (CDI, Selic, Focus, PTAX do Banco Central).
export function useMacro() {
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`./macro.json?t=${Math.floor(Date.now() / 600000)}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => e.name !== 'AbortError' && setState({ status: 'error', error: e.message }))
    return () => ctrl.abort()
  }, [])
  return state
}
