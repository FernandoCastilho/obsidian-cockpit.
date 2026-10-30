// Bandeira do país citado no começo de um rótulo ("Brasil · Selic meta", "EUA · Fed (faixa-alvo)"). Sem país conhecido: null.
const BANDEIRAS = { Brasil: 'BRL', EUA: 'USD', 'Área do euro': 'EUR', Japão: 'JPY' }
export const bandeiraDe = (rotulo) => BANDEIRAS[String(rotulo ?? '').split(' · ')[0]] ?? null
