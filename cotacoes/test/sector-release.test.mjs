import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const studies = JSON.parse(readFileSync('src/sectorStudies/studies.json', 'utf8'))
test('release gate blocks unreviewed research while allowing reviewed datasets', () => {
  const run = spawnSync(process.execPath, ['scripts/validate-sector-release.mjs'], { encoding: 'utf8' })
  const pending = studies.some(study => study.reviewStatus !== 'approved')
  assert.equal(run.status === 0, !pending, run.stderr)
  if (pending) assert.match(run.stderr, /documentary review not approved/)
})
test('audio completion gate does not report success when recordings are missing', () => {
  const run = spawnSync(process.execPath, ['scripts/validate-sector-release.mjs', '--require-audio'], { encoding: 'utf8' })
  if (studies.some(study => !study.audio?.src)) { assert.notEqual(run.status, 0); assert.match(run.stderr, /audio missing/) }
  else if (run.status === 0) assert.match(run.stdout, /automated release evidence passed/)
  else assert.match(run.stderr, /Sector publication blocked:/)
})
test('Pages validates research before publication without changing isolated CI', () => {
  const pages = readFileSync('../.github/workflows/pages.yml', 'utf8')
  const gate = 'node scripts/validate-sector-release.mjs --require-audio --allow-no-audio'
  assert.ok(pages.includes(gate), 'Pages exige o modo documental explicitamente sem áudio; qualquer áudio exige evidências completas')
  assert.ok(pages.indexOf(gate) < pages.indexOf('uses: actions/upload-pages-artifact'))
  assert.doesNotMatch(readFileSync('../.github/workflows/cotacoes-ci.yml', 'utf8'), /run: node scripts\/validate-sector-release/)
})
