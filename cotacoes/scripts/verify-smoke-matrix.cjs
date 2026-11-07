// Validate reports and nonempty screenshot artifacts after the browser scripts.
const fs = require('node:fs')
const path = require('node:path')
const { calculatorMatrix, headerMatrix, layoutRoutes } = require('./smoke-calculator-matrix.cjs')

function verifySmokeMatrix(root) {
  const errors = [], actual = []
  const read = file => {
    try { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) }
    catch (error) { errors.push(`${file}: ${error.message}`); return null }
  }
  const layout = read('calculators/report.json'), profiles = read('bndes-profiles/report.json'), theme = read('theme/report.json')
  const artifact = file => {
    try { if (!fs.statSync(path.join(root, file)).isFile() || fs.statSync(path.join(root, file)).size === 0) throw Error('empty artifact') }
    catch { errors.push(`missing or empty artifact: ${file}`) }
  }
  for (const expected of calculatorMatrix) {
    const isLayout = layoutRoutes.includes(expected.route), report = isLayout ? layout : profiles
    const matches = Array.isArray(report) ? report.filter(row => row.route === expected.route && row.width === expected.width) : []
    if (matches.length !== 1 || matches[0].status !== 'pass') errors.push(`calculator ${expected.route} ${expected.width}: expected one passing record`)
    actual.push({ ...expected, status: matches[0]?.status || 'missing' })
    const files = isLayout ? [`${expected.route}-initial.png`, `${expected.route}-filled.png`, ...(expected.route === 'conta-garantida' ? ['alongamento-initial.png', 'alongamento-filled.png', 'alongamento-ncg.png'] : [])].map(file => `calculators/${expected.width}/${file}`)
      : (expected.route === 'bndes-credito-tfb' ? ['tfb-parcelas', 'tfb-caixa'] : ['tlp-projecao', 'tlp-negativo']).map(file => `bndes-profiles/${file}-${expected.width}.png`)
    files.forEach(artifact)
  }
  for (const expected of headerMatrix) {
    const matches = (theme?.headerScenarios || []).filter(row => row.route === expected.route && row.width === expected.width && row.theme === expected.theme)
    if (matches.length !== 1 || matches[0].status !== 'pass') errors.push(`header ${expected.theme} 320: expected one passing record`)
    artifact(`theme/setores-${expected.theme}-320-header.png`)
    artifact(`theme/setores-${expected.theme}-320-manual.png`)
  }
  if (!theme?.passed) errors.push('theme smoke did not complete successfully')
  return { passed: errors.length === 0, expected: { calculators: calculatorMatrix, sectorHeaders: headerMatrix }, actual, errors }
}
module.exports = { verifySmokeMatrix }
if (require.main === module) {
  const root = process.argv[2]
  if (!root) throw Error('Pass the qa-universal artifact directory')
  fs.mkdirSync(root, { recursive: true })
  const report = verifySmokeMatrix(root)
  fs.writeFileSync(path.join(root, 'matrix-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ passed: report.passed, expectedCalculators: 40, expectedSectorHeaders: 2, errors: report.errors }, null, 2))
  if (!report.passed) process.exitCode = 1
}
