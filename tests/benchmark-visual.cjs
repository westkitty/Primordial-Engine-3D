/** CPU-only determinism / placement cost probe. NOT browser FPS or GPU draw-call telemetry. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'visualDirection.ts'), 'utf8');
const benchmarkModule = {exports: {}};
const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(`(function(module,exports) {${js}\n})`,{Math,Number,Array,Object})(benchmarkModule,benchmarkModule.exports);
const {scenicPlacements,sculptClouds,visualBudget} = benchmarkModule.exports;
function measure(tier, runCount=350) {
  const series = [];
  let checksum=0;
  for(let i=0;i<runCount;i++) {
    const t0=process.hrtime.bigint();
    const stones=scenicPlacements(8291+i,tier,'rocks');
    const soil=scenicPlacements(8291+i,tier,'patches');
    const clouds=sculptClouds(8291+i,tier);
    const elapsed=Number(process.hrtime.bigint()-t0)/1e6;
    if(i>10) series.push(elapsed);
    checksum+=stones.length+soil.length+clouds.length;
  }
  series.sort((a,b)=>a-b);
  const percentile=p=>Math.round(series[Math.floor(p*(series.length-1))]*1000)/1000;
  const budget=visualBudget(tier);
  return {budget, median_ms:percentile(.5),p95_ms:percentile(.95),
    scene_samples:runCount,total_generated_instances:checksum};
}
const result={kind:'node_cpu_initial_scenery_only',
  limitations:'No R3F/WebGL initialization, FPS, shader compilation, device thermal or renderer.info measurement',
  low:measure('low'),medium:measure('medium'),high:measure('high')};
console.log(JSON.stringify(result,null,2));
