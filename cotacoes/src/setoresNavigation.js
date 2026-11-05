import { INSUMOS, parseSetor } from './insumos.js'
import { BANKING_TOPICS, resolveBankingTopic } from './bankingSectors.js'

export const sectorSection = id => INSUMOS.some(item => item.id === id) ? 'insumos' : 'setores'
export const sectorItems = section => section === 'insumos' ? INSUMOS : BANKING_TOPICS
export const sectorGroups = section => [...new Set(sectorItems(section).map(item => item.grupo))]
export function rememberedSector(memory, section, group) {
  const items = sectorItems(section).filter(item => !group || item.grupo === group)
  const stored = group ? memory?.groups?.[section + ':' + group] : memory?.sections?.[section]
  return items.some(item => item.id === stored) ? stored : items[0]?.id
}
export function rememberSector(memory, id) {
  const valid = resolveBankingTopic(id) || parseSetor(id), section = sectorSection(valid)
  const item = sectorItems(section).find(item => item.id === valid)
  return { ...memory, active: valid, sections: { ...memory?.sections, [section]: valid }, groups: { ...memory?.groups, [section + ':' + item.grupo]: valid } }
}
const KEY = 'painel-setores-navigation-v1'
export function readSectorMemory(storage) { try { const data = JSON.parse(storage.getItem(KEY)); return data && typeof data === 'object' && !Array.isArray(data) ? data : {} } catch { return {} } }
export function writeSectorMemory(storage, memory) { try { storage.setItem(KEY, JSON.stringify(memory)) } catch { /* Navegação continua quando armazenamento está bloqueado. */ } }
