/**
 * The Covenant: an opt-in, session-scoped challenge over the authentic kingdom.
 * The original sandbox and kingdom save format are deliberately untouched.
 * This module is pure and deterministic: the 3D scene runs emitted threats
 * through the same applyImpact path that powers user miracles.
 */
import type {CatastropheType} from './types';
import type {WorldBlock, WorldTree, WorldSnapshot} from './simulation';
import {cellCenter, FIELD_COUNT, type GroundField} from './environment';

export type TrialStage = 0 | 1 | 2;
export type TrialResult = 'running' | 'victory' | 'defeat';
export interface TrialTarget {x: number; z: number;}
export interface TrialThreat extends TrialTarget {type: CatastropheType; force: number; radius: number;}
export type TrialGrade = 'S' | 'A' | 'B' | 'C' | 'F';
export interface TrialReport {
  stage: TrialStage;
  name: string;
  points: number;
  grade: TrialGrade;
  result: 'secured' | 'failed';
  duration: number;
  casts: number;
  preservation: number;
  worstDamage: number;
  /** Cost of *player-caused* off-objective harm; opponent threats do not count. */
  collateralCost: number;
  collateralPenalty: number;
  collateralStructures: number;
  collateralTrees: number;
}
export interface TrialSignal extends TrialTarget { kind: 'fire' | 'damage' | 'collateral'; }
export interface CollateralLedger {
  cost: number;
  structures: number;
  trees: number;
  /** Bounded map evidence, not invented civilians or a claim of fatalities. */
  marks: TrialSignal[];
}
export interface TrialRun {
  stage: TrialStage;
  elapsed: number;
  energy: number;
  score: number;
  casts: number;
  result: TrialResult;
  triggered: boolean;
  hazardHit: boolean;
  responses: number;
  quenched: number;
  grove: TrialTarget;
  initialGroveAlive: number;
  cleared: number;
  stageStartedCasts: number;
  worstDamage: number;
  collateral: CollateralLedger;
  pendingPlayerImpacts: number;
  opening: {grove: number; bridge: number; castle: number; village: number};
  reports: TrialReport[];
}
export interface TrialStep {state: TrialRun; threats: TrialThreat[]; notices: string[];}
export interface TrialView {
  stage: TrialStage;
  stageName: string;
  objective: string;
  clue: string;
  result: TrialResult;
  timeLeft: number;
  nextThreat: number | null;
  energy: number;
  score: number;
  casts: number;
  progress: string;
  target: TrialTarget;
  cleared: number;
  reports: TrialReport[];
  signals: TrialSignal[];
  nextAction: string;
  collateralCost: number;
  collateralPenalty: number;
  collateralStructures: number;
  collateralTrees: number;
  pendingPlayerImpacts: number;
}

export const TRIAL_STAGES = [
  {name: 'I · The Emberline', time: 45, threatAt: 6, objective: 'Save the marked grove from a living wildfire.',
    clue: 'Wave and frost can arrest the blaze. Restoration brings back what burned.'},
  {name: 'II · The Crucible', time: 50, threatAt: 5, objective: 'Quench two magma cells into stone and keep at least two bridge pieces standing.',
    clue: 'Volcanic heat meets tidal water. If the bridge falls, rebuild it.'},
  {name: 'III · The Fallen Crown', time: 60, threatAt: 7, objective: 'Rebuild at least 85% of the castle after the incoming meteor and extinguish its fires.',
    clue: 'The impact will happen. What survives afterward depends on you.'},
] as const;
export const TRIAL_ENERGY_MAX = 100;
export const TRIAL_RECHARGE_PER_SECOND = 1.6;
export const TRIAL_COST: Readonly<Record<CatastropheType, number>> = {
  volcano: 30, earthquake: 30, tornado: 26, meteor: 40, wave: 24,
  crystal: 25, lightning: 18, freeze: 20, wildfire: 22, restore: 38,
};
const distance = (a: TrialTarget, b: TrialTarget) => Math.hypot(a.x - b.x, a.z - b.z);
const near = (x: number, z: number, point: TrialTarget, radius: number) =>
  Math.hypot(x - point.x, z - point.z) <= radius;
