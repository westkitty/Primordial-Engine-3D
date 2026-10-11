/**
 * Versioned, bounded, local world continuity. No DOM, React or Three imports.
 * The environmental field and visible structure/tree state are authoritative;
 * decorative particle trajectories are deliberately not serialized.
 */
import {FIELD_CHANNELS, FIELD_COUNT, type ChronicleEvent, type GroundField} from './environment';
import type {WorldSnapshot} from './simulation';
import type {CatastropheType} from './types';

export const KINGDOM_STORAGE_KEY = 'primordial_engine_kingdom_v1';
export const KINGDOM_FORMAT = 'primordial-world-v1';
export const MAX_SAVE_BYTES = 360_000;
const MAX_TIME = 10_000_000;
export const VALID_POWERS: readonly CatastropheType[] = [
  'volcano','earthquake','tornado','meteor','wave','crystal','lightning','freeze','wildfire','restore',
];

export interface SavedTree {
  id: number;
  position: [number, number, number];
  scale: number;
  burnt: boolean;
  onFire: boolean;
  type: 'pine' | 'oak' | 'willow' | 'cherry' | 'birch';
  swayOffset: number;
  fireAge?: number;
  wetness?: number;
  regrowth?: number;
}
export interface SavedBlock {
  id: string;
  originalPos: [number, number, number];
  size: [number, number, number];
  color: string;
  destroyed: boolean;
  type: 'castle' | 'village' | 'tower' | 'bridge' | 'fence' | 'prop' | 'mill';
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  integrity?: number;
  burning?: boolean;
  wetness?: number;
}
export interface PendingImpact {
  power: CatastropheType;
  x: number;
  z: number;
  radius: number;
  force: number;
  remaining: number;
}
export interface SavedCrystal {
  id: string;
  position: [number, number, number];
  scale: number;
  color: string;
  rotY: number;
}
export interface SavedIcePatch {id: string; x: number; z: number; radius: number;}
export interface WorldCheckpoint {
  seed: number;
  simTime: number;
  world: WorldSnapshot<SavedBlock, SavedTree>;
  ground: GroundField;
  cooldowns: Partial<Record<CatastropheType, number>>;
  pendingImpacts: PendingImpact[];
  crystals: SavedCrystal[];
  icePatches: SavedIcePatch[];
}
export type SerializedField = Record<'heat'|'water'|'frost'|'ash'|'stone', number[]>;
export interface SavedKingdom extends Omit<WorldCheckpoint, 'ground'> {
  format: typeof KINGDOM_FORMAT;
  savedAt: number;
  ground: SerializedField;
  score: number;
  chaosScore: number;
  chronicle: ChronicleEvent[];
}

const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const obj = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && finite(value, min, max);
const color = (value: unknown) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;
const vec3 = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && value.every(v => finite(v, -200, 200));
const power = (value: unknown): value is CatastropheType => VALID_POWERS.includes(value as CatastropheType);

/** Stable layout. A saved world's plants must agree with its seed. */
export function generateSeededTrees(seed: number): SavedTree[] {
  let state = (seed >>> 0);
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (a: number, b: number) => a + (b - a) * random();
  const types = ['pine','oak','willow','cherry','birch'] as const;
  const list: SavedTree[] = [];
  let id = 1;
  for (let i = 0; i < 130; i++) {
    const angle = range(0, Math.PI * 2);
    const dist = range(10, 58);
    const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist;
    if (Math.abs(x) < 9 || (x > 8 && z < -6) ||
      (x < -10 && z > -18 && z < 28) || (x > 10 && z > 14)) continue;
    list.push({id: id++, position: [x,0,z], scale: range(0.85,1.65),
      burnt: false, onFire: false, type: types[i % types.length], swayOffset: range(0,Math.PI*2)});
  }
  return list;
}

