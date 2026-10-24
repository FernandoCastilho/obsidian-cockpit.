import test from 'node:test'
import assert from 'node:assert/strict'
import { bojDecisionLinks, parseBojDecision, bojHistory, collectBoj } from '../scripts/boj-policy.mjs'

const sourceUrl = 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/k260918a.pdf'
const approved = 'The Bank will encourage the uncollateralized overnight call rate to remain at around '
// Minimal excerpts of official BOJ statements; only wording relevant to parsing.
test('BOJ approved target and explicit effective date differ from announcement and other facilities', () => {
  const doc = parseBojDecision(`${approved}1.25 percent. The interest rate applied to the complementary deposit facility will be 1.25 percent. The basic loan rate will be 1.5 percent. The new guideline for money market operations will be effective from September 24, 2026.`, { decisionDate: '2026-09-18', sourceUrl })
  assert.equal(doc.point.date, '2026-09-24')
  assert.equal(doc.point.value, 1.25)
  assert.equal(doc.point.approximate, true)
  assert.equal(doc.point.sourceUrl, sourceUrl)
})

test('BOJ real PDF kerning gap in overnight is normalized without altering target or effective date', () => {
  const doc = parseBojDecision('The Bank will encourage the uncollateralized o vernight call rate to remain at around 1.0 percent.1 The new guideline for money market operations will be effective from June 17, 2026.', { decisionDate:'2026-06-16', sourceUrl })
  assert.equal(doc.point.date,'2026-06-17'); assert.equal(doc.point.value,1)
})
test('BOJ first guideline is adopted policy; later dissenting proposal cannot replace it', () => {
  const doc = parseBojDecision(`${approved}1.0 percent. [Note] A member proposed ${approved}1.25 percent. The proposal was defeated.`, { decisionDate: '2026-07-31', sourceUrl })
  assert.equal(doc.target.value, 1)
  assert.equal(doc.point, undefined)
})
test('BOJ March2024 band remains bounded, not a midpoint or observed rate', () => {
  const doc = parseBojDecision(`${approved}0 to 0.1 percent. The new guideline for market operations and the new interest rate on the current account balances will be effective from March 21, 2024.`, { decisionDate: '2024-03-19', sourceUrl })
  assert.deepEqual(doc.point, { date: '2024-03-21', lower: 0, upper: 0.1, approximate: true, sourceUrl })
})
test('BOJ holds retain original effective date; changed target without explicit date fails closed', () => {
  const change = parseBojDecision(`${approved}1.0 percent. The new guideline for money market operations will be effective from June 17, 2026.`, { decisionDate: '2026-06-16', sourceUrl })
  const hold = parseBojDecision(`${approved}1.0 percent.`, { decisionDate: '2026-07-31', sourceUrl })
  assert.deepEqual(bojHistory({ change, hold }, '2026-08-01').map((p) => p.date), ['2026-06-17'])
  assert.deepEqual(bojHistory({ change }, '2026-06-16'), [])
  assert.throws(() => bojHistory({ change, hold: { ...hold, target: { value: 1.25 } } }, '2026-08-01'), /sem vigência/)
  assert.throws(() => parseBojDecision('Realized call rate average: 0.99 percent.', { decisionDate: '2026-07-31', sourceUrl }), /não reconhecida/)
  assert.throws(() => bojHistory({ change: { ...change, point: { ...change.point, value: 2 } } }, '2026-08-01'), /cache inválido/)
})
test('BOJ annual index excludes references, wrong origins, unrelated releases and pre-framework decisions', () => {
  const html = `<a href="/en/mopo/mpmdeci/state_2024/k240123a.htm">Statement on Monetary Policy</a>
  <a href="/en/mopo/mpmdeci/state_2024/k240319a.htm">Changes in the Monetary Policy Framework</a>
  <a href="/en/mopo/mpmdeci/mpr_2026/k260918a.pdf">Change in the Guideline for Money Market Operations [PDF]</a>
  <a href="/en/mopo/mpmdeci/mpr_2026/k260918b.pdf">(Reference) Change in the Guideline for Money Market Operations</a>
  <a href="https://example.com/en/mopo/mpmdeci/state_2026/k260918a.htm">Statement on Monetary Policy</a>`
  assert.deepEqual(bojDecisionLinks(html, 'https://www.boj.or.jp/en/mopo/mpmdeci/state_2026/index.htm').map((r) => r.decisionDate), ['2024-03-19', '2026-09-18'])
})

test('BOJ document cache avoids archival requests while annual indexes remain checked', async () => {
  const previousFetch = globalThis.fetch
  const url = 'https://www.boj.or.jp/en/mopo/mpmdeci/state_2024/k240319a.htm'
  const doc = parseBojDecision(`${approved}0 to 0.1 percent. The new guideline for market operations and the new interest rate on the current account balances will be effective from March 21, 2024.`, { decisionDate: '2024-03-19', sourceUrl: url })
  const requests = []
  globalThis.fetch = async (request) => {
    requests.push(request)
    assert.match(request, /\/state_202[456]\/index\.htm$/)
    return { ok: true, text: async () => `<a href="${url}">Changes in the Monetary Policy Framework</a>` }
  }
  try {
    const now = Date.parse('2026-10-24T12:00Z')
    const result = await collectBoj({ documents: { [url]: doc } }, now)
    assert.equal(requests.length, 3)
    assert.deepEqual(result.points, [doc.point])
    assert.equal(result.checkedAt, now)
    assert.equal(result.documents[url], doc)
  } finally { globalThis.fetch = previousFetch }
})
