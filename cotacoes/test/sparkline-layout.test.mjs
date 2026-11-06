import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const bundle=await build({entryPoints:['src/Sparkline.jsx'],bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'react',setup(b){b.onResolve({filter:/^(react|react-dom)(\/.*)?$/},a=>({path:pathToFileURL(require.resolve(a.path)).href,external:true}))}}]})
const {default:Sparkline}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))
test('flat sparkline is centered, not stuck on its lower edge',()=>{
 const html=renderToStaticMarkup(React.createElement(Sparkline,{height:30,points:[{t:1,bid:5},{t:2,bid:5}]}))
 assert.match(html,/M0\.0,15\.0L120\.0,15\.0/)
})
test('sparkline spaces irregular observations by time',()=>{
 const html=renderToStaticMarkup(React.createElement(Sparkline,{height:30,points:[{t:1,bid:5},{t:2,bid:6},{t:11,bid:7}]}))
 assert.match(html,/M0\.0,27\.0L12\.0,15\.0L120\.0,3\.0/)
})
