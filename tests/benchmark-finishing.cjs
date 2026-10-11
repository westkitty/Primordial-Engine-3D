/** This isolates newly generated CPU-side placements; NOT a GPU/FPS benchmark. */
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'..','visualDirection.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const m={exports:{}};
vm.runInNewContext(`(function(module,exports){${output}})`)(m,m.exports);
const A=m.exports;
const buildings=[
 ...[[-24,-14,5],[-18,-5,4.6],[-26,4,5.2],[-17,14,4.8],[-25,22,5]].flatMap(([x,z,w],i)=>[
  {id:`v_house_w_${i}`,originalPos:[x,1.8,z],size:[w,3.6,w*.8],type:'village',destroyed:false},
  {id:`v_house_r_${i}`,originalPos:[x,4.2,z],size:[w+.6,1.8,w*.8+.6],type:'village',destroyed:false},
 ]),
 ...['n','s','e','w'].map((d,i)=>({id:`c_w_${d}_${i}`,originalPos:[22,2.6+i*.1,-18],size:[16,4.4,1.8],type:'castle',destroyed:i===0})),
 {id:'c_keep_roof',originalPos:[22,14.2,-18],size:[7.5,2.4,7.5],type:'castle',destroyed:false},
 ...Array.from({length:12},(_,i)=>({id:`c_bastion_${i}`,originalPos:[20+i,4.2,-18],size:[3.8,8.4,3.8],type:'tower',destroyed:i%3===0})),
];
function sample(tier){
 const times=[];let accumulated=0;let counts=null;
 for(let i=0;i<450;i++){
  const seed=2222+i;
  const start=process.hrtime.bigint();
  const facades=A.livingFacades(buildings);
  const merlons=A.survivingMerlons(buildings,tier);
  const rubble=A.ruinFragments(buildings,seed,tier);
  const ridges=A.roofRidges(buildings);
  const edges=['north','south','east','west'].map(edge=>A.escarpmentProfile(seed,edge,tier));
  const water=A.riverHighlights(seed,tier);
  const ms=Number(process.hrtime.bigint()-start)/1e6;
  if(i>=50)times.push(ms);
  counts={timber:facades.timber.length,glass:facades.glazing.length,merlons:merlons.length,
    rubble:rubble.length,roofRidges:ridges.length,edgeVertices:edges.reduce((a,b)=>a+b.length*3,0),
    water:water.length};
  accumulated+=Object.values(counts).reduce((a,b)=>a+b,0);
 }
 times.sort((a,b)=>a-b);
 const percentile=p=>Math.round(times[Math.floor((times.length-1)*p)]*1000)/1000;
 return {median_ms:percentile(.5),p95_ms:percentile(.95),counts,
   checksum:accumulated};
}
console.log(JSON.stringify({metric:'node_cpu_visual_placement_only',
  browser_fps_or_gpu_proof:false,low:sample('low'),medium:sample('medium'),high:sample('high')},null,2));
