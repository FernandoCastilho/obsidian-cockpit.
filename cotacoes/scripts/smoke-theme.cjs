// Verify real rendered colors and live OS preference changes, using isolated browser contexts.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { buildSync } = require('esbuild')

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8768'
const out = process.env.THEME_QA_OUTPUT || 'workspace-qa/theme'

// The current Mercado screen no longer mounts OilTile. Verify the existing widget
// component in an isolated test page, without restoring the retired product flow.
const widgetHarness = buildSync({
  stdin: {
    contents: `import {createElement} from 'react';
      import {createRoot} from 'react-dom/client';
      import OilLiveQuote from './OilLiveQuote.jsx';
      import {connectSystemTheme} from './systemTheme.js';
      connectSystemTheme();
      createRoot(document.getElementById('widget-root')).render(createElement(OilLiveQuote));`,
    resolveDir: path.resolve(__dirname, '../src'),
    loader: 'js',
  },
  bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022',
  define: { 'process.env.NODE_ENV': '"production"' }, minify: true,
}).outputFiles[0].text
const widgetPage = '<!doctype html><html><head><meta name="theme-color" content="#050505"></head><body><div id="widget-root"></div><script src="./__theme-widget-test.js"></script></body></html>'
const widgetUrl = new URL('__theme-widget-test.html', `${base.replace(/\/$/, '')}/`).href

async function colors(page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const resolve = value => {
      const sample = document.createElement('span'); sample.style.color = value
      document.body.append(sample); const result = getComputedStyle(sample).color; sample.remove(); return result
    }
    const l = color => {
      const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
      return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]
    }
    const contrast = (a, b) => (Math.max(l(a), l(b)) + .05) / (Math.min(l(a), l(b)) + .05)
    const card = resolve('var(--card)'), bg = getComputedStyle(document.body).backgroundColor
    const tokens = Object.fromEntries(['--fg', '--mut', '--amber', '--up', '--down', '--currency-usd', '--currency-eur', '--currency-jpy', '--currency-cnh', '--currency-par'].map(key => {
      const color = resolve(`var(${key})`)
      return [key, { color, ratio: contrast(color, card) }]
    }))
    const selected = [...document.querySelectorAll('.cx .seg button[aria-pressed=true]')].map(button => {
      const style = getComputedStyle(button)
      return { text: button.textContent.trim(), color: style.color, background: style.backgroundColor, ratio: contrast(style.color, style.backgroundColor) }
    })
    const renderedSeries = [...document.querySelectorAll('.plot .line')].map(line => ({ color:getComputedStyle(line).stroke, ratio:contrast(getComputedStyle(line).stroke, card) }))
    return { theme:document.documentElement.dataset.theme, scheme:root.colorScheme, bg, tokens, selected, renderedSeries,
      horizontal:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }
  })
}

async function assertTheme(page, theme, label) {
  await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, theme)
  const result = await colors(page)
  assert.equal(result.scheme, theme, `${label}: native controls follow system`)
  assert.equal(result.horizontal, false, `${label}: no document overflow`)
  for (const key of ['--fg', '--mut', '--amber']) assert.ok(result.tokens[key].ratio >= 4.5, `${label}: ${key} text contrast ${result.tokens[key].ratio}`)
  for (const key of ['--up', '--down', '--currency-usd', '--currency-eur', '--currency-jpy', '--currency-cnh', '--currency-par']) assert.ok(result.tokens[key].ratio >= 3, `${label}: ${key} data contrast ${result.tokens[key].ratio}`)
  for (const selected of result.selected) assert.ok(selected.ratio >= 4.5, `${label}: selection ${selected.text} contrast ${selected.ratio}`)
  for (const series of result.renderedSeries) assert.ok(series.ratio >= 3, `${label}: graph line contrast ${series.ratio}`)
  return result
}

