// A proveniência completa permanece nos dados de pesquisa; a tela só cita órgãos públicos.
export function publicAgencySources(sources = []) {
  return sources.filter(source => {
    try {
      const host = new URL(source.url).hostname
      return host === 'gov.br' || host.endsWith('.gov.br') || host === 'ibge.gov.br' || host.endsWith('.ibge.gov.br') || host === 'gov.il' || host.endsWith('.gov.il')
    } catch { return false }
  })
}
