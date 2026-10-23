import { useEffect, useRef, useState } from 'react'

// Official display-only embed: never read its values into the EIA history.
export default function OilLiveQuote() {
  const host = useRef(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const container = host.current
    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    const credit = document.createElement('div')
    credit.className = 'tradingview-widget-copyright'
    const link = document.createElement('a')
    link.href = 'https://www.tradingview.com/symbols/TVC-UKOIL/'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = 'Brent por TradingView'
    credit.append(link)
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js'
    script.async = true
    script.textContent = JSON.stringify({ symbol: 'TVC:UKOIL', width: '100%', isTransparent: false, colorTheme: 'dark', locale: 'br' })
    script.onerror = () => setFailed(true)
    container.append(widget, credit, script)
    return () => { script.onerror = null; container.replaceChildren() }
  }, [])
  return <>
    <div ref={host} className="tradingview-widget-container oil-live-quote" aria-label="Cotação online CFD Brent pela TradingView" />
    {failed && <small role="status">Referência online indisponível.</small>}
    <small className="muted">USD/barril · CFD indicativo · TVC:UKOIL</small>
    <small className="muted">Online · atraso não informado pelo provedor.</small>
  </>
}
