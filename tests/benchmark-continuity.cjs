// Isolated local CPU measurements. Not a browser or GPU performance claim.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const {performance} = require('node:perf_hooks');
const root = path.join(__dirname, '..');
const loaded = new Map();
function load(name) {
  if (loaded.has(name)) return loaded.get(name);
  const source = fs.readFileSync(path.join(root, name + '.ts'), 'utf8');
  const result = ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  }});
  const module = {exports: {}};
  vm.runInThisContext('(function(module, exports, require) {'+result.outputText+'\n})')(
    module, module.exports,
    id => id.startsWith('./') ? load(id.slice(2)) : require(id));
  loaded.set(name,module.exports);
  return module.exports;
}
const E=load('environment'), C=load('continuity'), H=load('hazard');
let field=E.impactGround(E.newGroundField(),
  {type:'volcano',x:-20,z:0,radius:17,force:2}).field;
field=E.impactGround(field,{type:'wave',x:-17,z:2,radius:13,force:1.1}).field;
const snapshot={seed:123,simTime:120,world:{blocks:[],trees:C.generateSeededTrees(123)},
  ground:field,cooldowns:{meteor:118},pendingImpacts:[],crystals:[],icePatches:[]};
const session={score:500,chaosScore:500,chronicle:[]};
function bench(n,fn) {
  const values=[];
  for(let i=0;i<n+30;i++) {
    const begin=performance.now();
    fn(i);
    if(i>=30) values.push(performance.now()-begin);
  }
  values.sort((a,b)=>a-b);
  return {median_ms:+values[Math.floor(values.length*0.5)].toFixed(4),
    p95_ms:+values[Math.floor(values.length*0.95)].toFixed(4)};
}
const record=C.captureKingdom(snapshot,session);
const text=JSON.stringify(record);
const save=bench(300,()=>JSON.stringify(C.captureKingdom(snapshot,session)));
const parse=bench(300,()=>C.parseKingdom(text));
const actors=Array.from({length:10},(_,i)=>({x:-20+i%4*3,z:i%3*3}));
const nav=bench(1000,()=>actors.forEach(pos=>H.escapeFromHazard(field,pos.x,pos.z)));
console.log(JSON.stringify({scenario:'32x32 scars + seeded trees; ten inhabitants / 4Hz',
  bytes:Buffer.byteLength(text),save,parse,tenActors:nav,
  note:'Node.js isolated CPU costs, not measured game FPS, GPU, or persisted browser I/O.'},null,2));