export function serializeGround(field: GroundField): SerializedField {
  return {
    heat: Array.from(field.heat, n => Math.round(n * 10000) / 10000),
    water: Array.from(field.water, n => Math.round(n * 10000) / 10000),
    frost: Array.from(field.frost, n => Math.round(n * 10000) / 10000),
    ash: Array.from(field.ash, n => Math.round(n * 10000) / 10000),
    stone: Array.from(field.stone, n => Math.round(n * 10000) / 10000),
  };
}
export function hydrateGround(serialized: SerializedField): GroundField {
  return {revision: 1, heat: new Float32Array(serialized.heat), water: new Float32Array(serialized.water),
    frost: new Float32Array(serialized.frost), ash: new Float32Array(serialized.ash),
    stone: new Float32Array(serialized.stone)};
}

export function captureKingdom(core: WorldCheckpoint, session: {
  score: number; chaosScore: number; chronicle: ChronicleEvent[];
}, savedAt = Date.now()): SavedKingdom {
  return {
    format: KINGDOM_FORMAT, savedAt, seed: core.seed >>> 0, simTime: core.simTime,
    world: {blocks: core.world.blocks.map(block => ({...block, originalPos: [...block.originalPos]})),
      trees: core.world.trees.map(tree => ({...tree, position: [...tree.position]}))},
    ground: serializeGround(core.ground),
    cooldowns: {...core.cooldowns},
    pendingImpacts: core.pendingImpacts.map(p => ({...p})),
    crystals: core.crystals.map(c => ({...c, position: [...c.position]})),
    icePatches: core.icePatches.map(p => ({...p})),
    score: Math.max(0, Math.floor(session.score)),
    chaosScore: Math.max(0, Math.floor(session.chaosScore)),
    chronicle: session.chronicle.slice(0, 300).map(event => ({...event})),
  };
}

