import { useSyncExternalStore } from 'react'
import { readSystemTheme, subscribeSystemTheme } from './systemTheme.js'

export function useSystemTheme() {
  return useSyncExternalStore(subscribeSystemTheme, readSystemTheme, () => 'dark')
}
