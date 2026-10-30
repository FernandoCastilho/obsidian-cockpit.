// CSV limpo das séries do BNDES para o Power Query/Excel, com endereço fixo (<site>/csv/tfb.csv etc.). Formato longo: serie,nome,data,valor,unidade.
// UTF-8 com BOM (o Excel abre acentos certos), data ISO AAAA-MM-DD, valor com ponto decimal, linhas em ordem de série e data.
import { BNDES_SERIES } from './bndes-lib.mjs'
import { MOEDAS_CATALOG } from './moedas-lib.mjs'

export const CSV_FILES = ['tfb.csv', 'tlp.csv', 'tfc.csv', 'moedas.csv']
export const HEADER = ['serie', 'nome', 'data', 'valor', 'unidade']
const esc = (v) => (/[",\r\n;]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v))
export const toCsv = (rows) => `\uFEFF${[HEADER, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')}\r\n`
const rowsOf = (id, nome, points, unidade) => (Array.isArray(points) ? points : []).map(([d, v]) => [id, nome, d, v, unidade])

// { bndes, moedas } (conteúdo dos JSON gerados) -> { 'tfb.csv': texto, ... }. Série ausente simplesmente não gera linhas.
export function buildCsvs({ bndes, moedas } = {}) {
  const tfb = BNDES_SERIES.flatMap((s) => rowsOf(s.key, `TFB ${s.prazo} meses · liberação em ${s.liberacao} dias`, bndes?.series?.[s.key]?.points, '% a.a.'))
  const tlp = rowsOf('TLP', 'TLP (moeda 777 do BNDES)', bndes?.tlp?.points, '% a.a.')
  const pick = (group) => MOEDAS_CATALOG.filter((c) => c.group === group).flatMap((c) => rowsOf(c.id, c.name, moedas?.series?.[c.id]?.points, c.unit))
  return { 'tfb.csv': toCsv(tfb), 'tlp.csv': toCsv(tlp), 'tfc.csv': toCsv(pick('tfc')), 'moedas.csv': toCsv(pick('moedas')) }
}
