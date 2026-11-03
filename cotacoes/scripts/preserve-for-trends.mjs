import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RETAIN_FILES, loadPublishedFile, validatePublishedFile, createWeeklySnapshot } from './weekly-data.mjs'
// Atualizar Trends não dispara as demais fontes nem reverte seus dados publicados.
const retained = {}
for (const file of RETAIN_FILES) {
  const text = file === 'trends.json' ? await readFile(new URL('../public/trends.json', import.meta.url), 'utf8') : await loadPublishedFile(file)
  validatePublishedFile(file, text)
  retained[file] = text
}
for (const [file, text] of Object.entries(retained)) {
  const output = new URL('../public/' + file, import.meta.url)
  await mkdir(dirname(fileURLToPath(output)), { recursive: true })
  await writeFile(output, text, 'utf8')
}
await writeFile(process.argv[2], JSON.stringify(createWeeklySnapshot(retained)), 'utf8')
