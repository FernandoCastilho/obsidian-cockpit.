import { useEffect, useState } from 'react'
import { startVisiblePolling, DATA_POLL_MS } from './visiblePolling.js'

// Rechecks cached news without triggering collection or network requests.
export function useNewsClock() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => startVisiblePolling(() => setNow(Date.now()), DATA_POLL_MS), [])
  return now
}
