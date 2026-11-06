// Closed fixture transport: deliberately cannot accept a fetch function, proxy,
// callback, URL resolver or live mode. None of these modules opens network sockets.
const transports = new WeakSet()
const publishers = new WeakSet()

export function createFixtureTransport(fixtures) {
  if (!fixtures || typeof fixtures !== 'object' || Array.isArray(fixtures)) throw new Error('fixture_map_required')
  const entries = structuredClone(fixtures), calls = []
  const transport = Object.freeze({
    get calls() { return structuredClone(calls) },
    async request(url) {
      calls.push(url)
      if (!Object.hasOwn(entries, url)) throw new Error('fixture_missing')
      const entry = Array.isArray(entries[url]) ? entries[url].shift() : entries[url]
      if (!entry) throw new Error('fixture_exhausted')
      if (entry.error) throw new Error(entry.error)
      if (!Number.isInteger(entry.status) || typeof entry.body !== 'string') throw new Error('invalid_fixture_response')
      return structuredClone(entry)
    },
  })
  transports.add(transport)
  return transport
}
export const isFixtureTransport = value => transports.has(value)

export function createFixturePublisher({ result = 'confirmed' } = {}) {
  if (!['confirmed', 'rejected', 'uncertain'].includes(result)) throw new Error('invalid_fixture_publication')
  let payload = null, calls = 0
  const publisher = Object.freeze({
    get calls() { return calls },
    get payload() { return structuredClone(payload) },
    async publish(feed, payloadDigest) {
      calls++
      if (result === 'rejected') throw new Error('publication_rejected')
      payload = structuredClone(feed)
      if (result === 'uncertain') throw new Error('publication_outcome_uncertain')
      return { confirmed: true, receipt: `fixture-publication-${calls}`, digest: payloadDigest }
    },
  })
  publishers.add(publisher)
  return publisher
}
export const isFixturePublisher = value => publishers.has(value)
