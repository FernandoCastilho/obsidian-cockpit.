import { CONCEITOS, CONEXAO, LIGACOES } from './educacao.js'
import { GLOSSARY } from './glossary.js'
import { INSUMOS, SETORES } from './insumos.js'
import { BASE_DADOS } from './baseDados.js'
import { ENTRIES } from './Novidades.jsx'
import { makeSearchDoc, plainContent } from './globalSearch.js'
import generated from './searchContent.generated.json'
export function staticSearchDocuments() {
  return [
    ...CONCEITOS.map(c=>makeSearchDoc({id:'concept:'+c.id,title:c.nome,body:plainContent(c),route:'aprender/'+c.id,kind:'Conceito'})),
    makeSearchDoc({id:'learning:connections',title:CONEXAO.titulo,body:plainContent(CONEXAO)+' '+plainContent(LIGACOES),route:'aprender',kind:'Conteúdo do painel'}),
    ...Object.entries(GLOSSARY).map(([key,g])=>makeSearchDoc({id:'glossary:'+key,title:g.t,body:plainContent(g),route:generated.glossaryRoutes[key] || 'juros',kind:'Explicação',help:g.t})),
    ...[...SETORES,...INSUMOS].map(t=>makeSearchDoc({id:'sector:'+t.id,title:t.label,body:plainContent(t),route:'setores/'+t.id,kind:'Setor ou insumo'})),
    ...BASE_DADOS.flatMap(g=>g.itens.map((s,i)=>makeSearchDoc({id:'base:'+g.grupo+':'+i,title:s.nome,body:plainContent(s),route:'config',kind:'Base de dados'}))),
    ...ENTRIES.map((e,i)=>makeSearchDoc({id:'release:'+i,title:'Novidades · '+e.date,body:plainContent(e),route:'config',kind:'Novidade publicada'})),
    ...generated.documents.map(makeSearchDoc),
  ]
}
