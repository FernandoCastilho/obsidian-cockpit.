// Durable local journal for OFFLINE tests only. No remote, git transport or credentials.
// The journal directory must be outside the checkout/feed directory. Production needs
// an independently approved, durable CAS service or dedicated non-force-pushed ref.
import { mkdir, open, readFile, rename, unlink, realpath, readdir } from 'node:fs/promises'
import { resolve, join, relative, dirname, basename, sep, isAbsolute } from 'node:path'
import { digest, validateState, validateTransition, STATE_REF } from './state.mjs'

const existsWithin = (directory, root) => { const p = relative(root, directory); return p === '' || (p !== '..' && !p.startsWith(`..${sep}`) && !isAbsolute(p)) }
const clone = value => structuredClone(value)
const tokenFor = state => `${state.revision}-${digest(state)}`
const fileFor = token => {
  if (!/^\d+-[a-f0-9]{64}$/.test(token)) throw new Error('invalid_state_token')
  return `revision-${token}.json`
}
const syncDirectory = async directory => { const handle = await open(directory, 'r'); try { await handle.sync() } finally { await handle.close() } }
const writeExclusive = async (path, value) => {
  const handle = await open(path, 'wx')
  try { await handle.writeFile(value); await handle.sync() } finally { await handle.close() }
}

export async function createLocalStateStore({ directory, checkoutDirectory, feedDirectory, storeId, rootToken }) {
  if (!directory || !checkoutDirectory || !feedDirectory || !storeId || !rootToken) throw new Error('explicit_store_identity_required')
  fileFor(rootToken)
  const path = await realpath(directory), checkout = await realpath(checkoutDirectory), feed = await realpath(feedDirectory)
  if (existsWithin(path, checkout) || existsWithin(path, feed) || existsWithin(feed, path)) throw new Error('state_must_be_separate_from_checkout_and_feed')
  const headPath = join(path, 'HEAD.json'), lockPath = join(path, 'LOCK')
  const read = async () => {
    // A leftover lock means a writer/crash has an uncertain outcome. Never steal it.
    try { await readFile(lockPath); throw new Error('state_writer_or_crash_requires_review') } catch (error) { if (error.code !== 'ENOENT') throw error }
    return readUnlocked()
  }
  const readUnlocked = async () => {
    const head = JSON.parse(await readFile(headPath, 'utf8'))
    if (head.ref !== STATE_REF || head.rootToken !== rootToken || typeof head.token !== 'string') throw new Error('state_head_invalid')
    let token = head.token, newest, traversed = 0
    const seen = new Set()
    for (;;) {
      if (seen.has(token) || ++traversed > 100_000) throw new Error('state_history_invalid')
      seen.add(token)
      const record = JSON.parse(await readFile(join(path, fileFor(token)), 'utf8'))
      const state = validateState(record.state)
      if (tokenFor(state) !== token || state.storeId !== storeId) throw new Error('state_integrity_or_identity_error')
      if (newest) validateTransition(state, newest)
      if (token === head.token) head.state = state
      if (token === rootToken) {
        if (record.parent !== null || state.revision !== 0) throw new Error('state_root_invalid')
        break
      }
      if (!record.parent) throw new Error('state_history_missing_root')
      newest = state; token = record.parent
    }
    const names = await readdir(path)
    if (names.some(name => name.startsWith('revision-') && !seen.has(name.slice(9, -5)))) throw new Error('state_orphan_or_rollback_requires_review')
    if (names.some(name => name.endsWith('.tmp'))) throw new Error('state_incomplete_write_requires_review')
    return { token: head.token, state: clone(head.state), confirmed: true, ref: STATE_REF }
  }
  const compareAndSwap = async (expectedToken, next) => {
    const lock = await open(lockPath, 'wx').catch(error => { throw new Error(`state_lock_unavailable: ${error.code}`) })
    let complete = false
    try {
      await lock.writeFile(JSON.stringify({ expectedToken })); await lock.sync(); await syncDirectory(path)
      const current = await readUnlocked()
      if (current.token !== expectedToken) throw new Error('state_cas_conflict')
      validateTransition(current.state, next)
      const token = tokenFor(next), revisionPath = join(path, fileFor(token))
      await writeExclusive(revisionPath, JSON.stringify({ parent: expectedToken, state: next }) + '\n')
      await syncDirectory(path)
      const tempPath = join(path, `HEAD-${token}.tmp`)
      await writeExclusive(tempPath, JSON.stringify({ ref: STATE_REF, rootToken, token }) + '\n')
      await rename(tempPath, headPath); await syncDirectory(path)
      const observed = await readUnlocked()
      if (observed.token !== token) throw new Error('state_commit_not_confirmed')
      complete = true
      return observed
    } finally {
      await lock.close()
      // Leave the durable lock on ANY error, including a known CAS conflict. More
      // conservative than a lease: no timeout or next job can resume access.
      if (complete) { await unlink(lockPath); await syncDirectory(path) }
    }
  }
  return Object.freeze({ kind: 'local-offline-journal', ref: STATE_REF, read, compareAndSwap })
}

// Explicit one-time offline test bootstrap; an existing/missing production state
// is never silently initialized. Returns the root token to pin outside the journal.
export async function initializeLocalSimulationStore({ directory, checkoutDirectory, feedDirectory, state }) {
  const validated = validateState(state)
  if (validated.revision !== 0 || validated.run !== null) throw new Error('invalid_initial_state')
  const absolute = resolve(directory), checkout = await realpath(checkoutDirectory), feed = await realpath(feedDirectory)
  const prospective = join(await realpath(dirname(absolute)), basename(absolute))
  if (existsWithin(prospective, checkout) || existsWithin(prospective, feed) || existsWithin(feed, prospective)) throw new Error('state_must_be_separate_from_checkout_and_feed')
  // recursive:false refuses to replace even an empty existing directory.
  await mkdir(absolute)
  const canonical = await realpath(absolute)
  if (existsWithin(canonical, checkout) || existsWithin(canonical, feed) || existsWithin(feed, canonical)) throw new Error('state_must_be_separate_from_checkout_and_feed')
  const rootToken = tokenFor(validated)
  await writeExclusive(join(canonical, fileFor(rootToken)), JSON.stringify({ parent: null, state: validated }) + '\n')
  await syncDirectory(canonical)
  await writeExclusive(join(canonical, 'HEAD.json'), JSON.stringify({ ref: STATE_REF, rootToken, token: rootToken }) + '\n')
  await syncDirectory(canonical)
  return { directory: canonical, storeId: state.storeId, rootToken }
}
