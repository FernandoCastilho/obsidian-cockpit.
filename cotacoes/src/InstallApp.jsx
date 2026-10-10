import { useEffect, useState } from 'react'

const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)

// Instalação como aplicativo: botão nativo no Android/Chrome/Edge; instrução manual no iPhone/iPad (Safari não tem o botão).
export default function InstallApp() {
  const [event, setEvent] = useState(null)
  const [done, setDone] = useState(() => standalone())
  const [help, setHelp] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setEvent(e)
    }
    const onInstalled = () => setDone(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (done) return null
  if (event) {
    return (
      <button
        type="button"
        className="btn"
        onClick={async () => {
          event.prompt()
          await event.userChoice.catch(() => {})
          setEvent(null)
        }}
        title="Instala o app na tela inicial, com acesso em tela cheia"
      >
        Instalar app
      </button>
    )
  }
  if (isIos()) {
    return (
      <span className="install-ios">
        <button type="button" className="btn" onClick={() => setHelp((h) => !h)} aria-expanded={help}>
          Instalar no iPhone
        </button>
        {help && (
          <span className="status" role="note">
            No Safari, toque em Compartilhar (quadrado com seta) e depois em “Adicionar à Tela de Início”.
          </span>
        )}
      </span>
    )
  }
  return null
}