const GROVE_RADIUS = 13;
const FORGE_TARGET = {x: 6, z: 5};
const CROWN_TARGET = {x: 22, z: -18};
const emptyCollateral = ():CollateralLedger => ({cost:0,structures:0,trees:0,marks:[]});
const outsideObjective = (run:TrialRun,x:number,z:number) =>
  Math.hypot(x-trialTarget(run).x,z-trialTarget(run).z) >
    (run.stage===0 ? 18 : run.stage===1 ? 16 : 25);

/** Count only newly formed stone at the actual bridge, not remote stone caught
 * in the same enormous Wave. Existing stone and unrelated Crystal casts do not count. */
export function forgeStoneFormed(before:GroundField,after:GroundField):number {
  if (!before || !after || before.stone.length!==FIELD_COUNT || after.stone.length!==FIELD_COUNT) return 0;
  let formed=0;
  for(let i=0;i<FIELD_COUNT;i++) {
    const p=cellCenter(i);
    if(near(p.x,p.z,FORGE_TARGET,12) && before.stone[i]<0.15 && after.stone[i]>=0.15) formed++;
  }
  return formed;
}

/** Account for avoidable damage dealt by the player away from the current
 * objective. Opposing disasters and subsequent wildfire are never blamed on the
 * player by this direct-cast ledger. Restoration never erases recorded harm. */
export function trialRecordCollateral<B extends WorldBlock,T extends WorldTree>(
  run:TrialRun, type:CatastropheType, before:WorldSnapshot<B,T>, after:WorldSnapshot<B,T>,
):TrialRun {
  if(run.result!=='running' || type==='restore' || before===after) return run;
  const prevBlocks=new Map(before.blocks.map(b=>[b.id,b]));
  const prevTrees=new Map(before.trees.map(t=>[t.id,t]));
  let cost=0,structures=0,trees=0;
  const marks:TrialSignal[]=[];
  for(const b of after.blocks) {
    const old=prevBlocks.get(b.id);
    if(!old || !outsideObjective(run,b.originalPos[0],b.originalPos[2])) continue;
    const lost=Math.max(0,(old.integrity??(old.destroyed?0:1))-(b.integrity??(b.destroyed?0:1)));
    const newFire=!old.burning && !!b.burning && !b.destroyed;
    if(lost<0.01 && !newFire && !(b.destroyed&&!old.destroyed)) continue;
    structures++;
    cost+=lost*36+(newFire?11:0);
    marks.push({x:b.originalPos[0],z:b.originalPos[2],kind:'collateral'});
  }
  for(const t of after.trees) {
    const old=prevTrees.get(t.id);
    if(!old || !outsideObjective(run,t.position[0],t.position[2])) continue;
    if((!old.onFire && t.onFire) || (!old.burnt && t.burnt)) {
      trees++;
      cost+=9;
      marks.push({x:t.position[0],z:t.position[2],kind:'collateral'});
    }
  }
  if(cost===0) return run;
  const previous=run.collateral;
  // Keep latest geographically distinct evidence and bound session memory.
  const all=[...previous.marks,...marks];
  const unique=new Map<string,TrialSignal>();
  for(const mark of all) unique.set(`${Math.round(mark.x)}:${Math.round(mark.z)}`,mark);
  return {...run,collateral:{cost:Math.round((previous.cost+cost)*10)/10,
    structures:previous.structures+structures,trees:previous.trees+trees,
    marks:[...unique.values()].slice(-24)}};
}
const fireOrigin = <T extends WorldTree>(trees: T[]): TrialTarget => {
  const candidates = trees.filter(t => !t.burnt && !t.onFire &&
    (t.position[0] < -32 || t.position[2] < -30 || t.position[0] > 34));
  if (!candidates.length) return {x: -39, z: -31};
  const scored = candidates.map(tree => {
    const anchor = {x: tree.position[0], z: tree.position[2]};
    const density = candidates.filter(t => near(t.position[0], t.position[2], anchor, GROVE_RADIUS)).length;
    return {anchor, density, id: tree.id};
  });
  scored.sort((a,b) => b.density-a.density || a.id-b.id);
  return scored[0].anchor;
};
const around = <T extends WorldTree>(world: WorldSnapshot<WorldBlock,T>, anchor: TrialTarget) =>
  world.trees.filter(t => near(t.position[0],t.position[2],anchor,GROVE_RADIUS));
