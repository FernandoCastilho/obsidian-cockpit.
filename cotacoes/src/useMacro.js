import { useDataFile } from './useDataFile.js'

// A coleta é horária; revalidação compartilhada evita snapshots divergentes.
export function useMacro() { return useDataFile('macro.json') }
