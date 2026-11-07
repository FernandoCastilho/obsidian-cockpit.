import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
const source = readFileSync(new URL('../src/SectorPodcast.jsx', import.meta.url), 'utf8')
const transcript = readFileSync(new URL('../src/ticPodcastTranscript.txt', import.meta.url), 'utf8')
test('podcast tem velocidades requeridas, padrão 1,25 e não inicia sozinho', () => {
  assert.match(source, /PODCAST_RATES = \[1, 1.25, 1.5, 2\]/)
  assert.match(source, /useState\(1.25\)/)
  assert.match(source, /playbackRate = rate/)
  assert.match(source, /playbackRate = next/)
  assert.match(source, /controls preload="metadata"/)
  assert.doesNotMatch(source, /autoPlay|\.play\(/)
  assert.match(source, /onError=/)
  assert.match(source, /aria-label="Resumo em áudio/)
  assert.match(source, /htmlFor="tic-podcast-speed"/)
})
test('roteiro público é datado e distingue fatos, estimativas e hipóteses', () => {
  assert.match(transcript, /seis de novembro de dois mil e vinte e seis/)
  assert.match(transcript, /estimativas nominais de mercado, não estatística oficial/)
  assert.match(transcript, /hipóteses qualitativas/)
  assert.match(transcript, /não oferta de banco nem garantia de aprovação/)
  assert.doesNotMatch(transcript, /Soow|Brasscom|Cetic|Tempest|Logicalis|Microsoft|Embraer|SPX/i)
  assert.equal(readFileSync(new URL('../public/audio/tic-2026-11-06.txt', import.meta.url), 'utf8'), transcript)
  assert.ok(statSync(new URL('../public/audio/tic-2026-11-06.mp3', import.meta.url)).size > 1_000_000)
})

test('áudio respeita subpasta e transcrição separa parágrafos', () => {
  assert.ok(source.includes('src="./audio/'))
  assert.ok(source.includes('href="./audio/'))
  assert.ok(source.includes(String.raw`split(/\n\s*\n/)`))
})