const standing = <B extends WorldBlock>(world: WorldSnapshot<B,WorldTree>, filter: (b:B)=>boolean) => {
  const list = world.blocks.filter(filter);
  return {total: list.length, alive: list.filter(b=>!b.destroyed).length,
    burning: list.filter(b=>!b.destroyed && b.burning).length};
};
export function trialTarget(run: TrialRun): TrialTarget {
  return run.stage === 0 ? run.grove : run.stage === 1 ? FORGE_TARGET : CROWN_TARGET;
}
export function startTrial<B extends WorldBlock,T extends WorldTree>(world: WorldSnapshot<B,T>): TrialRun {
  const grove = fireOrigin(world.trees);
  const metrics = trialMetricsFor(world,grove);
  return {stage:0, elapsed:0, energy:100, score:0, casts:0, result:'running',
    triggered:false, hazardHit:false, responses:0, quenched:0, grove, initialGroveAlive:metrics.groveAlive,
    cleared:0, stageStartedCasts:0, worstDamage:0, collateral:emptyCollateral(),pendingPlayerImpacts:0,reports:[],
    opening:{grove:metrics.groveAlive,bridge:metrics.bridge.alive,castle:metrics.castle.alive,village:metrics.village.alive}};
}
export function trialSpend(run: TrialRun, type: CatastropheType): {run: TrialRun; accepted: boolean} {
  if(run.result !== 'running' || run.elapsed>=TRIAL_STAGES[run.stage].time ||
    run.energy+1e-6 < TRIAL_COST[type]) return {run, accepted:false};
  return {run: {...run, energy:Math.max(0,run.energy-TRIAL_COST[type]), casts:run.casts+1}, accepted:true};
}
export function trialRecordThreat(run: TrialRun, type: CatastropheType): TrialRun {
  if(run.result !== 'running' || !run.triggered) return run;
  const expected: CatastropheType = run.stage === 0 ? 'wildfire' : run.stage === 1 ? 'volcano' : 'meteor';
  return type === expected ? {...run, hazardHit:true} : run;
}
/** A response only counts if the targeted original grove or castle was actually helped. */
export function trialRecordResponse<B extends WorldBlock,T extends WorldTree>(
  run: TrialRun, type: CatastropheType, location: TrialTarget,
  before: WorldSnapshot<B,T>, after: WorldSnapshot<B,T>,
): TrialRun {
  if(run.result !== 'running' || !run.hazardHit || distance(location,trialTarget(run)) > 18) return run;
  if (run.stage === 0 && ['wave','freeze','restore'].includes(type)) {
    const previous = new Map(before.trees.map(t => [t.id,t]));
    const rescued = after.trees.some(t => near(t.position[0],t.position[2],run.grove,GROVE_RADIUS) &&
      ((previous.get(t.id)?.onFire && !t.onFire) || (previous.get(t.id)?.burnt && !t.burnt)));
    return rescued ? {...run,responses:run.responses+1} : run;
  }
  if (run.stage === 2 && type === 'restore') {
    const previous = new Map(before.blocks.map(b => [b.id,b]));
    const repaired = after.blocks.some(b => (b.type==='castle'||b.type==='tower') &&
      near(b.originalPos[0],b.originalPos[2],CROWN_TARGET,22) &&
      ((previous.get(b.id)?.destroyed && !b.destroyed) || (previous.get(b.id)?.burning && !b.burning)));
    return repaired ? {...run,responses:run.responses+1} : run;
  }
  return run;
}
/** Quenched stone only advances the forge when formed by a local, post-threat wave. */
export function trialRecordQuench(run: TrialRun, type: CatastropheType, stoneFormed: number, location: TrialTarget): TrialRun {
  if(run.result !== 'running' || run.stage !== 1 || !run.hazardHit || type !== 'wave' ||
    !Number.isFinite(stoneFormed) || stoneFormed <= 0 || distance(location,FORGE_TARGET) > 18) return run;
  return {...run, quenched:Math.min(1000,run.quenched+Math.max(0,Math.floor(stoneFormed)))};
}
function trialMetricsFor<B extends WorldBlock,T extends WorldTree>(world: WorldSnapshot<B,T>,groveTarget: TrialTarget) {
  const grove = around(world,groveTarget);
  const groveAlive = grove.filter(t=>!t.burnt).length;
  const groveFire = grove.filter(t=>t.onFire).length;
  const bridge = standing(world, b=>b.type === 'bridge');
  const castle = standing(world,b=>b.type === 'castle' || b.type === 'tower');
  const village = standing(world,b=>b.type === 'village' || b.type === 'mill');
  return {groveAlive, groveFire, bridge, castle, village};
}
export function trialMetrics<B extends WorldBlock,T extends WorldTree>(run: TrialRun,world: WorldSnapshot<B,T>) {
  return trialMetricsFor(world,run.grove);
}
function currentDamage(run: TrialRun,metrics:ReturnType<typeof trialMetrics>) {
  return run.stage===0 ? Math.max(0,run.opening.grove-metrics.groveAlive) :
    run.stage===1 ? Math.max(0,run.opening.bridge-metrics.bridge.alive)+Math.max(0,run.opening.village-metrics.village.alive) :
      Math.max(0,run.opening.castle-metrics.castle.alive)+Math.max(0,run.opening.village-metrics.village.alive);
}
function survivalFraction(run: TrialRun,metrics:ReturnType<typeof trialMetrics>):number {
  const count=run.stage===0 ? metrics.groveAlive : run.stage===1 ? metrics.bridge.alive : metrics.castle.alive;
  const opening=run.stage===0 ? run.opening.grove : run.stage===1 ? metrics.bridge.total : metrics.castle.total;
  return opening===0 ? 0 : Math.min(1,count/opening);
}
/** Preserve peak harm even when a later spell rebuilds before the next timed tick. */
export function trialObserve<B extends WorldBlock,T extends WorldTree>(run: TrialRun,world: WorldSnapshot<B,T>):TrialRun {
  if(run.result!=='running') return run;
  const observed=currentDamage(run,trialMetrics(run,world));
  return observed>run.worstDamage ? {...run,worstDamage:observed} : run;
}
export function trialView<B extends WorldBlock,T extends WorldTree>(run: TrialRun,world: WorldSnapshot<B,T>): TrialView {
  const metrics = trialMetrics(run,world);
  const stage = TRIAL_STAGES[run.stage];
  const progress = run.stage === 0 ?
    `${metrics.groveFire} trees burning · ${Math.max(0,run.initialGroveAlive-metrics.groveAlive)} lost · ${run.responses} defenses` :
    run.stage === 1 ? `${run.quenched}/2 quenched · bridge ${metrics.bridge.alive}/${metrics.bridge.total} standing` :
    `Castle ${metrics.castle.alive}/${metrics.castle.total} standing · ${metrics.castle.burning} burning · ${run.responses} repairs`;
  const target=trialTarget(run);
  const signals:TrialSignal[] = run.stage===0 ? world.trees.filter(t=>t.onFire &&
    near(t.position[0],t.position[2],target,30)).slice(0,16).map(t=>({x:t.position[0],z:t.position[2],kind:'fire'})) :
    world.blocks.filter(b => (b.destroyed || b.burning) && near(b.originalPos[0],b.originalPos[2],target,28) &&
      (run.stage===1 ? b.type==='bridge' : b.type==='castle'||b.type==='tower'))
      .slice(0,16).map(b=>({x:b.originalPos[0],z:b.originalPos[2],kind:'damage'}));
  const nextAction = run.result!=='running' ? 'Review the consequence ledger before returning to the sandbox.' :
    run.pendingPlayerImpacts>0 ? 'Your meteor is still descending. The verdict waits for its actual impact.' :
    run.stage===0 && run.initialGroveAlive<3 ?
      'This grove was already ruined. Return to sandbox and restore the forest before beginning another trial.' :
    !run.triggered ? 'Find the marked place. The threat has not yet arrived; reserve divine will.' :
    !run.hazardHit ? 'Incoming catastrophe still descending. Its impact must occur before restoration counts.' :
    run.stage===0 ? metrics.groveFire>0 ? `Extinguish ${metrics.groveFire} burning grove trees with Wave, Frost or Restoration.` :
      run.responses===0 ? 'Make a meaningful defense: put out flames or restore grove trees.' : 'The grove is safe for now. Keep it safe until the ordeal settles.' :
    run.stage===1 ? run.quenched<2 ? `Quench actual volcanic heat near the bridge with Wave (${run.quenched}/2 stone).` :
      metrics.bridge.alive<2 ? 'Restore damaged bridge sections near the river.' : 'Hold the bridge until the forge stabilizes.' :
    metrics.castle.alive/Math.max(1,metrics.castle.total)<0.85 ? 'Restore the shattered castle at the beacon.' :
    metrics.castle.burning>0 ? 'Extinguish the remaining castle fires.' : 'Keep the castle standing until the impact settles.';
  return {stage:run.stage, stageName:stage.name,objective:stage.objective,clue:stage.clue,
    result:run.result,timeLeft:Math.max(0,Math.ceil(stage.time-run.elapsed)),
    nextThreat:run.triggered?null:Math.max(0,Math.ceil(stage.threatAt-run.elapsed)),
    energy:Math.round(run.energy), score:run.score, casts:run.casts,progress,
    target,cleared:run.cleared,reports:run.reports,
    signals:[...signals,...run.collateral.marks.slice(-10)],nextAction,
    collateralCost:run.collateral.cost,collateralPenalty:Math.min(420,Math.round(run.collateral.cost)),
    collateralStructures:run.collateral.structures,
    collateralTrees:run.collateral.trees,pendingPlayerImpacts:run.pendingPlayerImpacts};
}
export function trialStep<B extends WorldBlock,T extends WorldTree>(
  run: TrialRun,dt: number,world:WorldSnapshot<B,T>,unresolvedPlayerImpacts=0,
):TrialStep {
  if(run.result!=='running' || !Number.isFinite(dt) || dt<=0) return {state:run,threats:[],notices:[]};
  const elapsed=run.elapsed+Math.min(1,dt);
  const stage=TRIAL_STAGES[run.stage];
  const pendingPlayerImpacts=Number.isFinite(unresolvedPlayerImpacts)
    ? Math.min(64,Math.max(0,Math.floor(unresolvedPlayerImpacts))) : 0;
  const state:TrialRun={...run,elapsed,pendingPlayerImpacts,
    energy:Math.min(TRIAL_ENERGY_MAX,run.energy+Math.min(1,dt)*TRIAL_RECHARGE_PER_SECOND)};
  const threats:TrialThreat[]=[];
  const notices:string[]=[];
  if (!run.triggered && elapsed>=stage.threatAt) {
    state.triggered=true;
    if(run.stage===0) threats.push({...run.grove,type:'wildfire',radius:10,force:1});
    if(run.stage===1) threats.push({...FORGE_TARGET,type:'volcano',radius:8.5,force:0.95});
    if(run.stage===2) threats.push({...CROWN_TARGET,type:'meteor',radius:11,force:1.15});
    notices.push(`Incoming: ${stage.name}. Respond at the glowing beacon.`);
  }
  const m=trialMetrics(state,world);
  state.worstDamage=Math.max(run.worstDamage,currentDamage(state,m));
  const groveLoss=Math.max(0,run.initialGroveAlive-m.groveAlive);
  const survivedGrove=groveLoss<=Math.max(2,Math.floor(run.initialGroveAlive*0.28));
  // The meteor visually descends for ~3 seconds after the warning.
  const succeeded=pendingPlayerImpacts===0 && elapsed<=stage.time && state.hazardHit && (run.stage===0 ? elapsed>=12 && run.initialGroveAlive>=3 && run.responses>0 && m.groveFire===0 && survivedGrove :
    run.stage===1 ? elapsed>=8 && run.quenched>=2 && m.bridge.alive>=2 :
      elapsed>=14 && run.responses>0 && m.castle.total>0 && m.castle.alive/m.castle.total>=0.85 && m.castle.burning===0);
  if(succeeded) {
    const preservation=survivalFraction(state,m);
    const castsUsed=state.casts-state.stageStartedCasts;
    const normalBonus=Math.max(100,Math.round(250+Math.max(0,stage.time-elapsed)*7+
      state.energy*2+150*preservation-Math.min(120,state.worstDamage*12)-Math.max(0,castsUsed-2)*18));
    const bonus=Math.max(80,normalBonus-Math.min(420,Math.round(state.collateral.cost)));
    const appliedPenalty=normalBonus-bonus;
    const grade:TrialGrade=bonus>=690?'S':bonus>=580?'A':bonus>=450?'B':'C';
    state.reports=[...run.reports,{stage:run.stage,name:stage.name,points:bonus,grade,result:'secured',
      duration:Math.round(elapsed*10)/10,casts:castsUsed,
      preservation:Math.round(preservation*100),worstDamage:state.worstDamage,
      collateralCost:state.collateral.cost,collateralPenalty:appliedPenalty,
      collateralStructures:state.collateral.structures,
      collateralTrees:state.collateral.trees}];
    state.score+=bonus;
    state.cleared++;
    if(run.stage===2) {
      state.result='victory';
      notices.push(`Covenant fulfilled. ${state.score} points across all three ordeals.`);
    } else {
      state.stage=(run.stage+1) as TrialStage;
      state.elapsed=0;
      state.triggered=false;
      state.hazardHit=false;
      state.responses=0;
      state.quenched=0;
      state.energy=Math.min(100,state.energy+35);
      state.stageStartedCasts=state.casts;
      state.worstDamage=0;
      state.collateral=emptyCollateral();
      state.opening={grove:m.groveAlive,bridge:m.bridge.alive,castle:m.castle.alive,village:m.village.alive};
      notices.push(`Ordeal secured (+${bonus}). ${TRIAL_STAGES[state.stage].name} begins.`);
    }
  } else if(elapsed>=stage.time && pendingPlayerImpacts===0) {
    state.result='defeat';
    state.reports=[...run.reports,{stage:run.stage,name:stage.name,points:0,grade:'F',result:'failed',
      duration:Math.round(elapsed*10)/10,casts:state.casts-state.stageStartedCasts,
      preservation:Math.round(survivalFraction(state,m)*100),worstDamage:state.worstDamage,
      collateralCost:state.collateral.cost,collateralPenalty:0,
      collateralStructures:state.collateral.structures,
      collateralTrees:state.collateral.trees}];
    notices.push(`The ${stage.name} ordeal was not contained in time. You may continue in sandbox.`);
  }
  return {state,threats,notices};
}
