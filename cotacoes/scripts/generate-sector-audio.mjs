// Default is a read-only plan. Run --generate only after the research is approved.
// Run one generator process at a time; --jobs=3 parallelizes synthesis safely within it.
import * as fs from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { transcriptText } from '../src/sectorStudies/presentation.js'

const executeCommand = promisify(execFile)
const digest = value => createHash('sha256').update(value).digest('hex')

function synthesisFailure(error) {
  // Never log provider stderr or URLs: websocket URLs can contain access tokens.
  const detail = `${error?.message || ''}\n${error?.stderr || ''}`.replace(/(?:https?|wss?):\/\/[^\s'"<>]+/gi, '[URL]')
  if (/\b(?:401|403)\b|certificate|\bssl\b|\btls\b|access[ -]?denied|permission[ -]?denied|forbidden|unauthori[sz]ed|CERT_|WRONG_VERSION_NUMBER/i.test(detail)) {
    return { retry: false, reason: 'authorization, access, or TLS failure (not retried)' }
  }
  const status = detail.match(/\b(429|502|503)\b/)
  if (status) return { retry: true, reason: `HTTP ${status[1]}` }
  if (['ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(error?.code) || (error?.killed === true && error?.signal === 'SIGTERM') || /\b(?:TimeoutError|timed out|timeout)\b/i.test(detail)) {
    return { retry: true, reason: 'timeout' }
  }
  return { retry: false, reason: 'synthesis command failed (provider details withheld)' }
}

export async function synthesizeWithRetry({ execute, tts, args, key, log = console.log, wait = sleep }) {
  const backoff = [10000, 30000]
  for (let attempt = 0; ; attempt++) {
    try { return await execute(tts, args, { timeout: 300000 }) } catch (error) {
      const failure = synthesisFailure(error)
      if (!failure.retry || attempt >= backoff.length) throw new Error(`Audio synthesis failed for ${key}: ${failure.reason}; ${attempt + 1} attempt(s).`)
      log(`Retrying ${key} after ${failure.reason} in ${backoff[attempt] / 1000} s (${attempt + 2}/3).`)
      await wait(backoff[attempt])
    }
  }
}

export function parseJobs(args) {
  const options = args.filter(arg => arg === '--jobs' || arg.startsWith('--jobs='))
  if (!options.length) return 1
  const value = options[0].slice('--jobs='.length)
  if (options.length !== 1 || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('Use --jobs=<positive integer>, for example --jobs=3.')
  }
  return Number(value)
}

// Stop claiming new work after a failure, but drain active jobs (including commits)
// before returning the error. No background writes survive the returned promise.
export async function runBounded(items, jobs, worker) {
  if (!Number.isSafeInteger(jobs) || jobs < 1) throw new Error('Invalid worker count')
  let next = 0
  let failed = false
  let failure
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, async () => {
    while (!failed && next < items.length) {
      const index = next++
      try { await worker(items[index], index) } catch (error) { if (!failed) { failed = true; failure = error } }
    }
  }))
  if (failed) throw failure
}

function createAudioCommitter({ output, manifestPath, initialManifest, io }) {
  let manifest = initialManifest
  let queue = Promise.resolve()
  return (job, bytes, entry) => {
    // Both the read/merge of metadata and the entire disk commit are serialized.
    // Unique, same-directory staging files prevent shared .tmp collisions and
    // ensure each rename is atomic. Failed commits do not advance memory state.
    queue = queue.then(async () => {
      const suffix = `${process.pid}.${randomUUID()}.tmp`
      const stagedAudio = new URL(`${job.filename}.${suffix}`, output)
      const stagedManifest = new URL(`manifest.json.${suffix}`, output)
      try {
        const updated = { ...manifest, studies: { ...manifest.studies, [job.key]: entry } }
        await io.writeFile(stagedAudio, bytes, { flag: 'wx' })
        await io.writeFile(stagedManifest, `${JSON.stringify(updated, null, 2)}\n`, { flag: 'wx' })
        await io.rename(stagedAudio, job.target)
        await io.rename(stagedManifest, manifestPath)
        manifest = updated
      } finally {
        await Promise.all([stagedAudio, stagedManifest].map(path => io.rm(path, { force: true })))
      }
    })
    return queue
  }
}

// Dependency injection keeps concurrency/validation tests local and network-free.
export async function generateSectorAudio({
  root = new URL('../', import.meta.url), args = process.argv.slice(2),
  env = process.env, execute = executeCommand, io = fs, log = console.log, wait = sleep,
} = {}) {
  const jobs = parseJobs(args)
  const output = new URL('public/audio/sectors/', root)
  const manifestPath = new URL('manifest.json', output)
  const studies = JSON.parse(await io.readFile(new URL('src/sectorStudies/studies.json', root), 'utf8'))
  const generate = args.includes('--generate')
  const only = args.find(arg => arg.startsWith('--only='))?.slice(7)
  const voice = env.SECTOR_TTS_VOICE || 'pt-BR-AntonioNeural'
  const tts = env.EDGE_TTS_BIN || '/tmp/tic-tts-venv/bin/edge-tts'
  let manifest = { version: 1, studies: {} }
  try { manifest = JSON.parse(await io.readFile(manifestPath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  let unchanged = 0, unapproved = 0
  const pending = []
  const seen = new Set()
  for (const study of studies) {
    const key = `${study.group}/${study.topicIndex}`
    if (only && only !== key) continue
    if (study.reviewStatus !== 'approved') { unapproved++; continue }
    if (!/^[a-z0-9-]+$/.test(study.group) || !Number.isInteger(study.topicIndex)) throw new Error(`Invalid study key ${key}`)
    if (seen.has(key)) throw new Error(`Duplicate study key ${key}`)
    seen.add(key)
    const text = transcriptText(study.transcript)
    if (!text) throw new Error(`Empty transcript: ${key}`)
    const textSha256 = digest(text)
    const filename = `${study.group}-${study.topicIndex}.mp3`
    const target = new URL(filename, output)
    const old = manifest.studies[key]
    if (old?.textSha256 === textSha256 && old.voice === voice && Number.isFinite(old.durationSeconds) && old.durationSeconds > 0) {
      try { if (digest(await io.readFile(target)) === old.fileSha256) { unchanged++; continue } } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    pending.push({ key, text, textSha256, filename, target })
    if (!generate) log(`Would generate ${key}: ${text.length} characters, ${voice}`)
  }
  if (generate && pending.length) {
    await io.mkdir(output, { recursive: true })
    const commit = createAudioCommitter({ output, manifestPath, initialManifest: manifest, io })
    await runBounded(pending, jobs, async job => {
      const { key, text, textSha256, filename } = job
      log(`Generating ${key}: ${text.length} characters, ${voice}`)
      const scratch = await io.mkdtemp(join(tmpdir(), 'sector-audio-'))
      try {
        const textPath = join(scratch, 'transcript.txt')
        const audioPath = join(scratch, filename)
        await io.writeFile(textPath, text)
        await synthesizeWithRetry({ execute, tts, args: ['--voice', voice, '--file', textPath, '--write-media', audioPath], key, log, wait })
        const { stdout } = await execute('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath], { timeout: 30000 })
        const durationSeconds = Number(stdout.trim())
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error(`Invalid duration: ${key}`)
        await execute('ffmpeg', ['-v', 'error', '-xerror', '-i', audioPath, '-f', 'null', '-'], { timeout: 120000 })
        const bytes = await io.readFile(audioPath)
        if (bytes.length < 1000) throw new Error(`Audio too short: ${key}`)
        await commit(job, bytes, { src: `./audio/sectors/${filename}`, textSha256, fileSha256: digest(bytes), durationSeconds, bytes: bytes.length, voice, synthetic: true, generatedAt: new Date().toISOString(), validation: 'ffprobe duration and full ffmpeg decode; source: approved public study transcript' })
        log(`Validated ${key}: ${durationSeconds.toFixed(2)} s, ${bytes.length} bytes`)
      } finally { await io.rm(scratch, { recursive: true, force: true }) }
    })
  }
  log(`${generate ? 'Generated' : 'Pending'} ${pending.length}; unchanged ${unchanged}; unapproved skipped ${unapproved}.`)
  if (generate) log(`Manifest: ${fileURLToPath(manifestPath)}. Run node scripts/sync-sector-studies.mjs to attach only audio matching the current text.`)
  return { pending: pending.length, unchanged, unapproved, jobs }
}

// Importing helpers in tests must never start synthesis or touch the real output.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await generateSectorAudio()
}
