import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('CI executa smoke dos estudos na branch dedicada sem publicar', () => {
  const workflow = readFileSync('../.github/workflows/cotacoes-ci.yml', 'utf8')
  assert.match(workflow, /push:\s+branches: \['feat\/estudos-setoriais-completos'\]/)
  assert.match(workflow, /node scripts\/smoke-researched-sectors\.cjs/)
  assert.match(workflow, /name: estudos-setoriais-design/)
  assert.doesNotMatch(workflow, /deploy-pages|pages: write|id-token: write/)
})

test('smoke percorre dataset e cobre interações e artefatos exigidos', () => {
  const source = readFileSync('scripts/smoke-researched-sectors.cjs', 'utf8')
  for (const token of ['catalog.length, 67', 'studies.length <= 66', 'pending.entries()', 'pending-honest', '[1440, 390]', 'for (const study of studies)', 'chart.categoryLabel', 'research-bar-negative', 'playbackRate', 'preservesPitch', "reducedMotion: 'reduce'", "press('Escape')", 'page.goBack()', 'page.goForward()', 'report.json', 'interaction-failure.png']) assert.ok(source.includes(token), token)
})
