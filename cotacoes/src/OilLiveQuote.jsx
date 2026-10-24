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
    widget.setAttribute('theme', window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://widgets.tradingview-widget.com/w/br/tv-single-ticker.js'
    script.onerror = () => setFailed(true)
    // The official web component renders its own branding and attribution.
    container.append(widget, script)
    return () => { script.onerror = null; container.replaceChildren() }
  }, [])
  return <>
    <div ref={host} className="tradingview-widget-container oil-live-quote" aria-label="Cotação online CFD Brent pela TradingView" />
    {failed && <small role="status">Referência online indisponível.</small>}
    <small className="muted">CFD indicativo · USD/barril · atraso não informado.</small>
  </>
}
