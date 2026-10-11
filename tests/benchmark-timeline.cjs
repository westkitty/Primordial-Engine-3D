/** Standalone Node microbenchmark; does not claim browser or GPU performance. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {performance} = require('node:perf_hooks');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const deps = {};
function load(file) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const module={exports:{}};
  vm.runInNewContext(`(function(module,exports,require){${compiled}})`,
    {Math, Date, Number, Object, Array, Map, Set})(module,module.exports,id=>deps[id]);
  return module.exports;
}
deps['./environment']=load('environment.ts');
deps['./continuity']=load('continuity.ts');
const {newTimeLedger,recordTimeAnchor}=load('timeline.ts');
const C=deps['./continuity'], E=deps['./environment'];
const trees=C.generateSeededTrees(7391);
const blocks=Array.from({length:120},(_,i)=>({id:`stone_${i}`,originalPos:[(i%15)*4-28,1,Math.floor(i/15)*4-14],
  size:[3,2,3],color:'#64748b',destroyed:i%8===0,type:'village'}));
let ground=E.newGroundField();
ground=E.impactGround(ground,{type:'volcano',x:0,z:0,radius:25,force:2}).field;
const world=C.captureKingdom({seed:7391,simTime:12,world:{blocks,trees},ground,cooldowns:{},
  pendingImpacts:[],crystals:[],icePatches:[]},{score:180,chaosScore:180,chronicle:[]},100);
const trials=70, samples=[];
for(let i=0;i<trials;i++) {
  const saved={...world,savedAt:100+i,score:180+i};
  const start=performance.now();
  const ledger=recordTimeAnchor(newTimeLedger(),saved,`Moment ${i}`,`event:${i}`,'event');
  const duration=performance.now()-start;
  if(!ledger.anchors.length)throw Error('benchmark state invalid');
  if(i>=10)samples.push(duration);
}
samples.sort((a,b)=>a-b);
const metric=q=>samples[Math.min(samples.length-1,Math.floor((samples.length-1)*q))].toFixed(3);
console.log(JSON.stringify({scenario:'120-structure, seeded forest, 32x32 geothermal field, one verified anchor',
  trials:samples.length,measurement:'CPU-only Node.js wall time; not browser FPS',
  median_ms:metric(0.5),p95_ms:metric(0.95),saved_bytes:JSON.stringify(world).length},null,2));
