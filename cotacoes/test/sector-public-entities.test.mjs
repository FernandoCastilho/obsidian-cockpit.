import test from 'node:test'
import assert from 'node:assert/strict'
import { publicAgencySources } from '../src/sectorSourceVisibility.js'

test('entidades públicas fora de gov usam hosts exatos, sem abrir org ou com.br', () => {
  const allowed = ['www12.senado.leg.br', 'legis.senado.leg.br', 'www.fao.org', 'www.brde.com.br', 'agenciabrasil.ebc.com.br', 'agenciagov.ebc.com.br', 'site.cff.org.br', 'portal.ifrn.edu.br', 'www.defensoria.rs.def.br']
  const denied = ['brasscom.org.br', 'www.brasscom.org.br', 'empresa.com.br', 'example.org', 'www.fao.org.example.com', 'evil.www.brde.com.br', 'www12.senado.leg.br.example.com', 'example.leg.br', 'site.cff.org.br.example.com', 'example.edu.br', 'anvisalegis.datalegis.net', 'investsp.org.br']
  const sources = [...allowed, ...denied].map(host => ({ url: `https://${host}/fonte` }))
  assert.deepEqual(publicAgencySources(sources).map(source => new URL(source.url).hostname), allowed)
})
