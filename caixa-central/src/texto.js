// Utilitários de texto: o .xls do Itaú chega com acentos quebrados (UTF-8 lido como Latin-1).

export function consertarAcentos(s) {
  const t = String(s ?? '');
  if (!/[ÃÂ]/.test(t)) return t;
  try {
    const bytes = Uint8Array.from(t, (c) => c.charCodeAt(0));
    if (bytes.some((b) => b > 255)) return t;
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return t;
  }
}

// Maiúsculas, sem acento, espaços colapsados: base de comparação das regras.
export function normalizar(s) {
  return consertarAcentos(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove a data do PIX colada ao nome (PIX TRANSF LUCAS M02/01 -> PIX TRANSF LUCAS M).
export function limparDescricao(original) {
  return consertarAcentos(original)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\d{2}\/\d{2}$/, '')
    .trim();
}

// "-1.234,56" (texto pt-BR) ou número -> número. Vazio -> null.
export function lerValor(v) {
  if (typeof v === 'number') return v;
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function dataParaIso(ddmmaaaa) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(ddmmaaaa ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export function isoParaBr(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function valorBr(n) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
