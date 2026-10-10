// Último dado válido: quando uma fonte falha na coleta horária, o arquivo publicado antes é reaproveitado
// e a parte reaproveitada fica registrada em `stale` ({ chave: instante da coleta original }), para a tela avisar.

const isEmpty = (v) => v == null || (Array.isArray(v) ? !v.length : typeof v === 'object' && !Object.keys(v).length)

// Arquivo já publicado no GitHub Pages (null se não existir ou a rede falhar).
export async function loadPrevious(file, repo = process.env.GITHUB_REPOSITORY) {
  const [owner, name] = (repo ?? '').split('/')
  if (!owner || !name) return null
  try {
    const res = await fetch(`https://${owner.toLowerCase()}.github.io/${name}/${file}`, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    const body = await res.text()
    return body.trim() ? JSON.parse(body) : null
  } catch {
    return null
  }
}

const tsOf = (prev, key) => prev?.stale?.[key] ?? prev?.generatedAt ?? null

// Completa `out[key]` com o valor anterior onde a coleta nova veio vazia. Devolve `out` com `stale` preenchido.
export function fillFromPrevious(out, prev, keys) {
  const stale = {}
  for (const key of keys) {
    if (key === 'ptax') {
      // por moeda: só completa as que faltam
      const missing = Object.keys(prev?.ptax ?? {}).filter((m) => !out.ptax?.[m])
      if (missing.length) {
        out.ptax = { ...(out.ptax ?? {}), ...Object.fromEntries(missing.map((m) => [m, prev.ptax[m]])) }
        stale.ptax = tsOf(prev, 'ptax')
      }
    } else if (isEmpty(out[key]) && !isEmpty(prev?.[key])) {
      out[key] = prev[key]
      stale[key] = tsOf(prev, key)
    }
  }
  out.stale = stale
  return out
}

// Notícias: por moeda, mantém as manchetes anteriores quando a nova coleta veio vazia.
export function fillNewsFromPrevious(news, prev) {
  const stale = {}
  for (const code of Object.keys(news)) {
    if (!news[code]?.length && prev?.news?.[code]?.length) {
      news[code] = prev.news[code]
      stale[code] = prev.stale?.[code] ?? prev.generatedAt ?? null
    }
  }
  return stale
}
