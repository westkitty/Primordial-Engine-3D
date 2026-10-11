/**
 * Pure world transitions. React renders this state; it does not own the rules.
 * No Three.js imports: the same inputs can be regression-tested in Node.
 */
import type {CatastropheType} from './types';
import type {GroundSample} from './environment';

export interface WorldBlock {
  id: string;
  originalPos: [number, number, number];
  destroyed: boolean;
  type: string;
  integrity?: number;
  burning?: boolean;
  wetness?: number;
}

export interface WorldTree {
  id: number;
  position: [number, number, number];
  burnt: boolean;
  onFire: boolean;
  fireAge?: number;
  wetness?: number;
  regrowth?: number;
}

export interface WorldSnapshot<B extends WorldBlock, T extends WorldTree> {
  blocks: B[];
  trees: T[];
}

export interface MiracleRequest {
  type: CatastropheType;
  x: number;
  z: number;
  radius: number;
  force: number;
}

export interface WorldTransition<B extends WorldBlock, T extends WorldTree> {
  world: WorldSnapshot<B, T>;
  destroyed: B[];
  score: number;
  treesIgnited: number;
  treesExtinguished: number;
  changed: boolean;
}

const distance = (x: number, z: number, cx: number, cz: number) => Math.hypot(x - cx, z - cz);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const flammable = (b: WorldBlock) =>
  b.type === 'village' || b.type === 'fence' || b.type === 'mill' ||
  b.id.includes('roof') || b.id.includes('spire');

/** Copies every entity so the initial snapshot can never be mutated by a cast. */
export function copyWorld<B extends WorldBlock, T extends WorldTree>(
  source: WorldSnapshot<B, T>,
): WorldSnapshot<B, T> {
  return {
    blocks: source.blocks.map(b => ({...b, originalPos: [...b.originalPos] as [number, number, number]})),
    trees: source.trees.map(t => ({...t, position: [...t.position] as [number, number, number]})),
  };
}

export function applyMiracle<B extends WorldBlock, T extends WorldTree>(
  previous: WorldSnapshot<B, T>,
  initial: WorldSnapshot<B, T>,
  cast: MiracleRequest,
): WorldTransition<B, T> {
  const {type, x, z} = cast;
  const radius = Math.max(0.1, cast.radius);
  const force = clamp(cast.force, 0.2, 4);
  const originalBlocks = new Map(initial.blocks.map(b => [b.id, b]));
  const originalTrees = new Map(initial.trees.map(t => [t.id, t]));
  const destroyed: B[] = [];
  let score = 30;
  let treesIgnited = 0;
  let treesExtinguished = 0;
  let changed = false;

  const blocks = previous.blocks.map(block => {
    const d = distance(block.originalPos[0], block.originalPos[2], x, z);
    if (d >= radius) return block;
    if (type === 'restore') {
      const pristine = originalBlocks.get(block.id);
      if (!pristine || (!block.destroyed && !block.burning && (block.integrity ?? 1) >= 1 && !(block.wetness ?? 0))) return block;
      changed = true;
      return {...pristine, originalPos: [...pristine.originalPos]} as B;
    }
    if (block.destroyed) return block;

    const falloff = 0.45 + 0.55 * (1 - d / radius);
    const wet = block.wetness ?? 0;
    const initialIntegrity = block.integrity ?? 1;
    let damage = 0;
    let ignited = Boolean(block.burning);
    let nextWetness = wet;

    if (type === 'wave') {
      damage = 0.65 * falloff * force;
      nextWetness = Math.max(wet, 1.0);
      ignited = false;
    } else if (type === 'freeze') {
      nextWetness = Math.max(wet, 0.7);
      ignited = false;
    } else if (type === 'wildfire') {
      if (flammable(block) && wet < 0.5) ignited = true;
    } else if (type === 'lightning') {
      damage = 1.6 * falloff * force;
      if (flammable(block) && wet < 0.5) ignited = true;
    } else if (type === 'meteor') {
      damage = 2.3 * falloff * force;
      if (flammable(block)) ignited = true;
    } else if (type === 'volcano') {
      damage = 1.7 * falloff * force;
      if (flammable(block)) ignited = true;
    } else if (type === 'earthquake') {
      damage = 1.45 * falloff * force;
    } else if (type === 'tornado') {
      damage = 1.5 * falloff * force;
    }

    const integrity = clamp(initialIntegrity - damage, 0, 1);
    const isDestroyed = integrity <= 0;
    if (integrity === initialIntegrity && ignited === Boolean(block.burning) && nextWetness === wet) return block;
    changed = true;
    const next = {...block, integrity, destroyed: isDestroyed, burning: ignited && !isDestroyed, wetness: nextWetness} as B;
    if (isDestroyed) {
      destroyed.push(next);
      score += 190;
    }
    return next;
  });

  const trees = previous.trees.map(tree => {
    const d = distance(tree.position[0], tree.position[2], x, z);
    if (d >= radius) return tree;
    if (type === 'restore') {
      const pristine = originalTrees.get(tree.id);
      if (!pristine || (!tree.burnt && !tree.onFire && !(tree.wetness ?? 0))) return tree;
      changed = true;
      return {...pristine, position: [...pristine.position]} as T;
    }
    if (type === 'wave' || type === 'freeze') {
      if (tree.onFire) treesExtinguished++;
      if (!tree.onFire && (tree.wetness ?? 0) >= 1) return tree;
      changed = true;
      return {...tree, onFire: false, wetness: 1, fireAge: 0} as T;
    }
    if ((type === 'wildfire' || type === 'volcano' || type === 'meteor' || type === 'lightning') &&
      (tree.wetness ?? 0) < 0.55 && !tree.burnt && !tree.onFire) {
      changed = true;
      treesIgnited++;
      score += 65;
      return {...tree, onFire: true, fireAge: 0} as T;
    }
    return tree;
  });

  return {world: changed ? {blocks, trees} : previous, destroyed, score, treesIgnited, treesExtinguished, changed};
}

