// A proveniência completa permanece nos dados; a tela cita entidades públicas.
// Hosts institucionais específicos: Legislativo, FAO, banco público, EBC, conselho federal, instituto federal e Defensoria.
const publicEntityHosts = new Set(['www12.senado.leg.br', 'legis.senado.leg.br', 'www.fao.org', 'www.brde.com.br', 'agenciabrasil.ebc.com.br', 'agenciagov.ebc.com.br', 'site.cff.org.br', 'portal.ifrn.edu.br', 'www.defensoria.rs.def.br'])
export function publicAgencySources(sources = []) {
  return sources.filter(source => {
    try {
      const host = new URL(source.url).hostname
      return publicEntityHosts.has(host) || host === 'gov.br' || host.endsWith('.gov.br') || host === 'ibge.gov.br' || host.endsWith('.ibge.gov.br') || host === 'gov.il' || host.endsWith('.gov.il')
    } catch { return false }
  })
}
