import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { generateSectorAudio, parseJobs, runBounded, synthesizeWithRetry } from '../scripts/generate-sector-audio.mjs'
import { transcriptText } from '../src/sectorStudies/presentation.js'

const digest = value => createHash('sha256').update(value).digest('hex')
const voice = 'pt-BR-AntonioNeural'
const study = index => ({ group: 'test-sector', topicIndex: index, reviewStatus: 'approved', transcript: [`Texto aprovado ${index}.`, 'Segundo parágrafo.'] })

async function fixture(t, studies, manifest = { version: 1, studies: {} }) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'sector-audio-test-'))
  t.after(() => fs.rm(directory, { recursive: true, force: true }))
  const root = pathToFileURL(`${directory}/`)
  const output = new URL('public/audio/sectors/', root)
  const manifestPath = new URL('manifest.json', output)
  await fs.mkdir(new URL('src/sectorStudies/', root), { recursive: true })
  await fs.mkdir(output, { recursive: true })
  await fs.writeFile(new URL('src/sectorStudies/studies.json', root), JSON.stringify(studies))
  await fs.writeFile(manifestPath, JSON.stringify(manifest))
  return { root, output, manifestPath }
}

function mockExecutor({ duration = '123.456', failDecode = false, size = 2048 } = {}) {
  const calls = [], texts = new Map(), paths = []
  let active = 0, peak = 0
  return {
    calls, texts, paths, get peak() { return peak },
    async execute(command, args, options) {
      calls.push({ command, args, options })
      if (command === 'mock-tts') {
        active++; peak = Math.max(peak, active)
        const path = args[args.indexOf('--write-media') + 1]
        const textPath = args[args.indexOf('--file') + 1]
        paths.push(textPath)
        texts.set(basename(path), await fs.readFile(textPath, 'utf8'))
        await delay(basename(path).endsWith('-0.mp3') ? 12 : 2)
        await fs.writeFile(path, Buffer.alloc(size, basename(path)))
        active--
        return { stdout: '' }
      }
      if (command === 'ffprobe') return { stdout: `${duration}\n` }
      assert.equal(command, 'ffmpeg')
      if (failDecode) throw new Error('Mock full decode failed')
      return { stdout: '' }
    },
  }
}
const options = (f, mock, args = ['--generate', '--jobs=3']) => ({ root: f.root, env: { EDGE_TTS_BIN: 'mock-tts' }, execute: mock.execute, args, log() {} })
const exists = async path => fs.access(path).then(() => true, () => false)

test('jobs default to one and accept a strict positive integer', () => {
  assert.equal(parseJobs([]), 1)
  assert.equal(parseJobs(['--generate', '--jobs=3']), 3)
  for (const option of ['--jobs', '--jobs=', '--jobs=0', '--jobs=-1', '--jobs=1.5', '--jobs=NaN', '--jobs=Infinity', '--jobs=9007199254740992']) assert.throws(() => parseJobs([option]), /positive integer/)
  assert.throws(() => parseJobs(['--jobs=2', '--jobs=3']), /positive integer/)
})

