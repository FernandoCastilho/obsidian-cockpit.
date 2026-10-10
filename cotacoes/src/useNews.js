import { useEffect, useState } from 'react'

// news.json é gerado a cada hora no deploy (manchetes por moeda, traduzidas).
export function useNews() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`./news.json?t=${Math.floor(Date.now() / 600000)}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => e.name !== 'AbortError' && setError(e.message))
    return () => ctrl.abort()
  }, [])
  return { data, error }
}
