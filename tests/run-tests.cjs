const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '..');
let count = 0;
function test(name, work) {try {work(); count++; console.log('PASS', name);} catch (error) {console.error('FAIL', name, error); process.exitCode = 1;}}
function load(file, extra = '') {
  const source = fs.readFileSync(path.join(root, file), 'utf8') + extra;
  const result = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}});
  const module = {exports: {}};
  const localRequire = id => id === './environment' ? E : id === './continuity' ? C : id === './simulation' ? S : require(id);
  vm.runInNewContext(`(function(module, exports, require) { ${result.outputText} })`,
    {console, Math, Date, Number, Object, Array, Map, Set})(module, module.exports, localRequire);
  return module.exports;
}
const E = load('environment.ts');
const T = load('tapArbitration.ts');
const S = load('simulation.ts');
const G = load('gestures.ts', '\nexport const testTemplates = TEMPLATES;');
const C = load('continuity.ts');
const H = load('hazard.ts');
const L = load('timeline.ts');
const F = load('forecast.ts');
const W = load('weather.ts');
const V = load('vault.ts');
const PR = load('particleRuntime.ts');
function world() {
  return {blocks: [
    {id:'keep',originalPos:[0,1,0],type:'castle',destroyed:false},
    {id:'shed',originalPos:[2,1,0],type:'village',destroyed:false},
    {id:'distant',originalPos:[60,1,60],type:'village',destroyed:false},
  ], trees: [
    {id:1,position:[0,0,2],onFire:false,burnt:false},
    {id:2,position:[5,0,2],onFire:false,burnt:false},
    {id:3,position:[60,0,60],onFire:false,burnt:false},
  ]};
}
const cast = (type, x=0,z=0, radius=10, force=1) => ({type,x,z,radius,force});
test('initial snapshot is never mutated on an earthquake', () => {
 const pristine=world(), working=S.copyWorld(pristine);
 const result=S.applyMiracle(working, pristine, cast('earthquake'));
 assert.equal(pristine.blocks[0].destroyed,false);
 assert.equal(working.blocks[0].destroyed,false);
 assert.equal(result.world.blocks[0].destroyed,true);
 assert.notEqual(result.world.blocks[0],pristine.blocks[0]);
 assert.equal(result.world.blocks[2],working.blocks[2]);
});
test('destroy, restore and destroy again for three cycles',()=>{
 const initial=world();let current=S.copyWorld(initial);
 for(let i=0;i<3;i++) {
  current=S.applyMiracle(current,initial,cast('meteor')).world;
  assert.equal(current.blocks[0].destroyed,true);
  assert.equal(current.blocks[1].destroyed,true);
  current=S.applyMiracle(current,initial,cast('restore')).world;
  assert.equal(current.blocks[0].destroyed,false);
  assert.equal(current.blocks[0].integrity,undefined);
  assert.equal(current.blocks[2].destroyed,false);
 }
});
test('restoration is localized, never world-wide', () => {
 const initial=world(), damaged=S.applyMiracle(S.copyWorld(initial),initial,cast('meteor',60,60,9)).world;
 const both=S.applyMiracle(damaged,initial,cast('meteor',0,0,9)).world;
 const restored=S.applyMiracle(both,initial,cast('restore',0,0,10)).world;
 assert.equal(restored.blocks[0].destroyed,false);
 assert.equal(restored.blocks[2].destroyed,true);
});
test('destroyed structures cannot score destruction twice',()=>{
 const pristine=world(), first=S.applyMiracle(S.copyWorld(pristine),pristine,cast('meteor'));
 const second=S.applyMiracle(first.world,pristine,cast('meteor'));
 assert.ok(first.score>second.score);
 assert.equal(second.destroyed.length,0);
});
test('wave extinguishes burning trees, applies wetness', () => {
 const pristine=world(), fire=S.applyMiracle(S.copyWorld(pristine),pristine,cast('wildfire'));
 assert.equal(fire.world.trees[0].onFire,true);
 const wave=S.applyMiracle(fire.world,pristine,cast('wave'));
 assert.equal(wave.world.trees[0].onFire,false);
 assert.ok(wave.world.trees[0].wetness>=1);
});
test('wildfire spreads to dry neighboring trees on a fixed tick',()=>{
 const pristine=world(), fire=S.applyMiracle(S.copyWorld(pristine),pristine,cast('wildfire',0,2,2));
 assert.equal(fire.world.trees[0].onFire,true);
 assert.equal(fire.world.trees[1].onFire,false);
 const spread=S.tickEnvironment(fire.world,0.5);
 assert.equal(spread.world.trees[1].onFire,true);
 assert.ok(spread.treesIgnited>=1);
});
test('wet trees resist the next environmental fire tick',()=>{
 const pristine=world(), wet=S.applyMiracle(S.copyWorld(pristine),pristine,cast('wave',5,2,1.5));
 const burning=S.applyMiracle(wet.world,pristine,cast('wildfire',0,2,2));
 const tick=S.tickEnvironment(burning.world,0.5);
 assert.equal(tick.world.trees[1].onFire,false);
});
test('fire chars trees and consumes timber over time',()=>{
 const pristine=world();let state=S.applyMiracle(S.copyWorld(pristine),pristine,cast('wildfire')).world;
 for(let i=0;i<24;i++)state=S.tickEnvironment(state,0.5).world;
 assert.equal(state.trees[0].burnt,true);
 assert.equal(state.trees[0].onFire,false);
 assert.equal(state.blocks[1].destroyed,true);
});
test('lightning damages the actual point of impact',()=>{
 const pristine=world(), hit=S.applyMiracle(S.copyWorld(pristine),pristine,cast('lightning'));
 assert.equal(hit.world.blocks[0].destroyed,true);
 assert.equal(hit.world.blocks[2].destroyed,false);
});
test('no-op environment ticks preserve referential identity',()=>{
 const pristine=world(), prev=S.copyWorld(pristine), next=S.tickEnvironment(prev,0.5);
 assert.equal(next.world,prev);
 assert.equal(next.changed,false);
});
test('every canonical gesture and reversed stroke recognizes correctly',()=>{
 for(const t of G.testTemplates) {
  const points=t.points.map(p=>({x:p.x*130+350,y:p.y*130+350}));
  assert.equal(G.recognizeGesture(points).matchedType,t.type,`canonical ${t.type}`);
  assert.equal(G.recognizeGesture([...points].reverse()).matchedType,t.type,`reversed ${t.type}`);
 }
});
test('orientation-independent circular and symmetric gestures survive rotation',()=>{
 for(const name of ['tornado','wave','earthquake','crystal']) {
  const t=G.testTemplates.find(t=>t.type===name);
  const points=t.points.map(p=>({x:-p.y*130+350,y:p.x*130+350}));
  assert.equal(G.recognizeGesture(points).matchedType,name);
 }
});
test('directional rotated meteor is not mislabeled as crystal',()=>{
 const t=G.testTemplates.find(t=>t.type==='meteor');
 const points=t.points.map(p=>({x:-p.y*130+350,y:p.x*130+350}));
 assert.equal(G.recognizeGesture(points).matchedType,null);
});
test('two hundred deterministic random scribbles do not auto-cast', () => {
 let seed=31;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<200;i++) {
  let x=100,y=100;
  const points=[];
  for(let j=0;j<20;j++){x+=(random()-0.5)*50;y+=(random()-0.5)*50;points.push({x,y});}
  assert.equal(G.recognizeGesture(points).matchedType,null,`scribble ${i}`);
 }
});
test('short or motionless strokes are rejected without hanging',()=>{
 assert.equal(G.recognizeGesture([{x:0,y:0}]).matchedType,null);
 assert.equal(G.recognizeGesture(Array(10).fill({x:5,y:5})).matchedType,null);
 const duplicateStroke=[{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:100,y:100},{x:100,y:100}];
 assert.equal(G.resamplePoints(duplicateStroke).length,32);
});
test('meteor impact is scheduled and never applied on initial cast',()=>{
 const source=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(source,/pendingImpactsRef\.current\.push\(/);
 assert.match(source,/if \(powerType === 'meteor'\) \{[\s\S]*?pendingImpactsRef\.current\.push[\s\S]*?\} else \{\s*applyImpact/);
});
test('gesture failure does not accidentally trigger a spell',()=>{
 const source=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const failure=source.slice(source.indexOf('onGestureFail();'),source.indexOf('onGestureFail();')+125);
 assert.doesNotMatch(failure,/executeCatastropheAt/);
});
test('disasters never allocate state when there are no active effects',()=>{
 const source=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(source,/if \(activeDisasters\.length > 0\) \{/);
 assert.match(source,/prev\.length === 0 \? prev/);
});

// Material-field integration: the same finite grid drives visualization and world rules.
const surfaceCast = (type, x=0, z=0, radius=12, force=1.4) => ({type, x, z, radius, force});
function fieldSeries(field) {
 return ['heat','water','frost','ash','stone'].map(name => Array.from(field[name]));
}
test('pristine soil is inert and out-of-map samples never alias edge cells', () => {
 const field=E.newGroundField();
 assert.equal(E.advanceGround(field,0.5).field,field);
 assert.equal(E.cellIndex(81,0),-1);
 assert.equal(E.cellIndex(80,0),-1);
 assert.equal(E.impactGround(field,surfaceCast('meteor',200,0)).field,field);
 assert.equal(E.sampleGround(field,99,99).heat,0);
 assert.equal(E.groundStats(field).heated,0);
});
test('volcanic heat is persistent, local and immutable', () => {
 const source=E.newGroundField();
 const impact=E.impactGround(source,surfaceCast('volcano',0,0));
 assert.ok(impact.affected>0);
 assert.ok(E.sampleGround(impact.field,1,1).heat>0.3);
 assert.ok(E.sampleGround(impact.field,66,66).heat===0);
 assert.equal(E.sampleGround(source,1,1).heat,0);
 assert.equal(source.revision,0);
 assert.equal(impact.field.revision,1);
});
test('water on hot soil creates steam and durable cooled stone', () => {
 const source=E.newGroundField();
 const hot=E.impactGround(source,surfaceCast('volcano',0,0,16,2)).field;
 const hit=E.impactGround(hot,surfaceCast('wave',0,0,16,2));
 assert.ok(hit.steam>0);
 assert.ok(hit.formedStone>0);
 assert.ok(E.sampleGround(hit.field,1,1).stone>=0.15);
 assert.ok(E.sampleGround(hit.field,1,1).heat<E.sampleGround(hot,1,1).heat);
 let cool=hit.field;
 for(let i=0;i<20;i++)cool=E.advanceGround(cool,0.5).field;
 assert.ok(E.sampleGround(cool,1,1).stone>=0.15);
});
test('local restoration erases only local surface history', () => {
 const base=E.newGroundField();
 const near=E.impactGround(base,surfaceCast('meteor',0,0,10,2)).field;
 const both=E.impactGround(near,surfaceCast('meteor',55,55,10,2)).field;
 const restored=E.impactGround(both,surfaceCast('restore',0,0,12,2)).field;
 assert.equal(E.sampleGround(restored,1,1).heat,0);
 assert.equal(E.sampleGround(restored,1,1).ash,0);
 assert.ok(E.sampleGround(restored,55,55).heat>0);
 assert.ok(E.sampleGround(both,1,1).heat>0);
});
test('advanceGround uses a fixed bounded step and diffuses locally',()=>{
 const base=E.impactGround(E.newGroundField(),surfaceCast('lightning',2.5,2.5,2,2)).field;
 assert.ok(E.sampleGround(base,2.5,2.5).heat>0);
 assert.equal(E.sampleGround(base,7.5,2.5).heat,0);
 const one=E.advanceGround(base,0.5).field;
 const bounded=E.advanceGround(base,50).field;
 assert.deepEqual(fieldSeries(one),fieldSeries(bounded));
 assert.ok(E.sampleGround(one,7.5,2.5).heat>0);
 assert.ok(E.sampleGround(one,2.5,2.5).heat<E.sampleGround(base,2.5,2.5).heat);
});
test('identical catastrophe sequences produce deterministic environmental state',()=>{
 function play(){let f=E.newGroundField();
   for(const type of ['meteor','wave','freeze','volcano','restore','wildfire','wave']) {
    f=E.impactGround(f,surfaceCast(type,8,7,11,1.3)).field;
    for(let j=0;j<3;j++) f=E.advanceGround(f,0.5).field;
   }
   return f;
 }
 assert.deepEqual(fieldSeries(play()),fieldSeries(play()));
});
test('environmental saturation extinguishes a previously burning tree',()=>{
 const source=world();
 const burning=S.applyMiracle(S.copyWorld(source),source,cast('wildfire',0,2,3)).world;
 assert.equal(burning.trees[0].onFire,true);
 const field=E.impactGround(E.newGroundField(),surfaceCast('wave',0,2,12,2)).field;
 const wet=S.tickEnvironment(burning,0.5,1,0,(x,z)=>E.sampleGround(field,x,z));
 assert.equal(wet.world.trees[0].onFire,false);
});
test('stored geothermal heat can ignite a tree without any active fire source',()=>{
 const source=world();
 const heat=E.impactGround(E.newGroundField(),surfaceCast('volcano',0,2,13,2)).field;
 const next=S.tickEnvironment(S.copyWorld(source),0.5,1,0,(x,z)=>E.sampleGround(heat,x,z));
 assert.equal(next.world.trees[0].onFire,true);
 assert.equal(next.world.trees[2].onFire,false);
});
test('inspection descriptions distinguish untouched soil from material scars',()=>{
 const base=E.newGroundField();
 assert.match(E.describeGround(base,0,0),/undisturbed/);
 const impacted=E.impactGround(base,surfaceCast('meteor',0,0,12,2)).field;
 assert.match(E.describeGround(impacted,0,0),/hot ground/);
 assert.match(E.describeGround(impacted,0,0),/ash/);
 assert.match(E.describeGround(impacted,100,100),/Beyond the mapped/);
});
test('world-memory component is wired to live scene and the inspector is non-destructive',()=>{
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 assert.match(game,/<EnvironmentalMemory fieldRef=\{groundRef\}/);
 assert.match(game,/advanceGround\(groundRef\.current, 0\.5\)/);
 assert.match(game,/windAt\(simClockRef\.current, worldSeed\)/);
 assert.match(game,/tickEnvironment\(beforeWorld, 0\.5, wind\.x, wind\.z,/);
 assert.match(game,/interactionMode === 'inspect'[\s\S]*?onInspect\?\.\(describeGround/);
 assert.match(app,/onGroundStats=\{onGroundStats\}/);
 assert.match(app,/aria-pressed=\{inspectMode\}/);
 assert.match(app,/THE KINGDOM REMEMBERS/);
});


test('stone-only terrain stops consuming simulation ticks',()=>{
 const source=E.newGroundField();
 const stony=E.impactGround(source,surfaceCast('crystal',2.5,2.5,3,2)).field;
 assert.ok(E.sampleGround(stony,2.5,2.5).stone>0);
 assert.equal(E.advanceGround(stony,0.5).field,stony);
});
test('single desktop click casts only after focus arbitration window',()=>{
 let list=T.queueDesktopTap([], {x:100,y:100,payload:'cast'});
 let next=T.advanceDesktopTaps(list,0.16);
 assert.equal(next.ready.length,0);
 next=T.advanceDesktopTaps(next.pending,0.16);
 assert.equal(next.ready.length,1);
 assert.equal(next.ready[0],'cast');
 assert.equal(next.pending.length,0);
});
test('second focus click cancels nearby pending cast but preserves distinct clicks',()=>{
 let taps=T.queueDesktopTap([], {x:100,y:100,payload:'first'});
 taps=T.queueDesktopTap(taps, {x:230,y:100,payload:'distant'});
 const filtered=T.discardFocusTap(taps,105,105);
 assert.equal(filtered.length,1);
 assert.equal(T.advanceDesktopTaps(filtered,0.5).ready.join(','),'distant');
});
test('blur cancels pointer releases and the scene abandons queued clicks',()=>{
 const input=fs.readFileSync(path.join(root,'input.ts'),'utf8');
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(input,/input\.pointer = \{\.\.\.emptyPointer\(\), cancelled: true\}/);
 assert.match(game,/window\.addEventListener\('blur', cancelPending\)/);
 assert.match(game,/discardFocusTap\(pendingTapRef\.current/);
 assert.match(game,/pendingTapRef\.current = \[\]; \}, \[resetSignal\]/);
 assert.match(game,/if \(pointer\.pointerType !== 'mouse'\)/);
});

test('rapid touchscreen taps cannot enter desktop double-focus arbitration',()=>{
 const input=fs.readFileSync(path.join(root,'input.ts'),'utf8');
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(input,/isMouseClick = isLeft && event\.pointerType === 'mouse'/);
 assert.match(input,/input\.pointer\.doubleClicked = isMouseClick &&/);
 assert.match(input,/else if \(isLeft\) lastClickTime = 0/);
 assert.match(game,/if \(pointer\.pointerType !== 'mouse'\)/);
});

test('propagated fires leave actual new ash scars outside the initial cast',()=>{
 const source=world();
 let current=S.applyMiracle(S.copyWorld(source),source,cast('wildfire',0,2,2)).world;
 let ground=E.newGroundField();
 let burned=false;
 for(let i=0;i<28;i++){
  const next=S.tickEnvironment(current,0.5);
  const newLosses=next.world.trees.filter((tree,index) => tree.burnt && !current.trees[index].burnt)
    .map(tree => ({x:tree.position[0],z:tree.position[2]}));
  ground=E.depositAftermath(ground,newLosses).field;
  current=next.world;
  burned ||= newLosses.length>0;
 }
 assert.ok(burned);
 assert.equal(current.trees[1].burnt,true);
 assert.ok(E.sampleGround(ground,5,2).ash>=0.35);
 assert.equal(E.sampleGround(ground,60,60).ash,0);
});
test('no new casualties cannot allocate new material field',()=>{
 const ground=E.newGroundField();
 assert.equal(E.depositAftermath(ground,[]).field,ground);
 assert.equal(E.depositAftermath(ground,[{x:200,z:200}]).field,ground);
});


// 0.4.0 continuity: actual damaged structures and five material channels,
// not just the session event counter, survive a serialized round trip.
function savedFixture(seed=0x1234ABCD) {
  const trees=C.generateSeededTrees(seed);
  const blocks=[{id:'castle_gate',originalPos:[22,2,-18],size:[4,4,2],color:'#475569',
    destroyed:false,type:'castle',roughness:0.9}];
  const world={blocks,trees};
  const damaged=S.applyMiracle(S.copyWorld(world),world,cast('meteor',22,-18,9,2)).world;
  let ground=E.newGroundField();
  ground=E.impactGround(ground,surfaceCast('volcano',8,8,14,2)).field;
  ground=E.impactGround(ground,surfaceCast('wave',8,8,14,2)).field;
  return {seed,simTime:11.25,world:damaged,ground,cooldowns:{meteor:9.5},
    pendingImpacts:[{power:'meteor',x:23,z:-19,radius:9,force:1,remaining:1.1}],
    crystals:[{id:'crystal_1',position:[8,0,8],scale:2,color:'#c084fc',rotY:1}],
    icePatches:[{id:'ice_1',x:3,z:4,radius:4}]};
}
test('world seed reconstructs the same trees and different seeds differ',()=>{
 const a=C.generateSeededTrees(321), b=C.generateSeededTrees(321), c=C.generateSeededTrees(322);
 assert.equal(JSON.stringify(a),JSON.stringify(b));
 assert.notEqual(JSON.stringify(a),JSON.stringify(c));
 assert.ok(a.length>25 && a.length<=130);
 assert.equal(a[0].id,1);
});
test('full world JSON roundtrip retains damage, cooled stone, cooldowns and pending meteor',()=>{
 const core=savedFixture();
 const record=C.captureKingdom(core,{score:1260,chaosScore:1190,
   chronicle:[{id:'impact_1',time:8,kind:'miracle',title:'Volcano',detail:'Heat remained'}]},101);
 const imported=C.parseKingdom(JSON.stringify(record));
 assert.ok(imported,'valid save must decode');
 assert.equal(imported.score,1260);
 assert.equal(imported.chaosScore,1190);
 assert.equal(imported.simTime,11.25);
 assert.equal(imported.chronicle[0].title,'Volcano');
 assert.equal(imported.world.blocks[0].destroyed,true);
 assert.equal(JSON.stringify(imported.world.trees),JSON.stringify(core.world.trees));
 assert.equal(imported.pendingImpacts[0].remaining,1.1);
 assert.equal(imported.cooldowns.meteor,9.5);
 assert.equal(imported.crystals.length,1);
 assert.equal(imported.icePatches.length,1);
 assert.ok(E.sampleGround(C.hydrateGround(imported.ground),7.5,7.5).stone>0.15);
 assert.equal(C.matchesBaseline(imported,[{...core.world.blocks[0]}]),true);
 assert.equal(C.matchesBaseline(imported,[{...core.world.blocks[0],size:[1,1,1]}]),false);
});
test('capturing a save does not mutate the authoritative source arrays',()=>{
 const core=savedFixture();
 const record=C.captureKingdom(core,{score:1,chaosScore:1,chronicle:[]},10);
 record.ground.stone.fill(0);
 record.world.blocks[0].originalPos[0]=99;
 record.world.trees[0].position[0]=99;
 assert.notEqual(core.world.blocks[0].originalPos[0],99);
 assert.notEqual(core.world.trees[0].position[0],99);
 assert.ok(core.ground.stone.some(x=>x>0));
});
test('save loader rejects malformed, oversized and mismatched seed/tree layouts',()=>{
 const core=savedFixture(321);
 const good=C.captureKingdom(core,{score:1,chaosScore:1,chronicle:[]});
 assert.equal(C.parseKingdom('{invalid'),null);
 assert.equal(C.parseKingdom('a'.repeat(C.MAX_SAVE_BYTES+1)),null);
 const bad=JSON.parse(JSON.stringify(good));
 bad.seed=322;
 assert.equal(C.parseKingdom(JSON.stringify(bad)),null);
 bad.seed=321;
 bad.world.trees[0].position[0]+=3;
 assert.equal(C.parseKingdom(JSON.stringify(bad)),null);
});
test('save loader rejects unsafe material values, duplicate ids and missing channels',()=>{
 const record=C.captureKingdom(savedFixture(),{score:100,chaosScore:100,chronicle:[]});
 const mutate=(fn)=>{const bad=JSON.parse(JSON.stringify(record)); fn(bad);
   return C.parseKingdom(JSON.stringify(bad));};
 assert.equal(mutate(b=>b.ground.heat[0]=-12),null);
 assert.equal(mutate(b=>b.ground.ash.pop()),null);
 assert.equal(mutate(b=>b.world.blocks.push({...b.world.blocks[0]})),null);
 assert.equal(mutate(b=>b.pendingImpacts[0].remaining=-4),null);
 assert.equal(mutate(b=>b.chronicle=[{id:'x',time:4,kind:'reaction',title:'bad',detail:''}]),null);
});
test('saved scorched kingdom still supports precise local restoration after loading',()=>{
 const core=savedFixture();
 const serialized=C.captureKingdom(core,{score:3,chaosScore:3,chronicle:[]});
 const loaded=C.parseKingdom(JSON.stringify(serialized));
 assert.ok(loaded);
 const restored=S.applyMiracle(loaded.world,loaded.world,
   cast('restore',22,-18,10,2));
 // The live engine restores from the original initial-world snapshot, not the
 // damaged payload. Assert the copied pristine structure is unaffected here.
 assert.equal(restored.world.blocks[0].destroyed,true);
 assert.equal(loaded.world.blocks[0].destroyed,true);
 const original={blocks:[{...loaded.world.blocks[0],destroyed:false,integrity:1}],trees:loaded.world.trees};
 const correct=S.applyMiracle(loaded.world,original,cast('restore',22,-18,10,2));
 assert.equal(correct.world.blocks[0].destroyed,false);
 assert.ok(correct.changed);
});
test('autosave and manual-save controls use the same live scene checkpoint',()=>{
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 assert.match(game,/onCheckpoint\?\.\(\{/);
 assert.match(game,/window\.addEventListener\('pagehide', emitCheckpoint\)/);
 assert.match(game,/matchesBaseline\(restoredKingdom, initialBlocks\)/);
 assert.match(game,/worldRef\.current = fresh/);
 assert.match(game,/groundRef\.current = restored \? hydrateGround/);
 assert.match(app,/localStorage\.setItem\(KINGDOM_STORAGE_KEY, serialized\)/);
 assert.match(app,/worldSeed=\{worldSeed\} restoredKingdom=\{restoredKingdom\}/);
 assert.match(app,/onCheckpoint=\{onCheckpoint\}/);
 assert.match(app,/Save kingdom/);
 assert.match(app,/Export world/);
 assert.match(app,/Load world/);
});



test('settled stone and ash do not permanently frighten inhabitants',()=>{
 let field=E.newGroundField();
 field=E.impactGround(field,surfaceCast('crystal',0,0,12,2)).field;
 assert.equal(H.escapeFromHazard(field,0,0),null);
 let after=E.newGroundField();
 after=E.depositAftermath(after,[{x:0,z:0},{x:0,z:0}]).field;
 assert.equal(H.escapeFromHazard(after,0,0),null);
});
test('villagers choose safer ground after the visible catastrophe has ended',()=>{
 const field=E.impactGround(E.newGroundField(),surfaceCast('volcano',0,0,16,2)).field;
 const before=H.hazardAt(field,0,0);
 assert.ok(before>0.28);
 const escape=H.escapeFromHazard(field,0,0);
 assert.ok(escape);
 assert.ok(Math.hypot(escape.x,escape.z)>0.99);
 const destination=H.hazardAt(field,escape.x*15,escape.z*15);
 assert.ok(destination<before,`hazard must reduce from ${before} to ${destination}`);
});
test('flood water also causes flight but pristine ground does not',()=>{
 const base=E.newGroundField();
 assert.equal(H.escapeFromHazard(base,0,0),null);
 const soaked=E.impactGround(base,surfaceCast('wave',0,0,18,2)).field;
 assert.ok(H.escapeFromHazard(soaked,0,0));
});
test('aftereffect navigation is connected to all existing inhabitants',()=>{
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(game,/<Inhabitants key=\{`\$\{worldSeed\}_\$\{resetSignal\}`\} activeDisasters=\{activeDisasters\} simSpeed=\{simSpeed\} fieldRef=\{groundRef\}/);
 assert.match(game,/escapeFromHazard\(fieldRef\.current, p\.x, p\.z\)/);
 assert.match(game,/key=\{`\$\{worldSeed\}_\$\{resetSignal\}`\}/);
 assert.match(game,/function AnimatedHorse\(\{startPos, activeDisasters, simSpeed, fieldRef\}/);
 assert.match(game,/function AnimatedChicken\(\{startPos, activeDisasters, simSpeed, fieldRef\}/);
});
test('renderer refreshes replaced fields with identical revision and frees textures',()=>{
 const component=fs.readFileSync(path.join(root,'components/EnvironmentalMemory.tsx'),'utf8');
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(component,/lastField\.current === field && lastRevision\.current === field\.revision/);
 assert.match(component,/lastField\.current !== field \|\| field\.revision !== lastRevision\.current/);
 assert.match(game,/material\.diffuse\.dispose\(\)/);
 assert.match(game,/waterNormalMap\.dispose\(\)/);
});
test('imported worlds with altered protected colors cannot replace canonical buildings',()=>{
 const original=savedFixture();
 const saved=C.captureKingdom(original,{score:1,chaosScore:1,chronicle:[]});
 const altered=JSON.parse(JSON.stringify(saved));
 altered.world.blocks[0].color='#ff0000';
 const decoded=C.parseKingdom(JSON.stringify(altered));
 assert.ok(decoded);
 assert.equal(C.matchesBaseline(decoded,original.world.blocks),false);
 const bad=JSON.parse(JSON.stringify(saved));
 bad.world.blocks[0].color='url(evil)';
 assert.equal(C.parseKingdom(JSON.stringify(bad)),null);
});


// Temporal branching tests: these exercise complete validated kingdom payloads,
// not fake thumbnail metadata or isolated event log counters.
test('a live valid kingdom becomes a portable immutable historical anchor',()=>{
 const saved=C.captureKingdom(savedFixture(134),{score:413,chaosScore:413,chronicle:[]},34);
 const initial=L.newTimeLedger();
 const ledger=L.recordTimeAnchor(initial,saved,'Before the second sun','origin:1','genesis');
 assert.equal(ledger.anchors.length,1);
 assert.equal(ledger.seed,134);
 assert.equal(ledger.anchors[0].score,413);
 saved.world.blocks[0].destroyed=false;
 saved.ground.heat.fill(0);
 const recovered=L.forkFromTimeAnchor(ledger,ledger.anchors[0].id);
 assert.ok(recovered);
 assert.equal(recovered.restored.world.blocks[0].destroyed,true);
 assert.ok(recovered.restored.ground.heat.some(x=>x>0));
 assert.equal(initial.anchors.length,0,'recording must not mutate an earlier ledger');
});
test('rewinding forks a new future without overwriting the original future',()=>{
 const original=C.captureKingdom(savedFixture(258),{score:0,chaosScore:0,chronicle:[]},1);
 let ledger=L.recordTimeAnchor(L.newTimeLedger(),original,'The beginning','genesis:258','genesis');
 const future={...original,score:200,chaosScore:200,savedAt:2};
 ledger=L.recordTimeAnchor(ledger,future,'The fall','event:fall','event');
 const oldFutureId=ledger.anchors[1].id;
 const newBranch=L.forkFromTimeAnchor(ledger,ledger.anchors[0].id);
 assert.ok(newBranch);
 assert.equal(newBranch.ledger.branch,2);
 assert.equal(newBranch.ledger.nextBranch,3);
 assert.equal(newBranch.restored.score,0);
 ledger=L.recordTimeAnchor(newBranch.ledger,{...newBranch.restored,score:100,chaosScore:100},
   'The other future','event:other','event');
 assert.equal(ledger.anchors[2].branch,2);
 assert.equal(L.forkFromTimeAnchor(ledger,oldFutureId).restored.score,200);
 assert.equal(L.forkFromTimeAnchor(ledger,ledger.anchors[2].id).restored.score,100);
 assert.equal(ledger.anchors.length,3);
});
test('timeline is bounded by count and retains the earliest genesis moment',()=>{
 const original=C.captureKingdom(savedFixture(9),{score:0,chaosScore:0,chronicle:[]},2);
 let ledger=L.newTimeLedger();
 for(let i=0;i<29;i++) ledger=L.recordTimeAnchor(ledger,{...original,score:i,chaosScore:i,savedAt:i+2},
    `Revision ${i}`,`event:${i}`,i?'event':'genesis');
 assert.equal(ledger.anchors.length,L.MAX_TIME_ANCHORS);
 assert.equal(ledger.anchors[0].marker,'event:0');
 assert.equal(ledger.anchors.at(-1).marker,'event:28');
 assert.equal(ledger.nextId,30);
});
test('time anchors reject other seeds, duplicate events, unsafe markers and malformed saves',()=>{
 const world=C.captureKingdom(savedFixture(105),{score:0,chaosScore:0,chronicle:[]},1);
 const other=C.captureKingdom(savedFixture(106),{score:0,chaosScore:0,chronicle:[]},1);
 const ledger=L.recordTimeAnchor(L.newTimeLedger(),world,'Genesis','origin','genesis');
 assert.equal(L.recordTimeAnchor(ledger,other,'Wrong seed','other','manual'),ledger);
 assert.equal(L.recordTimeAnchor(ledger,world,'Repeat','origin','manual'),ledger);
 assert.equal(L.recordTimeAnchor(ledger,world,'Bad marker','x'.repeat(121),'manual'),ledger);
 assert.equal(L.recordTimeAnchor(ledger,{...world,score:-1},'Invalid','neg','manual'),ledger);
 assert.equal(L.forkFromTimeAnchor(ledger,999999),null);
 const corrupt={...ledger,anchors:[{...ledger.anchors[0],serialized:'{corrupt'}]};
 assert.equal(L.forkFromTimeAnchor(corrupt,ledger.anchors[0].id),null);
});
test('timeline captures actual structure and material consequence counts',()=>{
 const world=C.captureKingdom(savedFixture(157),{score:323,chaosScore:323,chronicle:[]},7);
 const ledger=L.recordTimeAnchor(L.newTimeLedger(),world,'Scars','causal:1','event');
 const entry=ledger.anchors[0];
 assert.equal(entry.structuresLost,1);
 assert.equal(entry.treesLost,0);
 assert.ok(entry.scarredCells>0);
 assert.equal(entry.simTime,11.25);
 assert.equal(entry.cause,'event');
});
test('temporal UI and scene use real checkpoint/restore paths, not a mock history list',()=>{
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(app,/recordTimeAnchor\(previous, save, pending\.label/);
 assert.match(app,/forkFromTimeAnchor\(timeline, id\)/);
 assert.match(app,/setRestoredKingdom\(saved\)/);
 assert.match(app,/setGameState\(\{status: 'PAUSED', score: saved\.score/);
 assert.match(app,/aria-label="Temporal atlas"/);
 assert.match(app,/Anchor this moment/);
 assert.match(app,/onBaseline=\{onBaseline\}/);
 assert.match(game,/onCheckpoint\?\.\(\{/);
 assert.match(game,/\}, resetSignal\);/);
 assert.match(game,/onBaseline\?\.\(initialBlocks\)/);
});
test('invalid imported geometry and obsolete frame generations are rejected before mutations',()=>{
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const entry=app.indexOf('const importWorld = async');
 const check=app.indexOf('!matchesBaseline(saved, canonicalBlocksRef.current)',entry);
 const store=app.indexOf('window.localStorage.setItem(KINGDOM_STORAGE_KEY, JSON.stringify(saved))',entry);
 const replace=app.indexOf('setRestoredKingdom(saved);',entry);
 assert.ok(entry>=0 && check>entry && store>check && replace>check);
 assert.match(app,/sourceEpoch !== epochRef\.current/);
 assert.match(app,/epochRef\.current \+= 1/g);
});


test('historical differences reveal destruction and later recovery on the same branch',()=>{
 const base=C.captureKingdom(savedFixture(321),{score:0,chaosScore:0,chronicle:[]},10);
 const pristine={...base,world:{...base.world,blocks:base.world.blocks.map(b=>({...b,destroyed:false}))}};
 let ledger=L.recordTimeAnchor(L.newTimeLedger(),pristine,'Before','before','genesis');
 ledger=L.recordTimeAnchor(ledger,base,'Destruction','destroy','event');
 assert.equal(ledger.anchors[1].structuresDelta,1);
 assert.equal(ledger.anchors[1].parentId,ledger.anchors[0].id);
 ledger=L.recordTimeAnchor(ledger,pristine,'Restoration','restore','event');
 assert.equal(ledger.anchors[2].structuresDelta,-1);
 assert.equal(ledger.anchors[2].parentId,ledger.anchors[1].id);
});
test('fork deltas compare against the actual chosen ancestor, not a discarded future',()=>{
 const base=C.captureKingdom(savedFixture(565),{score:0,chaosScore:0,chronicle:[]},10);
 let ledger=L.recordTimeAnchor(L.newTimeLedger(),base,'Past','a0','genesis');
 ledger=L.recordTimeAnchor(ledger,{...base,score:99},'Future','a1','event');
 const fork=L.forkFromTimeAnchor(ledger,ledger.anchors[0].id);
 assert.ok(fork);
 ledger=L.recordTimeAnchor(fork.ledger,fork.restored,'Other beginning','fork0','fork');
 assert.equal(ledger.anchors[2].parentId,ledger.anchors[0].id);
 assert.equal(ledger.anchors[2].structuresDelta,0);
});
test('time-travel source keeps version-one world-save compatibility',()=>{
 const saved=C.captureKingdom(savedFixture(12),{score:222,chaosScore:222,chronicle:[]},11);
 const decoded=C.parseKingdom(JSON.stringify(saved));
 assert.equal(decoded.format,C.KINGDOM_FORMAT);
 assert.equal(decoded.score,222);
 assert.equal(decoded.ground.ash.length,E.FIELD_COUNT);
});
test('hover positioning remains inside Three frame refs rather than React reconciliation',()=>{
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.doesNotMatch(game,/setMouseGroundPos|mouseGroundPos/);
 assert.match(game,/hoverGroundRef\.current\.copy\(scratchVec\)/);
 assert.match(game,/groundPosRef=\{hoverGroundRef\}/);
 assert.match(game,/positionRef=\{hoverGroundRef\}/);
 assert.match(game,/mandala\.position\.set\(position\.x, 0\.15, position\.z\)/);
});
test('asynchronous world import aborts if another import or kingdom transition wins',()=>{
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 assert.match(app,/const startedInEpoch = epochRef\.current/);
 assert.match(app,/const sequence = \+\+importSequenceRef\.current/);
 assert.match(app,/startedInEpoch !== epochRef\.current \|\| sequence !== importSequenceRef\.current/);
});


// V0.6.0: causally connected risk, ecology, inspection and recovery.
test('live-ground impact forecast uses production damage and remains immutable', () => {
 const origin=world(), ground=E.newGroundField();
 const request=cast('earthquake',0,0,12,2);
 const estimated=F.forecastImpact(origin,origin,ground,request);
 const actual=S.applyMiracle(origin,origin,request);
 assert.equal(estimated.collapsed,actual.destroyed.length);
 assert.equal(estimated.affectedCells,E.impactGround(ground,request).affected);
 assert.equal(origin.blocks[0].destroyed,false);
 assert.equal(ground.revision,0);
});
test('forecast describes delayed meteor, actual local restoration and later effects honestly',()=>{
 const original=world();
 const damaged=S.applyMiracle(original,original,cast('meteor',0,0,8,2)).world;
 const impact=F.forecastImpact(original,original,E.newGroundField(),cast('meteor',0,0,8,2));
 assert.equal(impact.delayed,true);
 const restore=F.forecastImpact(damaged,original,E.newGroundField(),cast('restore',0,0,9,1));
 assert.equal(restore.repaired,2);
 assert.match(F.formatForecast(impact),/delayed/);
 assert.match(F.formatForecast(impact),/Secondary fires/);
});
test('out-of-world forecast and cast coordinates fail safely',()=>{
 for(const coordinate of [78,-78,100,Number.NaN]) {
  assert.equal(F.insideKingdom(coordinate,0),false);
  assert.equal(F.forecastImpact(world(),world(),E.newGroundField(),cast('lightning',coordinate,0)).permitted,false);
 }
 assert.equal(F.insideKingdom(0,0),true);
 const source=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(source,/if \(!insideKingdom\(pos\.x, pos\.z\)\)/);
});
test('wind is deterministic, bounded, changes over world time and never reads wall clock',()=>{
 assert.deepEqual(W.windAt(50,12),W.windAt(50,12));
 const a=W.windAt(0,12),b=W.windAt(300,12);
 assert.notEqual(a.name+ a.x.toFixed(2), b.name+b.x.toFixed(2));
 for (const value of [a,b,W.windAt(NaN,-17)]) {
  assert.ok(value.strength>=0.6 && value.strength<=1.001);
  assert.ok(['north','south','east','west'].includes(value.name));
  assert.ok(Math.hypot(value.x,value.z)<=1.001);
 }
});
test('a changing wind extends downwind fire and limits upwind fire',()=>{
 const start=world();
 const lit=S.applyMiracle(start,start,cast('wildfire',0,2,2)).world;
 assert.equal(S.tickEnvironment(lit,0.5,1,0).world.trees[1].onFire,true);
 assert.equal(S.tickEnvironment(lit,0.5,-1,0).world.trees[1].onFire,false);
});
test('river runoff advances excess water toward x zero and discharges it',()=>{
 const base=E.newGroundField();
 const west=E.cellIndex(-12.5,2.5),closer=E.cellIndex(-7.5,2.5);
 base.water[west]=1;
 const result=E.advanceGround(base,0.5).field;
 assert.ok(result.water[closer]>0,'riverward cell gains water');
 assert.ok(result.water[west]<1,'source loses water');
 assert.equal(base.water[west],1,'source field never mutated');
 const river=E.cellIndex(2.5,2.5);
 const alone=E.newGroundField();alone.water[river]=1;
 assert.ok(E.advanceGround(alone,0.5).field.water[river]<0.94);
});
test('scorched trees regrow only in cool moist soil, with saved progression',()=>{
 const initial=world();const burnt=S.copyWorld(initial);
 burnt.trees[0].burnt=true;
 const dry=S.tickEnvironment(burnt,0.5,1,0,()=>({heat:0,water:0,frost:0,ash:0,stone:0}));
 assert.equal(dry.world.trees[0].regrowth,undefined);
 const sample=()=>({heat:0,water:0.9,frost:0,ash:0.2,stone:0});
 let current=burnt;
 for(let i=0;i<80;i++)current=S.tickEnvironment(current,0.5,1,0,sample).world;
 assert.equal(current.trees[0].burnt,false,'successful restoration from sustained benign conditions');
 assert.equal(current.trees[0].onFire,false);
});
test('regrowth progress stays compatible with v1 world saves and blocks corrupt values',()=>{
 const core=savedFixture(3000);core.world.trees[0].burnt=true;core.world.trees[0].regrowth=0.44;
 const saved=C.captureKingdom(core,{score:0,chaosScore:0,chronicle:[]});
 assert.equal(C.parseKingdom(JSON.stringify(saved)).world.trees[0].regrowth,0.44);
 const invalid=JSON.parse(JSON.stringify(saved));invalid.world.trees[0].regrowth=9;
 assert.equal(C.parseKingdom(JSON.stringify(invalid)),null);
 delete saved.world.trees[0].regrowth;
 assert.ok(C.parseKingdom(JSON.stringify(saved)),'legacy save remains valid');
});
test('precise ground inspection reports numbers and hazard level',()=>{
 const ground=E.impactGround(E.newGroundField(),cast('volcano',0,0,12,2)).field;
 assert.match(E.describeGround(ground,2.5,2.5),/Heat [0-9]+%/);
 assert.match(E.describeGround(ground,2.5,2.5),/Hazard [0-9]+%/);
 assert.match(E.describeGround(ground,80,0),/Beyond the mapped/);
});
test('surface layer changes trigger render refresh without altering material channels',()=>{
 const view=fs.readFileSync(path.join(root,'components/EnvironmentalMemory.tsx'),'utf8');
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(view,/lastLayer\.current === layer/);
 assert.match(view,/layer === 'all' \|\| layer === 'heat'/);
 assert.match(game,/<EnvironmentalMemory fieldRef=\{groundRef\} layer=\{memoryLayer\}/);
});
test('timeline pruning removes no dangling parent references and recomputes deltas',()=>{
 const base=C.captureKingdom(savedFixture(488),{score:0,chaosScore:0,chronicle:[]},100);
 let ledger=L.newTimeLedger();
 for(let i=0;i<24;i++){
  const w={...base,world:{...base.world,blocks:base.world.blocks.map((block,index)=>
    index===0?{...block,destroyed:i%2===0}:block)}};
  ledger=L.recordTimeAnchor(ledger,w,`Moment ${i}`,`event:prune-${i}`,i===0?'genesis':'event');
 }
 assert.equal(ledger.anchors.length,12);
 const map=new Map(ledger.anchors.map(a=>[a.id,a]));
 for(const a of ledger.anchors){
  assert.ok(a.parentId===null || map.has(a.parentId),'every ancestor must survive');
  const p=map.get(a.parentId);
  assert.equal(a.structuresDelta,a.structuresLost-(p?.structuresLost ?? a.structuresLost));
 }
 assert.equal(ledger.anchors[0].cause,'genesis');
});
test('fork source is retained when trimming the Time Atlas',()=>{
 const base=C.captureKingdom(savedFixture(897),{score:0,chaosScore:0,chronicle:[]},3);
 let l=L.recordTimeAnchor(L.newTimeLedger(),base,'Start','start','genesis');
 l=L.recordTimeAnchor(l,base,'Chosen fork','fork-base','manual');
 const forkId=l.anchors[1].id;
 l=L.forkFromTimeAnchor(l,forkId).ledger;
 for(let i=0;i<25;i++)l=L.recordTimeAnchor(l,base,`Fork event ${i}`,`event:f${i}`,'event');
 assert.ok(l.anchors.some(x=>x.id===forkId));
 assert.ok(L.previousMoment(l));
});
test('undo resolves the closest causal predecessor, not arbitrary prior array entry',()=>{
 const base=C.captureKingdom(savedFixture(333),{score:0,chaosScore:0,chronicle:[]},1);
 let l=L.recordTimeAnchor(L.newTimeLedger(),base,'Origin','undo:0','genesis');
 l=L.recordTimeAnchor(l,base,'First event','undo:1','event');
 assert.equal(L.previousMoment(l).id,l.anchors[0].id);
 l=L.forkFromTimeAnchor(l,l.anchors[0].id).ledger;
 assert.equal(L.previousMoment(l).id,l.anchors[0].id);
});
test('vault protects occupied slots and restores valid full worlds',()=>{
 const data=new Map();const store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const original=C.captureKingdom(savedFixture(22),{score:88,chaosScore:88,chronicle:[]});
 assert.equal(V.writeSlot(store,1,original), 'saved');
 const replacement={...original,score:999};
 assert.equal(V.writeSlot(store,1,replacement),'occupied');
 assert.equal(V.readSlot(store,1).score,88);
 assert.equal(V.writeSlot(store,1,replacement,true),'saved');
 assert.equal(V.readSlot(store,1).score,999);
 assert.equal(V.summaries(store).length,1);
});
test('vault refuses corrupt/oversized data and storage errors without erasure',()=>{
 const data=new Map();const store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const valid=C.captureKingdom(savedFixture(23),{score:3,chaosScore:3,chronicle:[]});
 V.writeSlot(store,2,valid);
 assert.equal(V.writeSlot(store,2,{...valid,score:Infinity},true),'invalid');
 assert.equal(V.readSlot(store,2).score,3);
 const throwing={getItem:()=>null,setItem:()=>{throw Error('quota');}};
 assert.equal(V.writeSlot(throwing,1,valid),'storage-unavailable');
});
test('forecast, vault, undo, wind and UI panels connect to Game and App',()=>{
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.match(game,/forecastImpact\(worldRef\.current, initialWorld, groundRef\.current/);
 assert.match(game,/onInspect\?\.\(`\$\{formatForecast\(prediction\)\}/);
 assert.match(game,/onWind\?\.\(windAt/);
 assert.match(app,/const undoId = previousMoment\(timeline\)/);
 assert.match(app,/writeSlot\(window\.localStorage, pendingVault\.slot, save/);
 assert.match(app,/readSlot\(window\.localStorage, slot\)/);
 assert.match(app,/aria-label="Surface overlay channel"/);
 assert.match(app,/setPowerMenuOpen\(false\);setSettingsOpen\(false\);setHelpOpen\(false\)/);
 assert.match(app,/if \(event\.key === 'Escape'\)/);
});
test('runoff never overfills an already saturated riverward cell',()=>{
 const base=E.newGroundField();
 const source=E.cellIndex(-12.5,2.5), down=E.cellIndex(-7.5,2.5);
 base.water[source]=0.9;base.water[down]=1;
 const next=E.advanceGround(base,0.5).field;
 assert.ok(next.water[down]<=1);
 assert.ok(next.water[source]>=0.7);
 assert.ok(Math.abs(base.water[source]-0.9)<0.000001);
});
test('wind indicator initializes from persisted time, and vault errors stay caught',()=>{
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 assert.match(app,/useState<Wind>\(\(\) => windAt\(restoredKingdom\?\.simTime \?\? 0, worldSeed\)\)/);
 assert.match(app,/try \{result = writeSlot\(window\.localStorage, pendingVault\.slot/);
 assert.match(app,/if \(pendingVaultRef\.current\) setVaultStatus\('Snapshot failed validation/);
 assert.match(app,/occupied \? 'Unreadable slot; replacement requires explicit action'/);
});
test('rewind cancels pending vault writes from a superseded world epoch',()=>{
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const start=app.indexOf('const rewindTo =');
 const end=app.indexOf('const undoId =',start);
 assert.ok(start>=0 && end>start);
 assert.match(app.slice(start,end),/pendingVaultRef\.current = null/);
});


// The Covenant is a real, optional game mode over the same authoritative world.
const R = load('trial.ts');
function trialWorld() {
  return {blocks: [
    ...Array.from({length: 3}, (_,i)=> ({id:`bridge_${i}`,originalPos:[i*2,0,0],type:'bridge',destroyed:false})),
    ...Array.from({length: 13}, (_,i)=> ({id:`castle_${i}`,originalPos:[22+i%4,0,-18+Math.floor(i/4)],type:'castle',destroyed:false})),
    {id:'mill',originalPos:[-10,0,10],type:'mill',destroyed:false},
    {id:'village',originalPos:[-24,0,0],type:'village',destroyed:false},
  ],trees:C.generateSeededTrees(1234567)};
}
function verifiedGroveResponse(run,world,type='wave',location) {
  const target=R.trialTarget(run), origin=location??target;
  const burning=S.applyMiracle(world,world,cast('wildfire',target.x,target.z,10,1)).world;
  const protectedWorld=S.applyMiracle(burning,world,cast(type,origin.x,origin.z,11,1)).world;
  return R.trialRecordResponse(run,type,origin,burning,protectedWorld);
}
function progressTrial(state,world,time) {
  let current=state;const threats=[];const notices=[];
  for(let i=0;i<Math.round(time*2);i++) {
    const result=R.trialStep(current,0.5,world);
    current=result.state;threats.push(...result.threats);notices.push(...result.notices);
  }
  return {current,threats,notices};
}
test('trial starts as an optional self-contained session on the actual kingdom',()=>{
 const original=trialWorld(),before=JSON.stringify(original),start=R.startTrial(original);
 assert.equal(start.result,'running');assert.equal(start.stage,0);assert.equal(start.energy,100);
 assert.ok(start.initialGroveAlive>0);assert.equal(JSON.stringify(original),before);
 assert.equal(R.trialTarget(start).x,start.grove.x);
 assert.ok(R.trialView(start,original).objective.includes('grove'));
});
test('warning countdown advances on simulation time only and fires once',()=>{
 const w=trialWorld(),initial=R.startTrial(w);
 assert.equal(R.trialStep(initial,0,w).state,initial);
 const early=progressTrial(initial,w,5.5);assert.equal(early.threats.length,0);
 const due=R.trialStep(early.current,.5,w);
 assert.equal(due.threats.length,1);assert.equal(due.threats[0].type,'wildfire');
 assert.equal(R.trialStep(due.state,.5,w).threats.length,0);
 assert.equal(R.trialView(due.state,w).nextThreat,null);
});
test('trial casting has a real limited pool and regenerates without overflow',()=>{
 const w=trialWorld();let s=R.startTrial(w);
 assert.equal(R.TRIAL_COST.restore,38);
 const first=R.trialSpend(s,'meteor');assert.equal(first.accepted,true);s=first.run;
 const second=R.trialSpend(s,'meteor');assert.equal(second.accepted,true);s=second.run;
 const rejected=R.trialSpend(s,'restore');assert.equal(rejected.accepted,false);
 assert.equal(rejected.run,s);assert.equal(s.energy,20);
 s=progressTrial(s,w,5).current;assert.ok(Math.abs(s.energy-28)<1e-8);
 for(let i=0;i<3;i++) s=R.trialSpend(s,'wave').run; // only first affordable
 assert.ok(s.energy>=0 && s.energy<=100);
});
test('forest stage cannot succeed through an unexecuted hazard or without a protective response',()=>{
 const w=trialWorld();let s=R.startTrial(w);
 s=progressTrial(s,w,15).current;assert.equal(s.result,'running');
 // Even if the world is pristine, a warning alone is not a completed event.
 assert.equal(s.hazardHit,false);
 s=R.trialRecordThreat(s,'wildfire');
 assert.equal(s.hazardHit,true);
 s=R.trialStep(s,.5,w).state;
 assert.equal(s.stage,0);
 const wrong=verifiedGroveResponse(s,w,'wave',{x:70,z:70});assert.equal(wrong,s);
 const right=verifiedGroveResponse(s,w,'wave');assert.equal(right.responses,1);
 const advanced=R.trialStep(right,.5,w).state;
 assert.equal(advanced.stage,1);assert.equal(advanced.cleared,1);assert.ok(advanced.score>250);
});
test('forest stage respects actual burnt trees even after a player response',()=>{
 const w=trialWorld();let s=R.startTrial(w);
 s=progressTrial(s,w,10).current;s=R.trialRecordThreat(s,'wildfire');
 s=verifiedGroveResponse(s,w,'freeze');
 const damaged=S.copyWorld(w);const target=R.trialTarget(s);
 for(const t of damaged.trees) if(Math.hypot(t.position[0]-target.x,t.position[2]-target.z)<=13) t.burnt=true;
 const final=R.trialStep(s,1,damaged).state;
 assert.equal(final.stage,0);assert.equal(final.result,'running');
});
test('trial forge requires real quench by wave and a standing bridge',()=>{
 const w=trialWorld();let s=R.startTrial(w);s=progressTrial(s,w,15).current;
 s=R.trialRecordThreat(s,'wildfire');s=verifiedGroveResponse(s,w,'wave');
 s=R.trialStep(s,.5,w).state;assert.equal(s.stage,1);
 s=progressTrial(s,w,5).current;assert.equal(s.stage,1);
 s=R.trialRecordThreat(s,'volcano');
 const target=R.trialTarget(s);
 const hot=E.impactGround(E.newGroundField(),cast('volcano',target.x,target.z,8.5,.95));
 const cooled=E.impactGround(hot.field,cast('wave',target.x,target.z,11,1));
 assert.ok(cooled.formedStone>=2,`formed stone: ${cooled.formedStone}`);
 assert.equal(R.trialRecordQuench(s,'crystal',10,target),s);
 s=R.trialRecordQuench(s,'wave',cooled.formedStone,target);
 const broken=S.copyWorld(w);broken.blocks.filter(b=>b.type==='bridge').forEach(b=>b.destroyed=true);
 assert.equal(progressTrial(s,broken,4).current.stage,1);
 const recovered=R.trialStep(s,3,w).state;assert.equal(recovered.stage,1); // one step capped
 const result=progressTrial(recovered,w,4).current;
 assert.equal(result.stage,2);assert.equal(result.cleared,2);
});
test('final meteor stage cannot win without actual impact and subsequent repair',()=>{
 const w=trialWorld();let s=R.startTrial(w);s=progressTrial(s,w,15).current;
 s=R.trialRecordThreat(s,'wildfire');s=verifiedGroveResponse(s,w,'wave');s=R.trialStep(s,.5,w).state;
 s=progressTrial(s,w,8).current;s=R.trialRecordThreat(s,'volcano');s=R.trialRecordQuench(s,'wave',3,R.trialTarget(s));
 s=R.trialStep(s,.5,w).state;assert.equal(s.stage,2);
 s=progressTrial(s,w,15).current;
 assert.equal(s.stage,2);assert.equal(s.result,'running');
 // Even a would-be 'restore' before the meteor hits does not count.
 assert.equal(R.trialRecordResponse(s,'restore',R.trialTarget(s),w,w),s);
 const hit=R.trialRecordThreat(s,'meteor');assert.equal(hit.hazardHit,true);
 const ruined=S.applyMiracle(w,w,cast('meteor',22,-18,11,1.15)).world;
 assert.ok(ruined.blocks.some(b=>b.destroyed && b.type==='castle'));
 assert.equal(R.trialStep(hit,.5,ruined).state.stage,2);
 const healed=S.applyMiracle(ruined,w,cast('restore',22,-18,16,1)).world;
 const responded=R.trialRecordResponse(hit,'restore',R.trialTarget(hit),ruined,healed);
 const win=R.trialStep(responded,.5,healed).state;
 assert.equal(win.result,'victory');assert.equal(win.cleared,3);assert.ok(win.score>750);
 assert.equal(R.trialSpend(win,'wave').accepted,false);
});
test('time limits produce actual defeat rather than an infinite noninteractive screen',()=>{
 const w=trialWorld();const done=progressTrial(R.startTrial(w),w,45);
 assert.equal(done.current.result,'defeat');assert.equal(done.current.stage,0);
 assert.equal(R.trialStep(done.current,1,w).state,done.current);
 assert.ok(done.notices.some(n=>n.includes('not contained')));
});
test('trial code path consumes will before casting and opponents use real miracles',()=>{
 const src=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const ui=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 assert.ok(src.includes('trialSpend(currentTrial, powerType)'));
 assert.ok(src.includes('if (!spent.accepted)'));
 assert.ok(src.includes('executeThreat(threat)'));
 assert.ok(src.includes("applyImpact(threat.type,position,threat.radius,threat.force,'world')"));
 assert.ok(src.includes("impact.source ?? 'player'"));
 assert.ok(src.includes('trialRecordThreat(trialRef.current,powerType)'));
 assert.ok(src.includes("next.score && !trialRef.current"));
 assert.ok(src.includes('<TrialBeacon target={trialMarker.target}'));
 assert.ok(ui.includes('trialEnabled={trialEnabled} trialGeneration={trialGeneration} onTrialView={onTrialView}'));
 assert.ok(ui.includes('setCameraPreset(`trial:${trialProgress.target.x}:${trialProgress.target.z}`)'));
 assert.ok(ui.includes('disabled={trialEnabled && trialProgress?.result === \'running\'}'));
});

test('a complete three-ordeal victory is achievable through the actual miracle and terrain rules',()=>{
 for(const seed of [3,73,777,1234567,404404]) {
  const layout=trialWorld(); layout.trees=C.generateSeededTrees(seed);
  let w=S.copyWorld(layout);let g=E.newGroundField();let s=R.startTrial(w);
  // Stage 1: the scheduled wildfire really ignites real trees, not fake mission counters.
  let fire;
  for(let i=0;i<12;i++) {const tick=R.trialStep(s,.5,w);s=tick.state;if(tick.threats.length)fire=tick.threats[0];}
  assert.ok(fire,`fire event for seed ${seed}`);
  w=S.applyMiracle(w,layout,fire).world;
  g=E.impactGround(g,fire).field;
  s=R.trialRecordThreat(s,'wildfire');
  const defense=R.trialSpend(s,'wave');assert.equal(defense.accepted,true);s=defense.run;
  const fireBefore=w;
  w=S.applyMiracle(w,layout,cast('wave',fire.x,fire.z,11,1)).world;
  g=E.impactGround(g,cast('wave',fire.x,fire.z,11,1)).field;
  s=R.trialRecordResponse(s,'wave',fire,fireBefore,w);
  while(s.stage===0 && s.result==='running') s=R.trialStep(s,.5,w).state;
  assert.equal(s.stage,1,`grove survival for seed ${seed}`);
  // Stage 2: real magma, actual quenching reaction, and a repaired real bridge.
  let vent;
  for(let i=0;i<10;i++) {const tick=R.trialStep(s,.5,w);s=tick.state;if(tick.threats.length)vent=tick.threats[0];}
  assert.ok(vent);w=S.applyMiracle(w,layout,vent).world;
  g=E.impactGround(g,vent).field;
  s=R.trialRecordThreat(s,'volcano');
  let paid=R.trialSpend(s,'wave');assert.equal(paid.accepted,true);s=paid.run;
  const quench=E.impactGround(g,cast('wave',vent.x,vent.z,11,1));g=quench.field;
  assert.ok(quench.formedStone>=2,`genuine quench for seed ${seed}`);
  w=S.applyMiracle(w,layout,cast('wave',vent.x,vent.z,11,1)).world;
  s=R.trialRecordQuench(s,'wave',quench.formedStone,vent);
  paid=R.trialSpend(s,'restore');assert.equal(paid.accepted,true);s=paid.run;
  w=S.applyMiracle(w,layout,cast('restore',0,0,16,1)).world;
  while(s.stage===1 && s.result==='running')s=R.trialStep(s,.5,w).state;
  assert.equal(s.stage,2,`bridge retained for seed ${seed}`);
  // Stage 3: no win until the actual meteor impact, then player restores castle.
  let meteor;
  for(let i=0;i<14;i++) {const tick=R.trialStep(s,.5,w);s=tick.state;if(tick.threats.length)meteor=tick.threats[0];}
  assert.ok(meteor);assert.equal(meteor.type,'meteor');
  assert.equal(R.trialStep(s,.5,w).state.result,'running');
  w=S.applyMiracle(w,layout,meteor).world;
  s=R.trialRecordThreat(s,'meteor');
  paid=R.trialSpend(s,'restore');assert.equal(paid.accepted,true);s=paid.run;
  const ruinedBefore=w;
  w=S.applyMiracle(w,layout,cast('restore',22,-18,16,1)).world;
  s=R.trialRecordResponse(s,'restore',{x:22,z:-18},ruinedBefore,w);
  while(s.stage===2 && s.result==='running')s=R.trialStep(s,.5,w).state;
  assert.equal(s.result,'victory',`win for seed ${seed}`);
  assert.equal(s.cleared,3);
 }
});
test('import and rewind guard the current live trial without cancelling a rejected import',()=>{
 const ui=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const start=ui.indexOf('const activateSavedWorld =');
 const gate=ui.indexOf('matchesBaseline(saved, canonicalBlocksRef.current)',start);
 const cancel=ui.indexOf('setTrialEnabled(false)',start);
 assert.ok(start>=0 && gate>start && cancel>gate);
 assert.ok(ui.includes('The Time Atlas is locked during a live Covenant ordeal'));
 assert.ok(ui.includes('setTrialEnabled(false);setTrialProgress(null);setTrialOpen(false);'));
 const scene=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.ok(scene.includes('pendingTapRef.current = []; }, [trialGeneration,trialEnabled]'));
});
test('delayed response can still contain a real live fire after four environmental ticks',()=>{
 const original=trialWorld();let w=S.copyWorld(original);let g=E.newGroundField();let s=R.startTrial(w);
 let threat;
 for(let i=0;i<12;i++) {const t=R.trialStep(s,.5,w);s=t.state;threat=t.threats[0]??threat;}
 assert.ok(threat && threat.type==='wildfire');
 w=S.applyMiracle(w,original,threat).world;g=E.impactGround(g,threat).field;
 s=R.trialRecordThreat(s,'wildfire');
 for(let i=0;i<4;i++) {g=E.advanceGround(g,.5).field;
   w=S.tickEnvironment(w,.5,1,0,(x,z)=>E.sampleGround(g,x,z)).world;
   s=R.trialStep(s,.5,w).state;}
 assert.equal(s.result,'running');
 const charged=R.trialSpend(s,'wave');assert.equal(charged.accepted,true);s=charged.run;
 const responseBefore=w;
 w=S.applyMiracle(w,original,cast('wave',threat.x,threat.z,11,1)).world;
 g=E.impactGround(g,cast('wave',threat.x,threat.z,11,1)).field;
 s=R.trialRecordResponse(s,'wave',threat,responseBefore,w);
 for(let i=0;i<8 && s.stage===0 && s.result==='running';i++) {
   g=E.advanceGround(g,.5).field;
   w=S.tickEnvironment(w,.5,1,0,(x,z)=>E.sampleGround(g,x,z)).world;
   s=R.trialStep(s,.5,w).state;
 }
 assert.equal(s.stage,1,`live fire outcome: ${JSON.stringify(R.trialView(s,w))}`);
});
test('trial exit restores prior sandbox controls and compact HUD can reveal the world',()=>{
 const ui=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 assert.ok(ui.includes('preTrialSettingsRef.current = {speed:simulationSpeed,force:powerForce}'));
 assert.ok(ui.includes('if (prior) {setSimulationSpeed(prior.speed);setPowerForce(prior.force);}'));
 assert.ok(ui.includes('restorePreTrialSettings();'));
 assert.ok(ui.includes('onClick={() => setTrialOpen(prev => !prev)}'));
 assert.ok(ui.includes('trialEnabled && !trialOpen && trialProgress?.result'));
 assert.ok(ui.includes('aria-live="off"'));
 assert.ok(!ui.includes('Math.max(trialBest,trialProgress.score)'));
});

// 0.8.0 adversarial contract: a trial must be won by real consequences, not empty animations.
test('Covenant refuses a no-op defense after a warning',()=>{
 const w=trialWorld();let s=progressTrial(R.startTrial(w),w,13).current;
 s=R.trialRecordThreat(s,'wildfire');const t=R.trialTarget(s);
 assert.equal(R.trialRecordResponse(s,'wave',t,w,w),s);
 assert.equal(progressTrial(s,w,5).current.stage,0);
});
test('a defense of unrelated trees is not credited to the sacred grove',()=>{
 const w=trialWorld();let s=progressTrial(R.startTrial(w),w,13).current;
 s=R.trialRecordThreat(s,'wildfire');const t=R.trialTarget(s);
 const burning=S.copyWorld(w),saved=S.copyWorld(w);
 let distant=burning.trees.find(tree=>Math.hypot(tree.position[0]-t.x,tree.position[2]-t.z)>27);
 assert.ok(distant);distant.onFire=true;
 assert.equal(R.trialRecordResponse(s,'wave',t,burning,saved),s);
});
test('a witnessed real extinguish increments the trial once; stale repeats do not',()=>{
 const w=trialWorld();let s=progressTrial(R.startTrial(w),w,13).current;
 s=R.trialRecordThreat(s,'wildfire');const target=R.trialTarget(s);
 const burning=S.applyMiracle(w,w,cast('wildfire',target.x,target.z,10,1)).world;
 const cooled=S.applyMiracle(burning,w,cast('wave',target.x,target.z,11,1)).world;
 const credited=R.trialRecordResponse(s,'wave',target,burning,cooled);
 assert.equal(credited.responses,1);
 assert.equal(R.trialRecordResponse(credited,'wave',target,cooled,cooled),credited);
});
test('forge rejects remote quenching and pre-impact quenching',()=>{
 const w=trialWorld();let s=progressTrial(R.startTrial(w),w,13).current;
 s=R.trialRecordThreat(s,'wildfire');s=verifiedGroveResponse(s,w);
 s=R.trialStep(s,.5,w).state;assert.equal(s.stage,1);
 assert.equal(R.trialRecordQuench(s,'wave',20,{x:6,z:5}),s);
 s=progressTrial(s,w,5).current;s=R.trialRecordThreat(s,'volcano');
 assert.equal(R.trialRecordQuench(s,'wave',300,{x:67,z:66}),s);
 assert.equal(R.trialRecordQuench(s,'wave',2,{x:6,z:5}).quenched,2);
});
test('Covenant remembers peak actual harm after rebuilding',()=>{
 const w=trialWorld();let s=R.startTrial(w),point=R.trialTarget(s);
 const fire=S.applyMiracle(w,w,cast('wildfire',point.x,point.z,11,1)).world;
 // Simulate a burned grove, followed by a return to pristine appearance.
 const injured=S.copyWorld(fire);const burned=injured.trees.find(t=>Math.hypot(t.position[0]-point.x,t.position[2]-point.z)<=11);
 assert.ok(burned);burned.burnt=true;burned.onFire=false;
 s=R.trialObserve(s,injured);assert.ok(s.worstDamage>=1);
 assert.equal(R.trialObserve(s,w).worstDamage,s.worstDamage);
 const after=progressTrial(s,w,2).current;assert.ok(after.worstDamage>=1);
});
test('score distinguishes carefully preserved kingdoms from damaged ones',()=>{
 const w=trialWorld();let s=progressTrial(R.startTrial(w),w,13).current;
 s=R.trialRecordThreat(s,'wildfire');s=verifiedGroveResponse(s,w);
 const preserved=R.trialStep(s,.5,w).state;
 const damaged=R.trialStep({...s,worstDamage:5,energy:Math.max(0,s.energy-34),casts:s.casts+4},.5,w).state;
 assert.equal(preserved.stage,1);assert.equal(damaged.stage,1);
 assert.equal(preserved.reports[0].result,'secured');
 assert.ok(preserved.reports[0].points>damaged.reports[0].points);
 assert.ok(preserved.reports[0].grade!== 'F');
});
test('each successful ordeal produces exactly one grounded report',()=>{
 const w=trialWorld();let s=progressTrial(R.startTrial(w),w,13).current;
 s=R.trialRecordThreat(s,'wildfire');s=verifiedGroveResponse(s,w);
 s=R.trialStep(s,.5,w).state;
 assert.equal(s.reports.length,1);assert.equal(s.reports[0].stage,0);
 assert.equal(R.trialStep(s,.5,w).state.reports.length,1);
 assert.equal(R.trialView(s,w).reports.length,1);
});
test('a failed ordeal gets a truthful failure report without bonus points',()=>{
 const w=trialWorld(), result=progressTrial(R.startTrial(w),w,45).current;
 assert.equal(result.result,'defeat');assert.equal(result.reports.length,1);
 assert.equal(result.reports[0].grade,'F');assert.equal(result.reports[0].points,0);
 assert.equal(result.reports[0].result,'failed');
});
test('a ruined, zero-survivor grove cannot be passed through an empty response',()=>{
 const w=trialWorld();w.trees.forEach(t=>{t.burnt=true;t.onFire=false;});
 let s=progressTrial(R.startTrial(w),w,15).current;
 assert.equal(s.initialGroveAlive,0);
 s=R.trialRecordThreat(s,'wildfire');
 const result=R.trialStep(s,.5,w).state;assert.equal(result.stage,0);
});
test('tactical signals are sourced from physical burning and damaged entities',()=>{
 const w=trialWorld();let s=R.startTrial(w);const p=R.trialTarget(s);
 let ignite=w.trees.find(t=>Math.hypot(t.position[0]-p.x,t.position[2]-p.z)<13);
 assert.ok(ignite);ignite.onFire=true;
 const viewed=R.trialView(s,w);
 assert.ok(viewed.signals.some(x=>x.kind==='fire' && x.x===ignite.position[0]));
 assert.ok(viewed.nextAction.includes('Find the marked place'));
 assert.ok(viewed.signals.length<=16);
});
test('battle responses require actual castle restoration, not a cosmetic spell',()=>{
 const w=trialWorld();let s=progressTrial(R.startTrial(w),w,13).current;
 s=R.trialRecordThreat(s,'wildfire');s=verifiedGroveResponse(s,w);s=R.trialStep(s,.5,w).state;
 s=progressTrial(s,w,8).current;s=R.trialRecordThreat(s,'volcano');
 s=R.trialRecordQuench(s,'wave',3,R.trialTarget(s));s=R.trialStep(s,.5,w).state;
 assert.equal(s.stage,2);
 s=progressTrial(s,w,15).current;s=R.trialRecordThreat(s,'meteor');
 assert.equal(R.trialRecordResponse(s,'restore',R.trialTarget(s),w,w),s);
 const ruined=S.applyMiracle(w,w,cast('meteor',22,-18,11,1.15)).world;
 const healed=S.applyMiracle(ruined,w,cast('restore',22,-18,16,1)).world;
 assert.equal(R.trialRecordResponse(s,'restore',R.trialTarget(s),ruined,healed).responses,1);
});
test('production wiring restores exact trial state on retry and keeps sandbox separate',()=>{
 const src=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 assert.match(src,/trialOriginRef = useRef</);
 assert.match(src,/origin\.generation=trialGeneration/);
 for(const fragment of ['worldRef.current=copyWorld(origin.world)','groundRef.current=origin.ground',
   'simClockRef.current=origin.time','setDebris([]);setActiveDisasters([])',
   'pendingImpactsRef.current=origin.pending.map','setGameState(previous =>']) assert.ok(src.includes(fragment),fragment);
 assert.ok(src.includes("result.score > 0 && !trialRef.current"));
 assert.ok(app.includes('Retry from the same starting kingdom'));
 assert.ok(src.includes('trialRecordResponse(trialRef.current, powerType, {x:pos.x,z:pos.z}, beforeImpact,worldRef.current)'));
});
test('visible tactical map, per-stage advice, readable grading and focus are real UI paths',()=>{
 const src=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const map=fs.readFileSync(path.join(root,'components/TrialTacticalMap.tsx'),'utf8');
 for(const word of ['<TrialTacticalMap view={trialProgress} />','trialProgress.nextAction','trialProgress.reports.map',
   'setTrialAutoFocus(event.target.checked)','trialProgress?.stage'])assert.ok(src.includes(word),word);
 assert.ok(map.includes('view.signals.map'));
 assert.ok(map.includes('role="img"'));assert.ok(map.includes('burning trees,'));
});


test('defeat report is appended once and cannot be farmed after timeout',()=>{
 const w=trialWorld();const finished=progressTrial(R.startTrial(w),w,45).current;
 const again=R.trialStep(finished,.5,w).state;
 assert.equal(again,finished);assert.equal(again.reports.length,1);assert.equal(again.reports[0].result,'failed');
});
test('trial exports an independently readable after-action JSON and clears stale retry outputs',()=>{
 const ui=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 assert.ok(ui.includes("'primordial-covenant-after-action.json'"));
 assert.ok(ui.includes("format:'primordial-covenant-after-action-v1'"));
 assert.ok(ui.includes('stages:trialProgress.reports'));
 const retry=ui.indexOf('} else if (preTrialChronicleRef.current)');
 const end=ui.indexOf('setTrialProgress(null);',retry);
 assert.ok(retry>=0 && end>retry);
 for(const field of ['pendingAnchorRef.current=null','pendingVaultRef.current=null',
   'pendingExportRef.current=false','setChronicle(chronicleRef.current)'])
   assert.ok(ui.slice(retry,end).includes(field),field);
});
test('existing kingdom save format and pure physics are unmodified by trial replay',()=>{
 const old=fs.readFileSync(path.join(root,'continuity.ts'),'utf8');
 assert.match(old,/KINGDOM_FORMAT = 'primordial-world-v1'/);
 const src=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.ok(src.includes('worldRef.current=copyWorld(origin.world)'));
 assert.ok(src.includes('trialOriginRef.current = null'));
 assert.ok(src.includes("if (result.score > 0 && !trialRef.current)"));
});
test('finished Covenant blocks further casting until exiting or retrying',()=>{
 const src=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const marker=src.indexOf('const executeCatastropheAt = useCallback(');
 const portion=src.slice(marker,src.indexOf('lastCastRef.current[powerType] = simClockRef.current;',marker));
 assert.ok(marker>=0);
 assert.ok(portion.includes("trialRef.current.result !== 'running'"));
 assert.ok(portion.includes('Return to sandbox or retry before casting.'));
 assert.ok(portion.includes('return;'));
});


// v0.9: accountability, geographically accurate forge, and one forest frame owner.
test('forge ignores distant stone created by a wave outside its real bridge cells',()=>{
 const hot=E.impactGround(E.newGroundField(),cast('volcano',60,60,11,1));
 const wave=E.impactGround(hot.field,cast('wave',60,60,13,1.1));
 assert.ok(wave.formedStone>=1,'remote wave must physically make stone');
 assert.equal(R.forgeStoneFormed(hot.field,wave.field),0);
 const localHot=E.impactGround(E.newGroundField(),cast('volcano',6,5,9,.95));
 const localWave=E.impactGround(localHot.field,cast('wave',6,5,11,1.1));
 const formed=R.forgeStoneFormed(localHot.field,localWave.field);
 assert.ok(formed>=2,`actual bridge stone: ${formed}`);
 assert.equal(R.forgeStoneFormed(localWave.field,localWave.field),0,'old stone cannot score again');
 assert.equal(R.forgeStoneFormed(localWave.field,localHot.field),0,'removing stone is not forging');
});
test('witness ledger records off-target physical harm without mutating its source',()=>{
 const original=trialWorld();
 original.blocks.push({id:'outlying_home',originalPos:[66,1,62],type:'village',destroyed:false,integrity:1});
 const before=S.copyWorld(original);
 const after=S.applyMiracle(before,original,cast('meteor',66,62,8,2)).world;
 assert.ok(after.blocks.find(b=>b.id==='outlying_home').destroyed);
 const run=R.startTrial(original), next=R.trialRecordCollateral(run,'meteor',before,after);
 assert.equal(next.collateral.structures,1);
 assert.equal(next.collateral.trees,0);
 assert.ok(next.collateral.cost>=30);
 assert.equal(run.collateral.cost,0);
 assert.equal(before.blocks.find(b=>b.id==='outlying_home').destroyed,false);
 assert.equal(next.collateral.marks[0].kind,'collateral');
});
test('witness ledger ignores objective-local damage, no-op and restoration',()=>{
 const original=trialWorld();const run=R.startTrial(original),point=R.trialTarget(run);
 original.blocks.push({id:'within_objective',originalPos:[point.x,0,point.z],type:'village',destroyed:false});
 const hit=S.applyMiracle(original,original,cast('meteor',point.x,point.z,6,2)).world;
 assert.equal(R.trialRecordCollateral(run,'meteor',original,hit),run);
 assert.equal(R.trialRecordCollateral(run,'wave',original,original),run);
 assert.equal(R.trialRecordCollateral(run,'restore',original,hit),run);
});
test('witness ledger separates ignited trees from buildings',()=>{
 const original=trialWorld();
 original.trees.push({id:999999,position:[69,0,63],onFire:false,burnt:false});
 const before=S.copyWorld(original);
 const after=S.applyMiracle(before,original,cast('wildfire',69,63,6,1)).world;
 const player=R.trialRecordCollateral(R.startTrial(original),'wildfire',before,after);
 assert.ok(player.collateral.trees>=1);
 assert.ok(player.collateral.cost>=9);
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const a=game.indexOf("if (source === 'player') {");
 const b=game.indexOf('} else {\n        trialRef.current = trialRecordThreat',a);
 assert.ok(a>=0 && b>a);
 assert.match(game.slice(a,b),/trialRecordCollateral\(trialRef\.current,powerType,beforeImpact,worldRef\.current\)/);
 assert.doesNotMatch(game.slice(b,game.indexOf('trialRef.current=trialObserve',b)),/trialRecordCollateral/);
});
test('avoidable off-target losses reduce trial points and survive restoration',()=>{
 const initial=trialWorld();
 initial.blocks.push({id:'off_target_mill',originalPos:[66,1,60],type:'mill',destroyed:false});
 let s=R.startTrial(initial);s=progressTrial(s,initial,15).current;
 s=R.trialRecordThreat(s,'wildfire');s=verifiedGroveResponse(s,initial,'wave');
 const good=R.trialStep(s,.5,initial).state;
 assert.equal(good.stage,1);
 const after=S.applyMiracle(initial,initial,cast('meteor',66,60,9,2)).world;
 const damaged=R.trialRecordCollateral(s,'meteor',initial,after);
 const healing=S.applyMiracle(after,initial,cast('restore',66,60,9,1)).world;
 assert.equal(R.trialRecordCollateral(damaged,'restore',after,healing),damaged);
 const judged=R.trialStep(damaged,.5,initial).state;
 assert.equal(judged.stage,1);
 assert.ok(judged.reports[0].points<good.reports[0].points);
 assert.ok(judged.reports[0].collateralCost>0);
 assert.equal(judged.reports[0].collateralStructures,1);
 assert.equal(judged.collateral.cost,0,'new stage must begin with a fresh ledger');
});
test('witness sites and deducted points are visible through UI and map',()=>{
 const world=trialWorld();world.blocks.push({id:'witness',originalPos:[60,0,60],type:'village',destroyed:false});
 const run=R.startTrial(world),broken=S.applyMiracle(world,world,cast('meteor',60,60,10,2)).world;
 const view=R.trialView(R.trialRecordCollateral(run,'meteor',world,broken),broken);
 assert.ok(view.signals.some(s=>s.kind==='collateral'));
 assert.ok(view.collateralCost>0 && view.collateralStructures>0);
 const ui=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
 const map=fs.readFileSync(path.join(root,'components/TrialTacticalMap.tsx'),'utf8');
 for(const label of ['trialProgress.collateralCost','report.collateralCost','Your off-target impact']) assert.ok(ui.includes(label));
 assert.ok(map.includes("signal.kind==='collateral'"));
});
test('shared forest sway has one frame subscriber instead of per-tree callbacks',()=>{
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const begin=game.indexOf('function RealisticTree('),end=game.indexOf('function SwayingForest(',begin),forestEnd=game.indexOf('function RealisticSanctuary(',end);
 assert.ok(begin>=0 && end>begin && forestEnd>end);
 assert.ok(!game.slice(begin,end).includes('useFrame('));
 assert.equal((game.slice(end,forestEnd).match(/useFrame\(/g)||[]).length,1);
 assert.ok(game.includes('<SwayingForest trees={trees} isRiverFrozen={false} quality={quality} />'));
 assert.ok(game.slice(end,forestEnd).includes('item.burnt?0'));
});


// Keep pending cast verification part of the final result, not a post-result assertion.
test('unlanded player meteor prevents prematurely sealing an otherwise victorious ordeal',()=>{
 const w=trialWorld();let s=R.startTrial(w);
 s=progressTrial(s,w,15).current;s=R.trialRecordThreat(s,'wildfire');
 s=verifiedGroveResponse(s,w,'wave');
 const withheld=R.trialStep(s,.5,w,1).state;
 assert.equal(withheld.stage,0);
 assert.equal(withheld.pendingPlayerImpacts,1);
 assert.ok(R.trialView(withheld,w).nextAction.includes('meteor is still descending'));
 const settled=R.trialStep(withheld,.5,w,0).state;
 assert.equal(settled.stage,1);
 assert.equal(settled.reports.length,1);
});
test('a late meteor cannot win after deadline, nor be bypassed by extra casts',()=>{
 const w=trialWorld();let s=R.startTrial(w);
 s=progressTrial(s,w,15).current;s=R.trialRecordThreat(s,'wildfire');
 s=verifiedGroveResponse(s,w,'wave');
 s=R.trialStep(s,.5,w,1).state;
 for(let i=0;i<61;i++)s=R.trialStep(s,.5,w,1).state;
 assert.ok(s.elapsed>=45);
 assert.equal(s.result,'running');
 assert.equal(R.trialSpend(s,'wave').accepted,false);
 const settled=R.trialStep(s,.5,w,0).state;
 assert.equal(settled.result,'defeat');
 assert.equal(settled.reports[0].grade,'F');
 const game=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.ok(game.includes('pendingImpactsRef.current.filter('));
 assert.ok(game.includes('trialStep(trialRef.current, 0.5, worldRef.current,pendingPlayerImpacts)'));
});

test('witness account is included in the authentic in-game event chronicle',()=>{
 const src=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.ok(src.includes('if (witnessDetail) consequences.push(witnessDetail)'));
 assert.ok(src.includes('detail: consequences.join') || src.includes('const detail = consequences.join'));
 assert.ok(src.includes('onWorldEvent?.({id: `event_'));
});
test('collateral penalty is bounded, applied exactly and exposed in the final grade',()=>{
 const w=trialWorld();let s=R.startTrial(w);
 s=progressTrial(s,w,15).current;s=R.trialRecordThreat(s,'wildfire');s=verifiedGroveResponse(s,w,'wave');
 const normal=R.trialStep(s,.5,w).state;
 const severe=R.trialStep({...s,collateral:{cost:900,structures:30,trees:15,marks:[]}},.5,w).state;
 assert.equal(normal.stage,1);assert.equal(severe.stage,1);
 assert.ok(severe.reports[0].points>=80);
 assert.ok(severe.reports[0].points<normal.reports[0].points);
 assert.equal(severe.reports[0].collateralPenalty,
   normal.reports[0].points-severe.reports[0].points);
 assert.ok(severe.reports[0].collateralPenalty<=420);
 assert.equal(severe.reports[0].collateralCost,900);
 assert.equal(severe.reports[0].collateralStructures,30);
});



// v0.10.0: test actual art-direction data and verify its placement in the production scene.
const VD = load('visualDirection.ts');
test('visual tiers keep budgets bounded and responsive', () => {
  const low = VD.visualBudget('low'), med = VD.visualBudget('medium'), high = VD.visualBudget('high');
  for (const key of ['clouds','rocks','patches','ridgeSegments','ridgeBands']) {
    assert.ok(low[key] > 0 && low[key] < med[key] + 1);
    assert.ok(med[key] <= high[key]);
  }
  assert.ok(high.clouds <= 30 && high.rocks <= 300 && high.patches <= 180);
});
test('authored scenic objects are deterministic per kingdom seed', () => {
  for (const tier of ['low','medium','high']) {
    for (const kind of ['rocks','patches']) {
      const first = JSON.stringify(VD.scenicPlacements(123456,tier,kind));
      assert.equal(first, JSON.stringify(VD.scenicPlacements(123456,tier,kind)));
      assert.notEqual(first, JSON.stringify(VD.scenicPlacements(123457,tier,kind)));
    }
  }
});
test('all decorative world placements stay outside river and protected landmarks', () => {
  for (const tier of ['low','medium','high']) for(const kind of ['rocks','patches']) {
    const points = VD.scenicPlacements(42,tier,kind);
    assert.equal(points.length,VD.visualBudget(tier)[kind]);
    for(const p of points) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
      assert.ok(Math.abs(p.x) >= 9.6 && Math.abs(p.x) <= 65 && Math.abs(p.z) <= 65);
      assert.ok(!(p.x > -34 && p.x < -10 && p.z > -22 && p.z < 29));
      assert.ok(!(p.x > 9 && p.x < 37 && p.z > -36 && p.z < 10));
      assert.ok(!(p.x > 8 && p.x < 29 && p.z > 12 && p.z < 34));
      assert.ok(p.scale > 0 && p.scale < 2.6 && p.tint >= 0 && p.tint <= 3);
    }
  }
});
test('cloud banks have controlled scale, color modes, and stable geometry inputs', () => {
  for(const tier of ['low','medium','high']) {
    const first = VD.sculptClouds(74,tier);
    assert.equal(first.length, VD.visualBudget(tier).clouds);
    assert.equal(JSON.stringify(first),JSON.stringify(VD.sculptClouds(74,tier)));
    for(const b of first) {
      assert.ok(b.y >= 41 && b.y <= 60);
      assert.ok(b.span >= 3.6 && b.span <= 8.5 && b.depth <= 1.7);
      assert.ok(Math.abs(b.x) <= 118 && Math.abs(b.z) <= 118);
    }
  }
});
test('skyline silhouettes join exactly at the seam, without spikes or missing spans', () => {
  for (let seed = 1; seed <= 8; seed++) for(let band=0;band<3;band++) {
    assert.ok(Math.abs(VD.ridgeHeight(seed,band,0) - VD.ridgeHeight(seed,band,Math.PI*2)) < 1e-10);
    for(let j=0;j<80;j++) assert.ok(VD.ridgeHeight(seed,band,j/80*Math.PI*2) >= 7);
  }
});
test('the game renders authored scenery inside the real scene, not a menu mockup', () => {
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  const scene=g.slice(g.indexOf('function Scene({'),g.indexOf('export function Game({'));
  for(const required of ['<RealisticSkyDome','<RealisticAtmosphericClouds','<DistantRidges','<ScenicGround',
    '<RealisticRiverSystem','<RealisticCitadel','<RealisticVillage','<SwayingForest','<Inhabitants',
    '<InstancedParticleField']) assert.ok(scene.includes(required), required);
  assert.ok(scene.includes('<EnvironmentalMemory'));
});
test('atmospheric fog belongs to THREE.Scene and restores previous ownership on unmount',()=>{
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  const block=g.slice(g.indexOf('function SceneWeatherFog('),g.indexOf('function RealisticSkyDome('));
  assert.ok(block.includes('scene.fog = new THREE.Fog('));
  assert.ok(block.includes('scene.fog = prior'));
  assert.ok(g.includes('<SceneWeatherFog'));
});
test('the sky, ridge, and scenery own their generated GPU geometry and instance matrices',()=>{
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  assert.ok(g.includes('geometry.dispose()'));
  assert.ok(g.includes('stonesRef.current!.setMatrixAt('));
  assert.ok(g.includes('soilRef.current!.setMatrixAt('));
  assert.ok(g.includes('upper.current!.setMatrixAt('));
  assert.ok(g.includes('upper.current.computeBoundingSphere()'));
  assert.ok(g.includes('mesh.instanceMatrix.needsUpdate = true'));
});
test('weather clouds render in two batches rather than individually assembled spheres',()=>{
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  const segment=g.slice(g.indexOf('function RealisticAtmosphericClouds('),g.indexOf('function createRidgeGeometry('));
  assert.equal((segment.match(/<instancedMesh /g)||[]).length,2);
  assert.equal((segment.match(/<mesh>/g)||[]).length,0);
  assert.equal((segment.match(/useFrame\(/g)||[]).length,1);
});
test('river current and shorelines preserve the moving normal map without a full-width foam sheet',()=>{
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  const river=g.slice(g.indexOf('function RealisticRiverSystem('),g.indexOf('function RealisticCitadel('));
  assert.ok(river.includes('waterNormalMap.offset.y'));
  assert.ok(river.includes('[-9.1, 9.1]'));
  assert.ok(river.includes('<planeGeometry args={[0.72, WORLD_SIZE]}'));
  assert.ok(!river.includes('args={[18.8, WORLD_SIZE'));
});
test('lighting effects are capped per rendered frame and reduced on weaker devices',()=>{
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  assert.ok(g.includes('shadow-mapSize={[shadowResolution, shadowResolution]}'));
  assert.ok(g.includes('disasterLights.map'));
  assert.ok(g.includes("quality === 'low' ? [] : activeDisasters.slice(-disasterLightLimit(quality))"));
  assert.ok(g.includes("quality === 'low' ? [1, 1]"));
  assert.ok(g.includes("{quality !== 'low' && ("));
  assert.ok(!g.includes('<ToneMapping />')); // avoid double tonemapping
});
test('tornado and lightning have distinct volumetric shapes without electric tornado wireframes',()=>{
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  const fx=g.slice(g.indexOf('function DisasterVisualEffect('),g.indexOf('function PhysicsRubble('));
  assert.ok(fx.includes('tornadoPath') && fx.includes('lightningPath'));
  assert.ok(fx.includes('<tubeGeometry args={[tornadoPath'));
  assert.ok(fx.includes('<tubeGeometry args={[lightningPath'));
  assert.ok(!fx.includes('wireframe />')); // exclude material flags, not descriptive comments
});
test('inhabitants rotate smoothly but their hazard responses still move immediately',()=>{
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  const inhabitants=g.slice(g.indexOf('function AnimatedVillager('),g.indexOf('function DisasterVisualEffect('));
  assert.ok(inhabitants.includes('THREE.MathUtils.euclideanModulo'));
  assert.ok(inhabitants.includes('Math.exp(-10'));
  assert.ok(inhabitants.includes('escapeFromHazard'));
  assert.ok(inhabitants.includes("state={simSpeed <= 0 ? 'idle' : 'walk'}"));
});
test('accessible HUD remains a live control system with strong focus and reduced-motion handling',()=>{
  const a=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
  assert.ok(a.includes('prefers-reduced-motion: reduce'));
  assert.ok(a.includes('prefers-contrast: more'));
  assert.ok(a.includes('.pe-button:focus-visible'));
  assert.ok(a.includes('.pe-ui .pe-button { min-height: 44px; }'));
  for(const required of ['onClick={saveNow}', 'onClick={exportWorld}', 'onClick={beginTrial}',
    'setInspectMode(prev => !prev)','setForecastMode(prev => !prev)','setQuality(e.target.value as GraphicsQuality)'])
    assert.ok(a.includes(required), required);
});



test('citadel and village use pitched roof silhouettes without changing saved structure identities', () => {
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  const roof=g.slice(g.indexOf('function GabledRoof('),g.indexOf('function RealisticCitadel('));
  const castle=g.slice(g.indexOf('function RealisticCitadel('),g.indexOf('function RealisticVillage('));
  const village=g.slice(g.indexOf('function RealisticVillage('),g.indexOf('function RealisticTree('));
  assert.ok(roof.includes('new THREE.ExtrudeGeometry'));
  assert.ok(roof.includes('block.size'));
  assert.ok(roof.includes('geometry.dispose()'));
  assert.ok(castle.includes("b.id.includes('spire')"));
  assert.ok(castle.includes("b.id.includes('roof')") && castle.includes('<GabledRoof'));
  assert.ok(village.includes('<GabledRoof'));
  assert.ok(village.includes('if (b.destroyed) return null;'));
  assert.ok(!roof.includes('<RigidBody')); // purely presentational, persisted world stays canonical
});
test('wildlife animation is light and preserves the existing three-bird presence',()=>{
  const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
  const bird=g.slice(g.indexOf('function SoaringEagles('),g.indexOf('function createGradientSky('));
  assert.ok(bird.includes('const beat = REDUCE_SCENIC_MOTION'));
  assert.ok(bird.includes('b.children[1].rotation.z'));
  assert.ok(bird.includes('b.children[2].rotation.z'));
  assert.ok(bird.includes('{birds.map((_, i) =>'));
  assert.equal((bird.match(/<coneGeometry args=\{\[0\.54/g)||[]).length,2);
});



// v0.11 visual production contracts: real structures, real ruin states, deterministic art.
function visualBlocks() {
  return [
    {id:'v_house_w_0',originalPos:[-24,1.8,-14],size:[5,3.6,4],type:'village',destroyed:false},
    {id:'v_house_w_1',originalPos:[-18,1.8,-5],size:[4.6,3.6,3.68],type:'village',destroyed:false},
    {id:'c_w_n_2',originalPos:[22,2.6,-26],size:[16,4.4,1.8],type:'castle',destroyed:false},
    {id:'c_keep_battlement',originalPos:[22,12.4,-18],size:[9.5,1.8,9.5],type:'castle',destroyed:false},
    {id:'bridge_deck',originalPos:[0,1.4,0],size:[18,.8,5.2],type:'bridge',destroyed:false},
  ];
}
test('house entrances, timber frame and windows are real street-facing instances',()=>{
 const source=visualBlocks(),parts=VD.livingFacades(source);
 assert.equal(parts.doors.length,2);
 assert.equal(parts.glazing.length,8);
 assert.ok(parts.timber.length>parts.glazing.length);
 for(const block of source.slice(0,2)) {
  const facing=block.originalPos[0]+block.size[0]/2;
  const found=parts.doors.find(d=>d.z===block.originalPos[2]);
  assert.ok(found && found.x>facing && found.x<facing+.2);
  assert.ok(found.height>=1.9 && found.y>0);
 }
});
test('destruction and recovery of a house remove and restore its actual façade',()=>{
 const initial=visualBlocks(),baseline=VD.livingFacades(initial);
 const damaged=initial.map(b=>b.id==='v_house_w_0'?{...b,destroyed:true}:b);
 const active=VD.livingFacades(damaged);
 assert.equal(active.doors.length,1);
 assert.equal(active.glazing.length,4);
 assert.equal(active.hardware.length,baseline.hardware.length/2);
 const restored=VD.livingFacades(initial);
 assert.deepEqual(JSON.stringify(restored),JSON.stringify(baseline));
});
test('battlements follow only surviving canonical castle wall and keep sections',()=>{
 const blocks=visualBlocks(),before=VD.survivingMerlons(blocks,'high');
 assert.ok(before.length>=10);
 const broken=blocks.map(b=>b.id==='c_w_n_2'?{...b,destroyed:true}:b);
 const after=VD.survivingMerlons(broken,'high');
 assert.ok(after.length<before.length && after.length>0);
 assert.ok(VD.survivingMerlons(blocks,'low').length<=before.length);
 for(const detail of before) assert.ok(Number.isFinite(detail.x+detail.y+detail.z));
});
test('persistent ruins appear only for destroyed blocks and are stable across rewinds',()=>{
 const blocks=visualBlocks();
 assert.equal(VD.ruinFragments(blocks,123,'medium').length,0);
 const destroyed=blocks.map(b=>b.id==='bridge_deck'||b.id==='v_house_w_1'?{...b,destroyed:true}:b);
 const fragments=VD.ruinFragments(destroyed,123,'medium');
 assert.equal(fragments.length,8);
 assert.ok(fragments.some(p=>Math.abs(p.x)<10));
 assert.ok(fragments.some(p=>p.x<-10));
 assert.deepEqual(JSON.stringify(fragments),JSON.stringify(VD.ruinFragments(destroyed,123,'medium')));
 assert.notDeepEqual(JSON.stringify(fragments),JSON.stringify(VD.ruinFragments(destroyed,124,'medium')));
 assert.equal(VD.ruinFragments(blocks,123,'medium').length,0);
});
test('ruin geometry stays within the destroyed footprint and has bounded tiers',()=>{
 const block={id:'v_house_w_4',originalPos:[-25,1.8,22],size:[5,3.6,4],type:'village',destroyed:true};
 for(const tier of ['low','medium','high']){
  const items=VD.ruinFragments([block], 4, tier);
  assert.equal(items.length,tier==='low'?2:tier==='medium'?4:7);
  for(const p of items){
    assert.ok(Math.abs(p.x+25)<=2.5 && Math.abs(p.z-22)<=2.0);
    assert.ok(p.height>0 && p.y>0 && p.width<2);
  }
 }
});
test('sculpted edge escarpments are seeded, finite, continuous, and quality bounded',()=>{
 for(const edge of ['north','south','east','west']) {
  const low=VD.escarpmentProfile(72,edge,'low');
  const high=VD.escarpmentProfile(72,edge,'high');
  assert.ok(low.length<high.length && high.length<100);
  assert.equal(high[0].across,-84);
  assert.equal(high[high.length-1].across,84);
  assert.ok(high.every((p,i)=>p.crest>2 && p.crest<18 && (i===0||p.across>high[i-1].across)));
  assert.deepEqual(JSON.stringify(high),JSON.stringify(VD.escarpmentProfile(72,edge,'high')));
  assert.notDeepEqual(JSON.stringify(high),JSON.stringify(VD.escarpmentProfile(73,edge,'high')));
 }
});
test('river highlight placements never leave the actual water channel',()=>{
 const counts=[];
 for(const tier of ['low','medium','high']){
  const marks=VD.riverHighlights(17,tier);
  counts.push(marks.length);
  assert.deepEqual(JSON.stringify(marks),JSON.stringify(VD.riverHighlights(17,tier)));
  assert.ok(marks.every(p=>Math.abs(p.x)<7.7 && Math.abs(p.z)<75 && p.speed>0 && p.width>.1));
 }
 assert.deepEqual(counts,[8,20,34]);
});
test('in-game façade and ruin instances remain decorative and use one batch per material',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const slab=g.slice(g.indexOf('function InstancedDetail('),g.indexOf('function DynamicGrassFoliage('));
 assert.ok(slab.includes('setMatrixAt')&&slab.includes('setColorAt')&&slab.includes('computeBoundingSphere'));
 assert.ok(slab.includes('function LivingVillageFacades')&&slab.includes('function RuinedFoundations'));
 assert.ok(slab.includes('function FortificationDetail'));
 assert.ok(!slab.includes('<RigidBody')&&!slab.includes('<CuboidCollider'));
 assert.ok(g.includes('<RuinedFoundations blocks={blocks} seed={worldSeed} quality={quality}/>'));
 assert.ok(g.includes('<FortificationDetail blocks={blocks} quality={quality}/>'));
});
test('citadel portcullis is real solid iron and the old debug cage is gone',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const def=g.slice(g.indexOf('function ForgedPortcullis('),g.indexOf('function RiverCurrentHighlights('));
 assert.ok(def.includes('for(let i=0;i<9;i++)'));
 assert.ok(def.includes('<InstancedDetail pieces={bars}'));
 assert.ok(g.includes('<ForgedPortcullis/>'));
 assert.ok(!g.includes('metalness={0.9} roughness={0.3} wireframe'));
});
test('decorative smoke does not survive destruction of its parent building',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const village=g.slice(g.indexOf('function RealisticVillage('),g.indexOf('function RealisticTree('));
 assert.ok(village.includes("b.id==='v_house_c_0'&&!b.destroyed"));
 assert.ok(village.includes("b.id==='v_house_w_0'&&!b.destroyed"));
});
test('banner pole never rotates with its cloth and dramatic camera shake is smooth',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.ok(g.includes('function RoyalStandard(')&&g.includes('vertices.setZ('));
 assert.ok(!g.includes('flagRef.current.children.forEach'));
 const shake=g.slice(g.indexOf("const shake = simSpeed > 0 && !REDUCE_SCENIC_MOTION"),g.indexOf('camera.lookAt(cam.smoothedTarget'));
 assert.ok(shake.includes('Math.sin(shakeTime'));
 assert.ok(!shake.includes('Math.random()'));
});
test('procedural PBR textures are consistent across game loads rather than using Math.random',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const gen=g.slice(g.indexOf('function createGrassPBR('),g.indexOf('function createCobblestonePBR('));
 assert.ok(gen.includes('materialRandom(0x3a918d27)'));
 assert.ok(gen.includes('materialRandom(0x45a197c3)'));
 assert.ok(!gen.includes('Math.random()'));
});

test('original house roof colors survive the architectural refactor',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.ok(g.includes('color={block.color}'));
 assert.ok(g.includes('createRoofTilePBR(\'#bcb3a4\')'));
 assert.ok(g.includes('color={b.color} roughness={0.78}'));
});
test('roof caps exist only while their original roof is intact',()=>{
 const blocks=[
  {id:'v_house_r_0',originalPos:[-24,4.2,-14],size:[5.6,1.8,4.6],type:'village',destroyed:false},
  {id:'c_keep_roof',originalPos:[22,14.2,-18],size:[7.5,2.4,7.5],type:'castle',destroyed:false},
 ];
 assert.equal(VD.roofRidges(blocks).length,2);
 assert.equal(VD.roofRidges(blocks.map(b=>({...b,destroyed:true}))).length,0);
 assert.equal(VD.roofRidges(blocks)[0].z,-14);
});
test('humanoid and horse silhouette refinements do not replace articulated actors',()=>{
 const human=fs.readFileSync(path.join(root,'components/HumanoidCharacter.tsx'),'utf8');
 const animal=fs.readFileSync(path.join(root,'components/AnimalCharacter.tsx'),'utf8');
 assert.ok(human.includes('forged nose guard')||human.includes('Forged nose guard'));
 assert.ok(human.includes('Tunic / chainmail hem'));
 assert.ok(human.includes('leftLeg.current.rotation.x')&&human.includes('rightArm.current.rotation.x'));
 assert.ok(animal.includes('rotation={[Math.PI / 2, 0, 0]} castShadow={castShadow}'));
 assert.ok(animal.includes('frontLeftLeg.current.rotation.x'));
});
// Original-contract repair: verify presentation lifetimes and real scene integration.
test('camera recoil decays in presentation time and is cancelled by pause',()=>{
 const step=VD.settleCameraRecoil;
 assert.equal(step(2,.05,true),0);
 assert.equal(step(2,0,true),0);
 assert.ok(step(2,.05,false)<2);
 assert.equal(step(2,.05,false),step(2,.05,false));
 assert.equal(step(2,Infinity,false),2);
 assert.equal(step(-1,.02,false),0);
 let current=1;for(let i=0;i<30;i++)current=step(current,.05,false);
 assert.equal(current,0);
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 assert.ok(g.includes('settleCameraRecoil(cameraShakeRef.current, renderDt, simSpeed <= 0)'));
 assert.ok(g.includes('const shake = simSpeed > 0 && !REDUCE_SCENIC_MOTION'));
 assert.ok(!g.includes('cameraShakeRef.current - dt * 2.8'));
});
test('catastrophe dynamic light budget never overwhelms low-tier rendering',()=>{
 assert.deepEqual(['low','medium','high'].map(VD.disasterLightLimit),[0,1,3]);
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const lighting=g.slice(g.indexOf('function RealisticLighting('),g.indexOf('function DisasterVisualEffect('));
 assert.ok(lighting.includes("quality === 'low' ? [] : activeDisasters.slice(-disasterLightLimit(quality))"));
 assert.ok(lighting.includes('{disasterLights.map((d) => {'));
 assert.ok(!lighting.includes('activeDisasters.slice(-3).map'));
});
test('reduced motion covers river, forest and birds as well as the flag and camera',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const birds=g.slice(g.indexOf('function SoaringEagles('),g.indexOf('function createGradientSky('));
 const forest=g.slice(g.indexOf('function SwayingForest('),g.indexOf('function RealisticSanctuary('));
 const river=g.slice(g.indexOf('function RealisticRiverSystem('),g.indexOf('function GabledRoof('));
 assert.ok(birds.includes('REDUCE_SCENIC_MOTION ? 0 : clock.getElapsedTime()'));
 assert.ok(birds.includes('b.rotation.z = REDUCE_SCENIC_MOTION ? 0'));
 assert.ok(forest.includes('if (REDUCE_SCENIC_MOTION) return') && forest.includes('const sway=item.burnt?0'));
 assert.ok(river.includes('const t = REDUCE_SCENIC_MOTION ? 0 : clock.getElapsedTime()'));
 assert.ok(g.includes('if(REDUCE_SCENIC_MOTION)return;'));
});
test('low-graphics cursor orb retains visible feedback but allocates no point light',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const hand=g.slice(g.indexOf('function RealisticDivineHand('),g.indexOf('function RealisticRiverSystem('));
 assert.ok(hand.includes('quality: VisualTier'));
 assert.ok(hand.includes("{quality !== 'low' && <pointLight"));
 assert.ok(hand.includes('emissiveIntensity={3.5}'));
 assert.ok(g.includes('isPrimed={isMiraclePrimed}\n        quality={quality}'));
 assert.ok(hand.includes("REDUCE_SCENIC_MOTION || handState === 'grab_world'"));
 assert.ok(hand.includes('orbRef.current && !REDUCE_SCENIC_MOTION'));
});

// The real renderer calls this pure update path every frame; the old path
// allocated new filter and slice arrays and re-uploaded paused particles.
test('particle compaction retains array and survivors in original order',()=>{
 const mk=(id,life)=>({id,pos:{x:id,y:2,z:-id},vel:{x:1,y:2,z:-1},life,maxLife:3,opacity:1});
 const a=mk(1,0.4),b=mk(2,0.1),c=mk(3,1.5),d=mk(4,0.3);
 const pool=[a,b,c,d], original=pool;
 const count=PR.advanceParticlesInPlace(pool,0.2);
 assert.equal(count,3);assert.equal(pool,original);
 assert.equal(pool[0],a);assert.equal(pool[1],c);assert.equal(pool[2],d);
 assert.equal(b.life,-0.1);
 assert.equal(a.pos.x,1.2);assert.equal(a.pos.y,2.4);
 assert.equal(a.vel.y,0);assert.equal(a.opacity,(0.4-0.2)/3);
});
test('optimized particles numerically match the original filter implementation across frames',()=>{
 const particles=Array.from({length:32},(_,i)=>({id:i,pos:{x:i*0.1,y:1,z:-i},
   vel:{x:i*0.02-0.1,y:4-i*0.03,z:0.3},life:0.15+(i%8)*0.1,maxLife:1,opacity:1}));
 const old=JSON.parse(JSON.stringify(particles));
 for(let step=0;step<85;step++){
  const dt=0.009+(step%7)*0.001;
  const expected=old.filter(p=>{
   p.pos.x+=p.vel.x*dt;p.pos.y+=p.vel.y*dt;p.pos.z+=p.vel.z*dt;
   p.vel.y-=10*dt;p.life-=dt;p.opacity=Math.max(0,p.life/p.maxLife);
   return p.life>0;
  });
  old.splice(0,old.length,...expected);
  PR.advanceParticlesInPlace(particles,dt);
  assert.equal(particles.length,old.length);
  for(let j=0;j<old.length;j++){
    assert.equal(particles[j].id,old[j].id);
    for(const k of ['x','y','z']) assert.ok(Math.abs(particles[j].pos[k]-old[j].pos[k])<1e-10);
    assert.ok(Math.abs(particles[j].life-old[j].life)<1e-10);
    assert.ok(Math.abs(particles[j].opacity-old[j].opacity)<1e-10);
  }
 }
});
test('paused particles and zero-step updates keep state and ownership stable',()=>{
 const pool=[{pos:{x:5,y:6,z:7},vel:{x:1,y:2,z:3},life:2,maxLife:2,opacity:1}];
 const initial=JSON.stringify(pool);
 for(const dt of [0,-1,NaN,Infinity]){
   assert.equal(PR.advanceParticlesInPlace(pool,dt),1);
   assert.equal(JSON.stringify(pool),initial);
 }
 assert.equal(pool.length,1);
});
test('real particle renderer invokes in-place compacting and preserves newest visible 240',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const a=g.slice(g.indexOf('function InstancedParticleField('),g.indexOf('function TrialBeacon('));
 assert.ok(a.includes('advanceParticlesInPlace(pool, dt)'));
 assert.ok(a.includes('Math.max(0, pool.length - 240)'));
 assert.ok(a.includes('pool === lastDrawnPool.current'));
 assert.ok(!a.includes('particles.current.filter('));
 assert.ok(!a.includes('particles.current.slice(-240)'));
});
test('rubble avoids native physics reads unless a wave or tornado is active',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const r=g.slice(g.indexOf('function PhysicsRubble('),g.indexOf('function InstancedParticleField('));
 assert.ok(r.indexOf('impulseDisasters.length === 0')<r.indexOf('body.current.translation()'));
 assert.ok(g.includes('const impulseDisasters = useMemo(() => activeDisasters.filter('));
 assert.ok(g.includes('item={deb} impulseDisasters={impulseDisasters}'));
});
test('forest sway update has bounded tier-dependent frequency while gameplay movement stays separate',()=>{
 const g=fs.readFileSync(path.join(root,'Game.tsx'),'utf8');
 const forest=g.slice(g.indexOf('function SwayingForest('),g.indexOf('function RealisticSanctuary('));
 assert.ok(forest.includes("quality==='high'?1/30:quality==='medium'?1/20:1/12"));
 assert.ok(forest.includes('if (REDUCE_SCENIC_MOTION) return'));
 assert.ok(g.includes('<SwayingForest trees={trees} isRiverFrozen={false} quality={quality} />'));
});
console.log(`Regression tests passed: ${count}/${count+(process.exitCode?1:0)}${process.exitCode?' (one or more failures)':''}`);
