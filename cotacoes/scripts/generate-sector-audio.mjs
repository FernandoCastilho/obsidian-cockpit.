// Default is a read-only plan. Run --generate only after the research is approved.
import { readFile, writeFile, mkdir, mkdtemp, rm, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transcriptText } from '../src/sectorStudies/presentation.js'
const execute = promisify(execFile)
const digest = value => createHash('sha256').update(value).digest('hex')
const root = new URL('../', import.meta.url)
const output = new URL('public/audio/sectors/', root)
const manifestPath = new URL('manifest.json', output)
const studies = JSON.parse(await readFile(new URL('src/sectorStudies/studies.json', root), 'utf8'))
const generate = process.argv.includes('--generate')
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7)
const voice = process.env.SECTOR_TTS_VOICE || 'pt-BR-AntonioNeural'
const tts = process.env.EDGE_TTS_BIN || '/tmp/tic-tts-venv/bin/edge-tts'
let manifest = { version: 1, studies: {} }
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
let pending = 0, unchanged = 0, unapproved = 0
for (const study of studies) {
  const key = `${study.group}/${study.topicIndex}`
  if (only && only !== key) continue
  if (study.reviewStatus !== 'approved') { unapproved++; continue }
  if (!/^[a-z0-9-]+$/.test(study.group) || !Number.isInteger(study.topicIndex)) throw new Error(`Invalid study key ${key}`)
  const text = transcriptText(study.transcript)
  if (!text) throw new Error(`Empty transcript: ${key}`)
  const textSha256 = digest(text)
  const filename = `${study.group}-${study.topicIndex}.mp3`
  const target = new URL(filename, output)
  const old = manifest.studies[key]
  if (old?.textSha256 === textSha256 && old.voice === voice && old.durationSeconds > 0) {
    try { if (digest(await readFile(target)) === old.fileSha256) { unchanged++; continue } } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  pending++
  console.log(`${generate ? 'Generating' : 'Would generate'} ${key}: ${text.length} characters, ${voice}`)
  if (!generate) continue
  await mkdir(output, { recursive: true })
  const scratch = await mkdtemp(join(tmpdir(), 'sector-audio-'))
  try {
    const textPath = join(scratch, 'transcript.txt')
    const audioPath = join(scratch, filename)
    await writeFile(textPath, text)
    await execute(tts, ['--voice', voice, '--file', textPath, '--write-media', audioPath], { timeout: 300000 })
    const { stdout } = await execute('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath], { timeout: 30000 })
    const durationSeconds = Number(stdout.trim())
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error(`Invalid duration: ${key}`)
    await execute('ffmpeg', ['-v', 'error', '-xerror', '-i', audioPath, '-f', 'null', '-'], { timeout: 120000 })
    const bytes = await readFile(audioPath)
    if (bytes.length < 1000) throw new Error(`Audio too short: ${key}`)
    // Copy through a local temporary file; rename only after decode and metadata validation.
    const staged = new URL(`${filename}.tmp`, output)
    await writeFile(staged, bytes)
    await rename(staged, target)
    manifest.studies[key] = { src: `./audio/sectors/${filename}`, textSha256, fileSha256: digest(bytes), durationSeconds, bytes: bytes.length, voice, synthetic: true, generatedAt: new Date().toISOString(), validation: 'ffprobe duration and full ffmpeg decode; source: approved public study transcript' }
    const stagedManifest = new URL('manifest.json.tmp', output)
    await writeFile(stagedManifest, `${JSON.stringify(manifest, null, 2)}\n`)
    await rename(stagedManifest, manifestPath)
    console.log(`Validated ${key}: ${durationSeconds.toFixed(2)} s, ${bytes.length} bytes`)
  } finally { await rm(scratch, { recursive: true, force: true }) }
}
console.log(`${generate ? 'Generated' : 'Pending'} ${pending}; unchanged ${unchanged}; unapproved skipped ${unapproved}.`)
if (generate) console.log(`Manifest: ${fileURLToPath(manifestPath)}. Run node scripts/sync-sector-studies.mjs to attach only audio matching the current text.`)
