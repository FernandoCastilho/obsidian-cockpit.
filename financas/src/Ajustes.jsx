import { useState } from 'react'

export default function Ajustes({ cfg, onSave, onClose }) {
  const [clientId, setClientId] = useState(cfg.clientId)
  const [sheetId, setSheetId] = useState(cfg.sheetId)
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Ajustes" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ clientId: clientId.trim(), sheetId: sheetId.trim() })
        }}
      >
        <h2>Ajustes</h2>
        <label>
          ID do cliente Google (OAuth)
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="1234-abc.apps.googleusercontent.com" autoComplete="off" />
        </label>
        <label>
          ID da planilha Caixa Central
          <input value={sheetId} onChange={(e) => setSheetId(e.target.value)} autoComplete="off" />
        </label>
        <p className="mut small">O app só lê a planilha. Nada é gravado no Drive. Estes ajustes ficam apenas neste aparelho.</p>
        <div className="row">
          <button type="submit" className="primary">Salvar</button>
          <button type="button" onClick={onClose}>Fechar</button>
        </div>
      </form>
    </div>
  )
}
