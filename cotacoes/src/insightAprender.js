// Insight do Aprender: um trecho aleatório de um conceito (a frase, a analogia ou um "cuidado"), sorteado a cada entrada no app
// e a cada atualização manual das cotações. Não repete o último mostrado na sessão.
import { CONCEITOS } from './educacao.js'

export function sortearInsight(rand = Math.random, evitar = '') {
  const opcoes = CONCEITOS.flatMap((c) => [
    { id: c.id, nome: c.nome, tipo: 'O que é', texto: c.frase },
    { id: c.id, nome: c.nome, tipo: 'Para lembrar', texto: c.analogia },
    ...c.lacunas.map((l) => ({ id: c.id, nome: c.nome, tipo: 'Cuidado', texto: l })),
  ]).filter((o) => o.texto && o.texto.length <= 280)
  const pool = opcoes.filter((o) => `${o.id}|${o.texto}` !== evitar)
  return pool[Math.floor(rand() * pool.length) % pool.length]
}
export const chaveInsight = (i) => (i ? `${i.id}|${i.texto}` : '')
