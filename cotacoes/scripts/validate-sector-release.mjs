import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { transcriptText } from '../src/sectorStudies/presentation.js'
const studies = JSON.parse(await readFile(new URL('../src/sectorStudies/studies.json', import.meta.url), 'utf8'))
const requireAudio = process.argv.includes('--require-audio')
const hash = value => createHash('sha256').update(value).digest('hex')
const issues = []
for (const study of studies) {
  const key = `${study.group}/${study.topicIndex}`
  if (study.reviewStatus !== 'approved') issues.push(`${key}: documentary review not approved`)
  if (requireAudio && !study.audio?.src) issues.push(`${key}: audio missing`)
  if (study.audio?.src) {
    const expected = `./audio/sectors/${study.group}-${study.topicIndex}.mp3`
    if (study.audio.src !== expected || study.audio.textSha256 !== hash(transcriptText(study.transcript))) issues.push(`${key}: audio/transcript mismatch`)
    else {
      try { if (hash(await readFile(new URL(`../public/${expected.slice(2)}`, import.meta.url))) !== study.audio.fileSha256) issues.push(`${key}: audio file hash mismatch`) }
      catch { issues.push(`${key}: audio file unavailable`) }
    }
  }
}
if (issues.length) throw new Error(`Sector publication blocked:\n${issues.join('\n')}`)
console.log(`Sector release gate passed: ${studies.length} approved studies; original TIC unchanged.`)
