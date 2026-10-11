// Repeatable pure-model CPU microbenchmark, not a WebGL frame-time benchmark.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {performance} = require('node:perf_hooks');
const file = fs.readFileSync(path.join(__dirname, '../environment.ts'), 'utf8');
const js = ts.transpileModule(file, {compilerOptions: {module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020}}).outputText;
const moduleBox = {exports: {}};
vm.runInThisContext('(function(module, exports) {' + js + '\n})')(moduleBox, moduleBox.exports);
const E = moduleBox.exports;
const observations=[];
let field=E.newGroundField();
for(let i=0;i<650;i++) {
  if(i%12===0) {
    field=E.impactGround(field,{type:i%24===0?'volcano':'wave',x:7,z:-4,radius:19,force:1.7}).field;
  }
  const start=performance.now();
  field=E.advanceGround(field,0.5).field;
  const duration=performance.now()-start;
  if(i>=50) observations.push(duration);
}
observations.sort((a,b)=>a-b);
const quantile=p=>observations[Math.min(observations.length-1, Math.floor(observations.length*p))];
console.log(JSON.stringify({scenario:'32x32 ground field, alternating volcano/wave every 12 fixed ticks',
  samples:observations.length, metric:'pure CPU model milliseconds per 0.5-second world tick',
  median_ms:Number(quantile(0.5).toFixed(4)),p95_ms:Number(quantile(0.95).toFixed(4)),
  max_ms:Number(quantile(1).toFixed(4)),field_revision:field.revision,
  note:'Isolated Node.js measurement; not representative of browser frame rate or GPU usage.'},null,2));