;(async () => {
  fs.mkdirSync(out, { recursive:true })
  const browser = await chromium.launch(require('./smoke-launch.cjs')()), report = []
  let currentPage
  try {
    for (const width of [1440, 390]) for (const initial of ['dark', 'light']) {
      const context = await browser.newContext({ viewport:{width,height:1000}, colorScheme:initial, reducedMotion:'reduce', serviceWorkers:'block' })
      const now = Date.now(), date = new Date(now).toISOString().slice(0, 10), points = [[now - 864e5 * 3, 12], [now - 864e5, 12.2]]
      const quotes = Object.fromEntries(['USDBRL', 'EURBRL', 'JPYBRL', 'USDCNH'].map(code => [code, { code:code.slice(0, 3), codein:code.slice(3), bid:code === 'JPYBRL' ? '.035' : '5', ask:code === 'JPYBRL' ? '.0351' : '5.01', high:code === 'JPYBRL' ? '.036' : '5.1', low:code === 'JPYBRL' ? '.034' : '4.9', pctChange:'1', varBid:'.01', timestamp:String(Math.floor(now / 1000)) }]))
      const curve = { compare:[{id:'hoje',date,label:'Hoje'}], curves:{[date]:[[21,12],[252,13],[504,13.2]]} }
      const fixtures = {
        'quotes.json':{generatedAt:now,quotes},
        'macro.json':{generatedAt:now,cdi:points,selic:points,sofr:points,sofrAvg:[],focus:null,ptax:{},ptaxHist:{}},
        'curves.json':{generatedAt:now,br:curve,cc:curve,us:{...curve,curves:{[date]:[[1,4.1,'1a'],[2,4.2,'2a'],[10,4.4,'10a']]}}},
        'oil.json':{generatedAt:now,benchmark:'Brent',kind:'spot',unit:'USD/barril',points:[{date,value:70}],sourceName:'Fixture de teste'},
        'news.json':{generatedAt:now,news:{}},
      }
      await context.route('**/*', route => {
        const url = new URL(route.request().url()), name = url.pathname.split('/').pop()
        if (name === '__theme-widget-test.html') return route.fulfill({contentType:'text/html',body:widgetPage})
        if (name === '__theme-widget-test.js') return route.fulfill({contentType:'text/javascript',body:widgetHarness})
        if (fixtures[name]) return route.fulfill({json:fixtures[name]})
        if (url.hostname === 'economia.awesomeapi.com.br') return route.fulfill({json:quotes})
        if (url.hostname === 'widgets.tradingview-widget.com') return route.fulfill({contentType:'text/javascript',body:''})
        return url.origin === new URL(base).origin ? route.continue() : route.abort()
      })
      const page = await context.newPage(), errors = []
      currentPage = page
      page.on('pageerror', error => errors.push(error.message))
      for (const [route, selector] of [['resumo','.terminal-desk'],['calculadora/giro','.cx #cx-value'],['aprender','.learn'],['juros','.macro .plot svg[role=img]']]) {
        await page.goto(`${base}/#${route}`); await page.locator(selector).first().waitFor()
        const label = `${initial}-${width}-${route.replace('/', '-')}`
        report.push({ label, ...await assertTheme(page, initial, label) })
        if (route === 'calculadora/giro') {
          await page.locator('#cx-value').fill('250.000,00')
          const before = await page.locator('.cx-matrix').innerText()
          const other = initial === 'dark' ? 'light' : 'dark'
          await page.emulateMedia({colorScheme:other})
          report.push({ label:`${label}-live`, ...await assertTheme(page, other, `${label} live`) })
          assert.equal(await page.locator('#cx-value').inputValue(), '250.000,00', 'live switch keeps input')
          assert.equal(await page.locator('.cx-matrix').innerText(), before, 'live switch keeps financial results')
          await page.emulateMedia({colorScheme:initial})
          await assertTheme(page, initial, label)
          await page.getByRole('button', {name:/^Ajuda:/}).first().hover()
          await page.getByRole('tooltip').waitFor()
        }
        await page.screenshot({path:path.join(out, `${label}.png`), fullPage:true})
        if (route === 'calculadora/giro') await page.keyboard.press('Escape')
        if (route === 'resumo') {
          await page.getByRole('tab', {name:'Google Trends',exact:true}).click()
          await page.locator('.google-trends').waitFor()
          await page.getByRole('img', {name:/Interesse em capital de giro/}).waitFor()
          await assertTheme(page, initial, `${label} trends`)
          await page.screenshot({path:path.join(out, `${initial}-${width}-trends.png`),fullPage:true})
        }
      }
      await page.goto(widgetUrl)
      const widget = page.locator('.oil-live-quote tv-single-ticker')
      await widget.waitFor({state:'attached'})
      assert.equal(await widget.getAttribute('theme'), initial)
      assert.equal(await widget.getAttribute('symbol'), 'TVC:UKOIL')
      const other = initial === 'dark' ? 'light' : 'dark'
      await page.emulateMedia({colorScheme:other})
      await page.waitForFunction(expected => document.querySelector('tv-single-ticker')?.getAttribute('theme') === expected, other)
      assert.equal(await widget.count(), 1, 'live switch replaces the widget without duplicates')
      assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), other === 'light' ? '#f5f4f0' : '#050505')
      assert.deepEqual(errors, [], `${initial} ${width}: browser errors`)
      await context.close()
    }
    const result = {passed:true, checks:['initial dark/light','1440px/390px','rendered contrast','selected controls','live preference change','input and result preservation','isolated widget component live theme','browser chrome'], report}
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify({passed:true,checks:result.checks,scenarios:report.length,report:path.join(out, 'report.json')}))
  } catch (error) {
    await currentPage?.screenshot({path:path.join(out, 'failure.png'),fullPage:true}).catch(() => {})
    fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({message:error.message,report}, null, 2))
    throw error
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