for (const reason of ['503', '502', '429', 'TimeoutError']) test(`transient ${reason} retries twice with 10/30s backoff and redacts provider secrets`, async () => {
  let attempts = 0
  const waits = [], logs = []
  const providerError = new Error(`${reason}, message='Invalid response status', url='wss://example.invalid/connect?token=SECRET'`)
  const execute = async () => { attempts++; throw providerError }
  await assert.rejects(synthesizeWithRetry({ execute, tts: 'mock', args: [], key: 'test-sector/0', wait: async ms => waits.push(ms), log: text => logs.push(text) }), error => {
    assert.match(error.message, /3 attempt\(s\)/)
    assert.doesNotMatch(error.stack, /SECRET|wss:\/\/|example\.invalid|Invalid response status/)
    return true
  })
  assert.equal(attempts, 3)
  assert.deepEqual(waits, [10000, 30000])
  assert.doesNotMatch(logs.join('\n'), /SECRET|wss:\/\//)
})

for (const reason of ['403 Forbidden', 'TLS certificate error; HTTP 503', 'Permission denied', 'Unrecognized failure']) test(`${reason} is never retried`, async () => {
  let attempts = 0
  await assert.rejects(synthesizeWithRetry({ execute: async () => { attempts++; throw new Error(`${reason}; https://example.invalid/?token=SECRET`) }, tts: 'mock', args: [], key: 'test-sector/0', wait: async () => assert.fail('must not retry') }), error => {
    assert.doesNotMatch(error.stack, /SECRET|https:\/\//)
    return true
  })
  assert.equal(attempts, 1)
})

test('a successful transient retry returns the result without additional attempts', async () => {
  let attempts = 0
  const waits = []
  const result = await synthesizeWithRetry({ execute: async () => {
    if (++attempts === 1) throw Object.assign(new Error('command failed'), { killed: true, signal: 'SIGTERM' })
    return { stdout: 'done' }
  }, tts: 'mock', args: [], key: 'test-sector/0', wait: async ms => waits.push(ms), log() {} })
  assert.deepEqual(result, { stdout: 'done' })
  assert.equal(attempts, 2)
  assert.deepEqual(waits, [10000])
})

test('66 concurrent completions preserve every entry and serialize atomic manifest commits', async t => {
  const studies = Array.from({ length: 66 }, (_, i) => study(i))
  const preserved = { textSha256: 'old', custom: 'preserve' }
  const f = await fixture(t, studies, { version: 1, extra: 'keep', studies: { 'other/0': preserved } })
  const mock = mockExecutor()
  let writing = 0, maxWriting = 0
  const stages = new Set(), snapshots = []
  const io = {
    ...fs,
    async writeFile(path, bytes, opts) {
      assert.notEqual(String(path), String(f.manifestPath), 'never write directly to the live manifest')
      if (String(path).includes('/manifest.json.')) {
        assert.equal(opts.flag, 'wx')
        writing++; maxWriting = Math.max(maxWriting, writing)
        assert.ok(!stages.has(String(path)), 'each commit has a unique staging path')
        stages.add(String(path))
        await delay(1)
      }
      return fs.writeFile(path, bytes, opts)
    },
    async rename(from, to) {
      if (String(to) === String(f.manifestPath)) {
        const before = JSON.parse(await fs.readFile(to, 'utf8'))
        const staged = JSON.parse(await fs.readFile(from, 'utf8'))
        assert.equal(Object.keys(staged.studies).length, Object.keys(before.studies).length + 1)
        for (const [key, entry] of Object.entries(before.studies)) assert.deepEqual(staged.studies[key], entry)
        await delay(1)
        await fs.rename(from, to)
        snapshots.push(JSON.parse(await fs.readFile(to, 'utf8')))
        writing--
      } else await fs.rename(from, to)
    },
  }
  const result = await generateSectorAudio({ ...options(f, mock), io })
  assert.deepEqual(result, { pending: 66, unchanged: 0, unapproved: 0, jobs: 3 })
  assert.equal(mock.peak, 3)
  assert.equal(maxWriting, 1)
  assert.equal(stages.size, 66)
  assert.equal(snapshots.length, 66)
  const manifest = JSON.parse(await fs.readFile(f.manifestPath, 'utf8'))
  assert.equal(manifest.extra, 'keep')
  assert.deepEqual(manifest.studies['other/0'], preserved)
  assert.equal(Object.keys(manifest.studies).length, 67)
  for (const item of studies) {
    const key = `${item.group}/${item.topicIndex}`
    const filename = `${item.group}-${item.topicIndex}.mp3`
    const entry = manifest.studies[key]
    assert.equal(mock.texts.get(filename), transcriptText(item.transcript))
    assert.equal(entry.textSha256, digest(transcriptText(item.transcript)))
    assert.equal(entry.fileSha256, digest(await fs.readFile(new URL(filename, f.output))))
    assert.equal(entry.durationSeconds, 123.456)
    assert.equal(entry.voice, voice)
    assert.equal(entry.bytes, 2048)
  }
  for (const { command, args, options: executionOptions } of mock.calls) {
    if (command === 'mock-tts') {
      assert.deepEqual(args.filter((_, i) => ![3, 5].includes(i)), ['--voice', voice, '--file', '--write-media'])
      assert.equal(executionOptions.timeout, 300000)
    } else if (command === 'ffmpeg') assert.deepEqual(args.filter((_, i) => i !== 4), ['-v', 'error', '-xerror', '-i', '-f', 'null', '-'])
  }
  assert.equal(mock.calls.filter(call => call.command === 'ffprobe').length, 66)
  assert.equal(mock.calls.filter(call => call.command === 'ffmpeg').length, 66)
  assert.ok((await fs.readdir(f.output)).every(name => !name.endsWith('.tmp')))
  for (const path of mock.paths) assert.equal(await exists(path), false)
  const resumed = mockExecutor()
  assert.deepEqual(await generateSectorAudio(options(f, resumed)), { pending: 0, unchanged: 66, unapproved: 0, jobs: 3 })
  assert.equal(resumed.calls.length, 0)
})

test('read-only plan and --only remain read-only and selective', async t => {
  const f = await fixture(t, [study(0), study(1), { ...study(2), reviewStatus: 'pending' }])
  const before = await fs.readFile(f.manifestPath, 'utf8')
  const mock = mockExecutor()
  const result = await generateSectorAudio(options(f, mock, ['--jobs=3', '--only=test-sector/1']))
  assert.deepEqual(result, { pending: 1, unchanged: 0, unapproved: 0, jobs: 3 })
  assert.equal(mock.calls.length, 0)
  assert.equal(await fs.readFile(f.manifestPath, 'utf8'), before)
  await generateSectorAudio(options(f, mock, ['--generate', '--only=test-sector/1']))
  assert.equal(mock.peak, 1)
  assert.deepEqual(Object.keys(JSON.parse(await fs.readFile(f.manifestPath, 'utf8')).studies), ['test-sector/1'])
})

test('resume requires both exact text and file hashes, matching voice, and valid duration', async t => {
  const studies = Array.from({ length: 7 }, (_, i) => study(i))
  const entries = {}
  const bytes = Buffer.alloc(2048, 'old')
  for (const item of studies) entries[`test-sector/${item.topicIndex}`] = { textSha256: digest(transcriptText(item.transcript)), fileSha256: digest(bytes), voice, durationSeconds: 10 }
  entries['test-sector/1'].textSha256 = 'stale-text'
  entries['test-sector/2'].fileSha256 = 'stale-file'
  entries['test-sector/3'].voice = 'different-voice'
  entries['test-sector/4'].durationSeconds = 0
  entries['test-sector/5'].durationSeconds = 'Infinity'
  const f = await fixture(t, studies, { version: 1, studies: entries })
  for (let i = 0; i < 6; i++) await fs.writeFile(new URL(`test-sector-${i}.mp3`, f.output), bytes)
  const mock = mockExecutor()
  const result = await generateSectorAudio(options(f, mock))
  assert.equal(result.unchanged, 1)
  assert.equal(result.pending, 6)
  assert.ok(!mock.texts.has('test-sector-0.mp3'))
  assert.deepEqual(JSON.parse(await fs.readFile(f.manifestPath, 'utf8')).studies['test-sector/0'], entries['test-sector/0'])
})

for (const [label, config, error] of [
  ['invalid duration', { duration: 'NaN' }, /Invalid duration/],
  ['full decode failure', { failDecode: true }, /Mock full decode failed/],
  ['truncated audio', { size: 10 }, /Audio too short/],
]) test(`${label} cannot publish audio or manifest metadata`, async t => {
  const f = await fixture(t, [study(0)])
  const before = await fs.readFile(f.manifestPath, 'utf8')
  const mock = mockExecutor(config)
  await assert.rejects(generateSectorAudio(options(f, mock)), error)
  assert.equal(await fs.readFile(f.manifestPath, 'utf8'), before)
  assert.deepEqual(await fs.readdir(f.output), ['manifest.json'])
  for (const path of mock.paths) assert.equal(await exists(path), false)
})

test('failed atomic rename preserves valid prior manifest, drains workers, and cleans stages', async t => {
  const f = await fixture(t, [study(0), study(1), study(2), study(3)])
  const before = await fs.readFile(f.manifestPath, 'utf8')
  const mock = mockExecutor()
  const io = { ...fs, async rename(from, to) {
    if (String(to) === String(f.manifestPath)) throw new Error('Mock manifest rename failed')
    await fs.rename(from, to)
  } }
  await assert.rejects(generateSectorAudio({ ...options(f, mock), io }), /Mock manifest rename failed/)
  assert.equal(await fs.readFile(f.manifestPath, 'utf8'), before)
  assert.ok((await fs.readdir(f.output)).every(name => !name.endsWith('.tmp')))
  assert.equal(mock.texts.size, 3, 'no fourth job is claimed after failure')
  for (const path of mock.paths) assert.equal(await exists(path), false)
})

test('bounded worker failure drains active work before rejecting and stops new jobs', async () => {
  const started = [], completed = []
  const failure = new Error('worker failed')
  await assert.rejects(runBounded([0, 1, 2, 3, 4], 3, async item => {
    started.push(item)
    if (item === 0) { await delay(1); throw failure }
    await delay(10)
    completed.push(item)
  }), error => error === failure)
  assert.deepEqual(started, [0, 1, 2])
  assert.deepEqual(completed.sort(), [1, 2])
})

test('unapproved and duplicate studies never start unsafe work', async t => {
  const f = await fixture(t, [{ ...study(0), reviewStatus: 'pending' }])
  const mock = mockExecutor()
  assert.deepEqual(await generateSectorAudio(options(f, mock)), { pending: 0, unchanged: 0, unapproved: 1, jobs: 3 })
  assert.equal(mock.calls.length, 0)
  await fs.writeFile(new URL('src/sectorStudies/studies.json', f.root), JSON.stringify([study(0), study(0)]))
  await assert.rejects(generateSectorAudio(options(f, mock)), /Duplicate study key/)
  assert.equal(mock.calls.length, 0)
})