/**
 * Fires propagate to close, dry, unburnt vegetation and combustible structures.
 * A small drift in the wind direction increases the ignition reach.
 * Called on a fixed timestep; result is independent of render FPS.
 */
export function tickEnvironment<B extends WorldBlock, T extends WorldTree>(
  previous: WorldSnapshot<B, T>,
  dt: number,
  windX = 1,
  windZ = 0,
  sample?: (x: number, z: number) => GroundSample,
): WorldTransition<B, T> {
  if (dt <= 0) return {world: previous, destroyed: [], score: 0, treesIgnited: 0, treesExtinguished: 0, changed: false};
  const burningTrees = previous.trees.filter(t => t.onFire);
  const burningBlocks = previous.blocks.filter(b => b.burning && !b.destroyed);
  const sources = [
    ...burningTrees.map(t => ({x: t.position[0], z: t.position[2]})),
    ...burningBlocks.map(b => ({x: b.originalPos[0], z: b.originalPos[2]})),
  ];
  if (!sources.length && !previous.trees.some(t => (t.wetness ?? 0) > 0) &&
      !previous.blocks.some(b => (b.wetness ?? 0) > 0) && !sample) {
    return {world: previous, destroyed: [], score: 0, treesIgnited: 0, treesExtinguished: 0, changed: false};
  }
  let score = 0;
  let treesIgnited = 0;
  let changed = false;
  const destroyed: B[] = [];
  const canSpreadTo = (x: number, z: number) => sources.some(source => {
    const dx = x - source.x;
    const dz = z - source.z;
    const distanceAlongWind = dx * windX + dz * windZ;
    const reach = clamp(4.1 + distanceAlongWind * 0.48, 2.0, 7.5);
    return dx * dx + dz * dz < reach * reach;
  });
  const trees = previous.trees.map(tree => {
    const ambient = sample?.(tree.position[0], tree.position[2]);
    const wetness = Math.max(0, (tree.wetness ?? 0) - dt * 0.08,
      (ambient?.water ?? 0) * 0.83, (ambient?.frost ?? 0) * 0.6);
    // Regrowth is gradual, local and conditional; the ash on the ground remains.
    // Recorded regrowth survives saves and does not run in hostile soil.
    if (tree.burnt && !tree.onFire) {
      const safe = Boolean(ambient && ambient.water >= 0.16 && ambient.heat < 0.13 &&
        ambient.frost < 0.55 && ambient.ash < 0.75);
      const progress = Math.min(1, (tree.regrowth ?? 0) + (safe ? dt * (0.012 + (ambient?.water ?? 0) * 0.027) : 0));
      const recovered = progress >= 1;
      if (progress === (tree.regrowth ?? 0) && wetness === (tree.wetness ?? 0)) return tree;
      changed = true;
      return {...tree, burnt: !recovered, onFire: false,
        regrowth: recovered ? 0 : progress, wetness, fireAge: 0} as T;
    }
    const ignition = !tree.onFire && !tree.burnt && wetness < 0.15 &&
      (canSpreadTo(tree.position[0], tree.position[2]) || (ambient?.heat ?? 0) >= 0.67);
    const onFire = (tree.onFire && wetness < 0.5) || ignition;
    const fireAge = onFire ? (tree.fireAge ?? 0) + dt : 0;
    const burnt = tree.burnt || fireAge >= 5;
    if (onFire === tree.onFire && burnt === tree.burnt && wetness === (tree.wetness ?? 0)
        && fireAge === (tree.fireAge ?? 0)) return tree;
    changed = true;
    if (ignition) {treesIgnited++; score += 15;}
    return {...tree, onFire: onFire && !burnt, burnt, wetness, fireAge} as T;
  });
  const blocks = previous.blocks.map(block => {
    if (block.destroyed) return block;
    const ambient = sample?.(block.originalPos[0], block.originalPos[2]);
    const wetness = Math.max(0, (block.wetness ?? 0) - dt * 0.08,
      (ambient?.water ?? 0) * 0.83, (ambient?.frost ?? 0) * 0.6);
    const burning = flammable(block) && wetness < 0.3 &&
      (Boolean(block.burning) || canSpreadTo(block.originalPos[0], block.originalPos[2]) ||
        (ambient?.heat ?? 0) >= 0.67);
    const integrity = burning ? Math.max(0, (block.integrity ?? 1) - dt * 0.11) : (block.integrity ?? 1);
    const isDestroyed = integrity <= 0;
    if (burning === Boolean(block.burning) && integrity === (block.integrity ?? 1) && wetness === (block.wetness ?? 0)) return block;
    changed = true;
    const next = {...block, burning: burning && !isDestroyed, integrity, wetness, destroyed: isDestroyed} as B;
    if (isDestroyed) {destroyed.push(next); score += 190;}
    return next;
  });
  return {world: changed ? {blocks, trees} : previous, destroyed, score, treesIgnited, treesExtinguished: 0, changed};
}
