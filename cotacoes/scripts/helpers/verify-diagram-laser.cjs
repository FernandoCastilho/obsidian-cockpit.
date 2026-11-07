const assert = require('node:assert/strict')
// Exercises the actual shared canvas, not a second diagram-only pointer.
module.exports = async (page, modal, width) => {
  const button = modal.getByRole('button', { name: 'Laser pointer: riscar a tela', exact: true })
  await button.waitFor()
  assert.equal(await page.locator('.laser-btn').count(), 1, 'um único botão/estado no aplicativo')
  assert.equal(await modal.locator('.tic-flow-laser, .tic-flow-laser-toggle').count(), 0)
  await button.click()
  const canvas = modal.locator('canvas.laser-canvas')
  await canvas.waitFor()
  assert.equal(await page.locator('canvas.laser-canvas').count(), 1)
  assert.equal(await button.getAttribute('aria-pressed'), 'true')
  for (const key of ['Tab', 'Shift+Tab']) {
    await page.keyboard.press(key)
    assert.equal(await button.evaluate(el => el === document.activeElement), true, 'foco contido no controle padrão')
  }
  const colored = () => canvas.evaluate(el => {
    const bytes = el.getContext('2d').getImageData(0, 0, el.width, el.height).data
    let pixels = 0
    for (let i = 3; i < bytes.length; i += 4) if (bytes[i]) pixels++
    return pixels
  })
  const x = Math.max(50, width / 3), y = 320
  for (const modifier of [null, 'Control', 'Shift']) {
    if (modifier) await page.keyboard.down(modifier)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 100, y + 75, { steps: 8 })
    await page.waitForTimeout(40)
    assert.ok(await colored() > 50, `laser desenha ${modifier || 'traço livre'}`)
    await page.mouse.up()
    if (modifier) await page.keyboard.up(modifier)
    await page.waitForTimeout(1650)
    assert.equal(await colored(), 0, 'desenho desaparece como no laser padrão')
  }
  await page.mouse.move(x + 140, y + 100)
  assert.equal(await colored(), 0, 'mover sem arrastar não cria o antigo ponto falso')
  if (width <= 600) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 70, y: y + 60 }] })
    await page.waitForTimeout(40)
    assert.ok(await colored() > 50, 'toque arrastado desenha o rastro padrão')
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  }
  await page.keyboard.press('Escape')
  assert.equal(await modal.isVisible(), true, 'primeiro Escape desliga o laser sem sair do diagrama')
  await canvas.waitFor({ state: 'detached' })
  assert.equal(await button.getAttribute('aria-pressed'), 'false')
  for (const shortcut of ['Alt+l', 'Control+Backquote']) {
    await page.keyboard.press(shortcut)
    await canvas.waitFor()
    await button.click()
    await canvas.waitFor({ state: 'detached' })
    assert.equal(await button.evaluate(el => el === document.activeElement), true, 'ligar/desligar preserva foco')
  }
}
