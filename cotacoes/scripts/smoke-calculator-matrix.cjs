// Shared CI coverage contract. These are browser viewports, not physical devices.
const widths = [320, 390, 768, 1024, 1440]
const layoutRoutes = ['conta-garantida', 'bndes-selic-lcd', 'finimp', 'giro', 'analise-desconto', 'finame-materiais']
const profileRoutes = ['bndes-credito-tfb', 'bndes-tlp-exigivel']
const calculatorMatrix = [...layoutRoutes, ...profileRoutes].flatMap(route => widths.map(width => ({ route, width })))
const headerMatrix = ['dark', 'light'].map(theme => ({ route: 'setores', width: 320, theme }))
module.exports = { widths, layoutRoutes, profileRoutes, calculatorMatrix, headerMatrix }
