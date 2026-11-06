import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { transcriptText } from '../src/sectorStudies/presentation.js'
import { CATALOGO_SETORIAL } from '../src/centralSetorial.js'
const directory = new URL('../../docs/sector-research/', import.meta.url)
const groupFiles = new Set(CATALOGO_SETORIAL.map(group => `${group.id}.json`))
const files = (await readdir(directory)).filter(file => groupFiles.has(file)).sort()
const approvedOnly = process.argv.includes('--approved-only')
let audioManifest = { studies: {} }
try { audioManifest = JSON.parse(await readFile(new URL('../public/audio/sectors/manifest.json', import.meta.url), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const digest = value => createHash('sha256').update(value).digest('hex')
const studies = []
const progress = []
const seen = new Set()
for (const file of files) {
  const records = JSON.parse(await readFile(new URL(file, directory), 'utf8'))
  if (!Array.isArray(records)) throw new Error(`${file}: expected an array of studies`)
  for (const study of records) {
    const key = `${study.group}/${study.topicIndex}`
    progress.push({ group: study.group, topicIndex: study.topicIndex, title: study.title, status: study.reviewStatus || 'pending-independent-review', sourceFile: file, sourceSha256: digest(JSON.stringify(study)) })
    if (approvedOnly && study.reviewStatus !== 'approved') continue
    const group = CATALOGO_SETORIAL.find(item => item.id === study.group)
    if (!group || !Number.isInteger(study.topicIndex) || group.topics[study.topicIndex] !== study.title) throw new Error(`${file}: unknown topic ${key} / ${study.title}`)
    if (key === 'tic/0') continue // Keep the approved TIC study unchanged.
    if (seen.has(key)) throw new Error(`Duplicate study ${key}`)
    for (const field of ['summary', 'sections', 'charts', 'sources', 'limitations', 'canvasQuestions']) if (!Array.isArray(study[field])) throw new Error(`${key}: missing ${field}`)
    if (!study.method || !study.transcript || !study.diagram?.nodes?.length || !Array.isArray(study.diagram.edges)) throw new Error(`${key}: missing method, transcript or diagram`)
    const nodeIds = new Set(study.diagram.nodes.map(node => node.id))
    if (nodeIds.size !== study.diagram.nodes.length || study.diagram.edges.some(edge => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) throw new Error(`${key}: invalid diagram references`)
    for (const chart of study.charts) if (!chart.years?.length || !chart.series?.length || chart.series.some(series => series.values.length !== chart.years.length || series.values.some(value => !Number.isFinite(value)))) throw new Error(`${key}: invalid chart ${chart.id}`)
    seen.add(key)
    const record = { ...study }
    delete record.audio
    const audio = audioManifest.studies[key]
    if (audio && audio.textSha256 === digest(transcriptText(study.transcript)) && audio.durationSeconds > 0) {
      const expectedPath = `./audio/sectors/${study.group}-${study.topicIndex}.mp3`
      if (audio.src !== expectedPath) throw new Error(`${key}: unexpected audio path`)
      try {
        if (digest(await readFile(new URL(`../public/${expectedPath.slice(2)}`, import.meta.url))) === audio.fileSha256) record.audio = audio
      } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    studies.push(record)
  }
}
await writeFile(new URL('../src/sectorStudies/studies.json', import.meta.url), `${JSON.stringify(studies, null, 2)}\n`)
await writeFile(new URL('progress.json', directory), `${JSON.stringify({ totalTarget: 66, existingTicPreserved: true, prepared: progress.length, approved: progress.filter(item => item.status === 'approved').length, studies: progress }, null, 2)}\n`)
console.log(`Integrated ${studies.length} researched studies from ${files.length} files; approved TIC preserved.`)
