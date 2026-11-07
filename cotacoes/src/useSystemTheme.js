import { useSyncExternalStore } from 'react'
import { readTheme, subscribeTheme } from './systemTheme.js'

// Existing embeds also follow a manual choice, not only the OS preference.
export function useSystemTheme() {
  return useSyncExternalStore(subscribeTheme, readTheme, () => 'dark')
}
