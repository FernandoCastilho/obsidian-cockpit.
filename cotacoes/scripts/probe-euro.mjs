const T = ['SR_3M', 'SR_6M', 'SR_1Y', 'SR_2Y', 'SR_3Y', 'SR_5Y', 'SR_7Y', 'SR_10Y', 'SR_20Y', 'SR_30Y']
const url = `https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.${T.join('+')}?startPeriod=2025-10-01&format=csvdata`
const r = await fetch(url, { headers: { accept: 'text/csv', 'user-agent': 'Mozilla/5.0 (cotacoes-sonda)' }, signal: AbortSignal.timeout(40000) })
const txt = await r.text()
console.log('HTTP', r.status, r.headers.get('content-type'), 'bytes', txt.length)
const lines = txt.split(/\r?\n/).filter(Boolean)
console.log('CABEÇALHO:', lines[0])
console.log('LINHA 1:', lines[1]?.slice(0, 300))
console.log('LINHAS:', lines.length - 1)
const head = lines[0].split(','), iD = head.indexOf('TIME_PERIOD'), iV = head.indexOf('OBS_VALUE'), iT = head.indexOf('DATA_TYPE_FM')
console.log('colunas', { iD, iV, iT })
const by = {}
for (const l of lines.slice(1)) { const c = l.split(','); const t = c[iT]; (by[t] ??= []).push([c[iD], c[iV]]) }
for (const [t, a] of Object.entries(by)) console.log(t, 'n', a.length, 'primeiro', a[0].join(' '), 'último', a.at(-1).join(' '))
const ult = Object.values(by)[0].at(-1)[0]
console.log('CURVA em', ult, JSON.stringify(Object.entries(by).map(([t, a]) => [t, a.find((x) => x[0] === ult)?.[1]])))
