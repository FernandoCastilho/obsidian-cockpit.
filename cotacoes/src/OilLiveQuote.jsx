import { useEffect, useRef, useState } from 'react'

// Official display-only embed: never read its values into the EIA history.
export default function OilLiveQuote() {
  const host = useRef(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const container = host.current
    const widget = document.createElement('tv-single-ticker')
    widget.setAttribute('symbol', 'TVC:UKOIL')
    widget.setAttribute('transparent', '')
    widget.setAttribute('theme', 'dark')
    const credit = document.createElement('div')
    credit.className = 'tradingview-widget-copyright'
    const link = document.createElement('a')
    link.href = 'https://www.tradingview.com/symbols/TVC-UKOIL/'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = 'Brent por TradingView'
    credit.append(link)
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://widgets.tradingview-widget.com/w/br/tv-single-ticker.js'
    script.onerror = () => setFailed(true)
    container.append(widget, credit, script)
    return () => { script.onerror = null; container.replaceChildren() }
  }, [])
  return <>
    <div ref={host} className="tradingview-widget-container oil-live-quote" aria-label="Cotação online CFD Brent pela TradingView" />
    {failed && <small role="status">Referência online indisponível.</small>}
    <small className="muted">CFD indicativo · USD/barril · atraso não informado.</small>
  </>
}