/** Strict parse. Rejects malformed, oversized, incompatible or corrupted saves. */
export function parseKingdom(source: string | null): SavedKingdom | null {
  if (!source || source.length > MAX_SAVE_BYTES) return null;
  try {
    const root: unknown = JSON.parse(source);
    if (!obj(root) || root.format !== KINGDOM_FORMAT ||
      !integer(root.seed, 0, 4294967295) ||
      !finite(root.savedAt, 0, 9000000000000000) ||
      !finite(root.simTime, 0, MAX_TIME) ||
      !finite(root.score, 0, 1000000000) || !finite(root.chaosScore, 0, 1000000000) ||
      !obj(root.world) || !Array.isArray(root.world.blocks) || !Array.isArray(root.world.trees) ||
      root.world.blocks.length > 1200 || root.world.trees.length > 130 ||
      !obj(root.ground) || !obj(root.cooldowns) ||
      !Array.isArray(root.pendingImpacts) || root.pendingImpacts.length > 8 ||
      !Array.isArray(root.crystals) || root.crystals.length > 50 ||
      !Array.isArray(root.icePatches) || root.icePatches.length > 12 ||
      !Array.isArray(root.chronicle) || root.chronicle.length > 300) return null;
    for (const channel of FIELD_CHANNELS) {
      const values = root.ground[channel];
      if (!Array.isArray(values) || values.length !== FIELD_COUNT ||
        !values.every(value => finite(value, 0, 1))) return null;
    }
    const blocks: SavedBlock[] = [];
    const blockIds = new Set<string>();
    const blockTypes = ['castle','village','tower','bridge','fence','prop','mill'];
    for (const raw of root.world.blocks) {
      if (!obj(raw) || !text(raw.id, 80) || !vec3(raw.originalPos) || !vec3(raw.size) ||
        !raw.size.every(n => n > 0) || !color(raw.color) ||
        !blockTypes.includes(raw.type as string) || typeof raw.destroyed !== 'boolean' ||
        blockIds.has(raw.id) ||
        !optionalNumber(raw.integrity, 0, 1) || !optionalNumber(raw.wetness, 0, 10) ||
        !optionalNumber(raw.roughness, 0, 1) || !optionalNumber(raw.metalness, 0, 1) ||
        !optionalNumber(raw.emissiveIntensity, 0, 10) ||
        (raw.burning !== undefined && typeof raw.burning !== 'boolean') ||
        (raw.emissive !== undefined && !color(raw.emissive))) return null;
      blockIds.add(raw.id);
      blocks.push({...raw, id: raw.id, originalPos: raw.originalPos, size: raw.size} as SavedBlock);
    }
    const expectedTrees = generateSeededTrees(root.seed);
    if (root.world.trees.length !== expectedTrees.length) return null;
    const trees: SavedTree[] = [];
    for (let i = 0; i < expectedTrees.length; i++) {
      const raw = root.world.trees[i], baseline = expectedTrees[i];
      if (!obj(raw) || raw.id !== baseline.id || !vec3(raw.position) ||
        !raw.position.every((n, j) => Math.abs(n - baseline.position[j]) < 0.00001) ||
        raw.type !== baseline.type || raw.scale !== baseline.scale ||
        raw.swayOffset !== baseline.swayOffset || typeof raw.burnt !== 'boolean' ||
        typeof raw.onFire !== 'boolean' ||
        !optionalNumber(raw.fireAge, 0, 100000) || !optionalNumber(raw.wetness, 0, 10) ||
        !optionalNumber(raw.regrowth, 0, 1)) return null;
      trees.push({...raw, position: raw.position} as SavedTree);
    }
    const cooldowns: Partial<Record<CatastropheType, number>> = {};
    for (const [key,value] of Object.entries(root.cooldowns)) {
      if (!power(key) || !finite(value, 0, MAX_TIME)) return null;
      cooldowns[key] = value;
    }
    const pendingImpacts: PendingImpact[] = [];
    for (const raw of root.pendingImpacts) {
      if (!obj(raw) || raw.power !== 'meteor' ||
        !finite(raw.x, -80, 80) || !finite(raw.z, -80, 80) ||
        !finite(raw.radius, 0.1, 120) || !finite(raw.force, 0.1, 4) ||
        !finite(raw.remaining, 0, 60)) return null;
      pendingImpacts.push(raw as unknown as PendingImpact);
    }
    const crystals: SavedCrystal[] = [];
    for (const raw of root.crystals) {
      if (!obj(raw) || !text(raw.id, 120) || !vec3(raw.position) ||
        !finite(raw.scale, 0.1, 20) || !color(raw.color) || !finite(raw.rotY, -20, 20)) return null;
      crystals.push(raw as unknown as SavedCrystal);
    }
    const icePatches: SavedIcePatch[] = [];
    for (const raw of root.icePatches) {
      if (!obj(raw) || !text(raw.id, 120) || !finite(raw.x, -80, 80) ||
        !finite(raw.z, -80, 80) || !finite(raw.radius, 0.1, 120)) return null;
      icePatches.push(raw as unknown as SavedIcePatch);
    }
    const chronicle: ChronicleEvent[] = [];
    for (const raw of root.chronicle) {
      if (!obj(raw) || !text(raw.id, 120) || !finite(raw.time, 0, MAX_TIME) ||
        (raw.kind !== 'miracle' && raw.kind !== 'reaction') ||
        !text(raw.title, 120) || !text(raw.detail, 400)) return null;
      chronicle.push(raw as unknown as ChronicleEvent);
    }
    return {
      format: KINGDOM_FORMAT, savedAt: root.savedAt, seed: root.seed, simTime: root.simTime,
      score: root.score, chaosScore: root.chaosScore, chronicle, world: {blocks, trees},
      ground: root.ground as unknown as SerializedField, cooldowns, pendingImpacts, crystals, icePatches,
    };
  } catch (_) { return null; }
}
function optionalNumber(value: unknown, low: number, high: number): boolean {
  return value === undefined || finite(value, low, high);
}

/** Detect revision mismatch before grafting saved damage onto changed source geometry. */
export function matchesBaseline(saved: SavedKingdom, blocks: SavedBlock[]): boolean {
  return saved.world.blocks.length === blocks.length && saved.world.blocks.every((block, index) => {
    const original = blocks[index];
    return block.id === original.id && block.type === original.type &&
      block.color === original.color && block.roughness === original.roughness &&
      block.metalness === original.metalness && block.emissive === original.emissive &&
      block.emissiveIntensity === original.emissiveIntensity &&
      block.originalPos.every((n, i) => Math.abs(n - original.originalPos[i]) < 0.00001) &&
      block.size.every((n, i) => Math.abs(n - original.size[i]) < 0.00001);
  });
}
