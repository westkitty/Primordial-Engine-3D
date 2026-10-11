/** Fixed 200-particle CPU-only workload; not WebGL or device FPS evidence. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../particleRuntime.ts'),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const sandboxModule={exports:{}};
vm.runInThisContext('(function(module,exports){'+output+'})',{})(sandboxModule,sandboxModule.exports);
const {advanceParticlesInPlace}=sandboxModule.exports;
function make(){return Array.from({length:200},(_,i)=>({pos:{x:i*0.06,y:1,z:-i*0.1},
  vel:{x:(i%7)*0.02,y:4+i*0.002,z:(i%4)*0.04},life:15,maxLife:15,opacity:1}));}
function old(input){let pool=input;for(let frame=0;frame<1100;frame++){
 const dt=1/120;
 pool=pool.filter(p=>{p.pos.x+=p.vel.x*dt;p.pos.y+=p.vel.y*dt;p.pos.z+=p.vel.z*dt;
  p.vel.y-=10*dt;p.life-=dt;p.opacity=Math.max(0,p.life/p.maxLife);return p.life>0;});
 const current=pool.slice(-240); if(current.length>240)throw Error('invalid rendering window');
}return pool;}
function optimized(pool){for(let frame=0;frame<1100;frame++){
 advanceParticlesInPlace(pool,1/120); const start=Math.max(0,pool.length-240);
 if(pool.length-start>240)throw Error('invalid rendering window');
}return pool;}
function sample(fn){const times=[];let result;
 for(let round=0;round<7;round++){
  const input=make(),start=process.hrtime.bigint();result=fn(input);
  const ms=Number(process.hrtime.bigint()-start)/1e6;if(round>0)times.push(ms);
 }
 times.sort((a,b)=>a-b);return {median_ms:Number(times[3].toFixed(3)),count:result.length,
  first_x:Number(result[0].pos.x.toFixed(6)),first_y:Number(result[0].pos.y.toFixed(6))};
}
const baseline=sample(old),after=sample(optimized);
if(baseline.count!==after.count||baseline.first_x!==after.first_x||baseline.first_y!==after.first_y)
  throw Error('Particle integration changed observable physics results');
console.log(JSON.stringify({metric:'node_cpu_particle_update_only',fps_or_gpu_proof:false,
  particle_count:200,frames_per_sample:1100,baseline,optimized:after,
  median_delta_pct:Number(((after.median_ms/baseline.median_ms-1)*100).toFixed(1)),
  previous_arrays_allocated_per_active_frame:2,optimized_arrays_allocated_per_active_frame:0},null,2));
