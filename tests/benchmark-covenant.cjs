/** Same representative pure-simulation workload on the 0.7 and 0.8 source trees.
 * This is NOT a WebGL, UI-frame-time, or device-performance benchmark. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const ts=require('typescript');
const root=process.argv[2]?path.resolve(process.argv[2]):path.resolve(__dirname,'..');
const deps={};
function loadTS(file) {
  const code=fs.readFileSync(path.join(root,file),'utf8');
  const output=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(`(function(module, exports, require) {${output}\n})`,{Math,Number,Array,Map,Set})(module,module.exports,id=>deps[id]);
  return module.exports;
}
deps['./environment']=loadTS('environment.ts');
const trial=loadTS('trial.ts');
const world={blocks:[
  ...Array.from({length:3},(_,i)=>({id:`bridge_${i}`,originalPos:[i*2,0,0],type:'bridge',destroyed:false})),
  ...Array.from({length:90},(_,i)=>({id:`castle_${i}`,originalPos:[22+i%11,0,-18+Math.floor(i/11)],type:'castle',destroyed:i%19===0})),
],trees:Array.from({length:155},(_,i)=>{const x=Math.cos(i*2.4)*45, z=Math.sin(i*2.4)*45;
 return {id:i+1,position:[x,0,z],burnt:i%29===0,onFire:i%37===0};})};
const state=trial.startTrial(world);
const sample=()=>trial.trialView(state,world);
for(let i=0;i<3000;i++)sample();
const batches=[];
for(let j=0;j<22;j++){
 const start=performance.now();
 for(let k=0;k<2000;k++)sample();
 batches.push((performance.now()-start)/2000);
}
batches.sort((a,b)=>a-b);
const round=n=>Number((n*1000).toFixed(3));
console.log(JSON.stringify({version:require(path.join(root,'package.json')).version,scenario:'155 trees, 93 structures, 2000 trial-view reads per batch',unit:'microseconds per read',median:round(batches[11]),p95:round(batches[20]),note:'Node pure-module cost only; excludes React, GPU, simulation and browser frame time'},null,2));
