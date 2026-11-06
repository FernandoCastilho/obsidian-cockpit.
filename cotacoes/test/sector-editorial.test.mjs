import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const studies = JSON.parse(readFileSync('src/sectorStudies/studies.json', 'utf8'))
test('reader-facing study text omits execution details and malformed questions', () => {
  for (const study of studies) {
    const key = `${study.group}/${study.topicIndex}`
    const visible = JSON.stringify([study.summary, study.sections, study.method, study.limitations, study.canvasQuestions, study.transcript, study.diagram])
    assert.doesNotMatch(visible, /\bskill\b|arquivos privados de contexto|regras locais|subagent/i, key)
    for (const question of study.canvasQuestions) {
      assert.doesNotMatch(question.question, /\.\?/, key)
      assert.match(question.question.trim(), /\?$/, key)
    }
    if (study.reviewStatus === 'approved') assert.doesNotMatch(visible, /revisão independente (?:ainda |permanece )?pendente|NÃO CONFERIDO para uso final/i, key)
  }
})
