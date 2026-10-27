// Opções de abertura do navegador dos smokes. Padrão: Edge (canal msedge). SMOKE_CHANNEL=chromium usa o Chromium do Playwright (CI).
module.exports = () => {
  const channel = process.env.SMOKE_CHANNEL || 'msedge'
  return { headless: true, ...(channel === 'chromium' ? {} : { channel }), ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) }
}
