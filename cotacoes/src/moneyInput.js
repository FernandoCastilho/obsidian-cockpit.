// Monetary entry contract: Brazilian grouping and comma decimals, or plain integers.
// Reject foreign/malformed separators instead of guessing the financial amount.
export function parseMoneyInput(input, { optional = false } = {}) {
  const text = String(input ?? '').trim()
  if (!text && optional) return { ok: true, value: 0 }
  if (!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) {
    return { ok: false, error: 'Use o formato brasileiro: 1.000,00 ou 1000. Ponto separa milhares e vírgula separa centavos.' }
  }
  const value = Number(text.replaceAll('.', '').replace(',', '.'))
  return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER / 100
    ? { ok: true, value }
    : { ok: false, error: 'Informe um valor monetário dentro do limite permitido.' }
}

const fmtBr = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Ao sair do campo, "1000000" vira "1.000.000,00". Texto inválido fica como está, para o aviso de erro da tela.
export function formatMoneyText(text) {
  const t = String(text ?? '').trim()
  if (!t) return text
  const p = parseMoneyInput(t)
  return p.ok ? fmtBr(p.value) : text
}
