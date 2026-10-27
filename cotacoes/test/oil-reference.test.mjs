import test from 'node:test'
import assert from 'node:assert/strict'
import {latestBrentSpot} from '../src/oilReference.js'
const data=points=>({benchmark:'Brent',kind:'spot',unit:'USD/barril',points})
test('Brent reference uses latest valid observation, never collection/release date',()=>{const x={...data([{date:'2026-10-20',value:115.22},{date:'2026-10-19',value:118.82}]),generatedAt:'2026-10-27',releaseDate:'2026-10-21'};assert.deepEqual(latestBrentSpot(x,'2026-10-26'),{date:'2026-10-20',value:115.22})})
test('missing, invalid, nonpositive and future observations cannot become a spot quote',()=>{assert.equal(latestBrentSpot(data([{date:'2026-02-30',value:10},{date:'2026-10-28',value:12},{date:'2026-10-20',value:null},{date:'2026-10-19',value:0}]),'2026-10-26'),null);assert.equal(latestBrentSpot(null),null)})
test('CFD, futures, WTI and incompatible units do not substitute EIA Brent spot',()=>{const x=data([{date:'2026-10-20',value:115.22}]);for(const change of[{kind:'CFD'},{kind:'future'},{benchmark:'WTI'},{unit:'BRL/barril'}])assert.equal(latestBrentSpot({...x,...change}),null)})
