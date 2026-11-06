import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RETAIN_FILES, loadPublishedFile, validatePublishedFile, createWeeklySnapshot } from './weekly-data.mjs'
const saveFile = async (file, text) => {
  const output = new URL('../public/' + file, import.meta.url)
  await mkdir(dirname(fileURLToPath(output)), { recursive: true })
  await writeFile(output, text, 'utf8')
}

// Valida todos os downloads antes de escrever. Falha de outra base aborta este deploy.
export async function preserveForTrends({ load = loadPublishedFile, readTrends = () => readFile(new URL('../public/trends.json', import.meta.url), 'utf8'), save = saveFile } = {}) {
  const retained = {}
  for (const file of RETAIN_FILES) {
    const text = file === 'trends.json' ? await readTrends() : await load(file)
    validatePublishedFile(file, text)
    retained[file] = text
  }
  for (const [file, text] of Object.entries(retained)) await save(file, text)
  return retained
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Informe o caminho do snapshot de preservação de Trends')
  const retained = await preserveForTrends()
  await writeFile(process.argv[2], JSON.stringify(createWeeklySnapshot(retained)), 'utf8')
}
