import {readFile,writeFile} from 'node:fs/promises'
import {loadPrevious} from './prev-lib.mjs'
import {normalizeRecoveryStatus} from '../src/recuperacao.js'
import {recoveryReviewDue,reviewRecoverySources} from './recuperacao-lib.mjs'
const output=new URL('../public/recuperacao.json',import.meta.url)
let local
try{local=normalizeRecoveryStatus(JSON.parse(await readFile(output,'utf8')))}catch{ /* primeira revisão */ }
let remote
try{remote=normalizeRecoveryStatus(await loadPrevious('recuperacao.json'))}catch{ /* sem cópia publicada */ }
const previous=[local,remote].filter(Boolean).sort((a,b)=>b.reviewedAt-a.reviewedAt)[0]
const data=recoveryReviewDue(previous)?await reviewRecoverySources():previous
await writeFile(output,JSON.stringify(data)+'\n')
console.log(`Recuperação judicial: revisão de endereços ${new Date(data.reviewedAt).toISOString()}; dados semanais indisponíveis, cadastro não ingerido.`)
