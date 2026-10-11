/**
 * Bounded, deterministic environmental memory for the kingdom's ground.
 * A persistent material field, NOT a voxel fluid solver or a terrain collider.
 * Independent of React, Three.js, and real-world frame timing.
 */
import type {CatastropheType} from './types';

export const FIELD_WIDTH = 32;
export const FIELD_EXTENT = 160;
export const FIELD_CELL = FIELD_EXTENT / FIELD_WIDTH;
export const FIELD_COUNT = FIELD_WIDTH * FIELD_WIDTH;

export type FieldChannel = 'heat' | 'water' | 'frost' | 'ash' | 'stone';
export const FIELD_CHANNELS: readonly FieldChannel[] = ['heat', 'water', 'frost', 'ash', 'stone'];

export interface GroundField {
  revision: number;
  heat: Float32Array;
  water: Float32Array;
  frost: Float32Array;
  ash: Float32Array;
  stone: Float32Array;
}
export interface GroundSample {
  heat: number;
  water: number;
  frost: number;
  ash: number;
  stone: number;
}
export interface GroundOutcome {
  field: GroundField;
  changed: boolean;
  affected: number;
  steam: number;
  formedStone: number;
}
export interface GroundStats {
  heated: number;
  soaked: number;
  frozen: number;
  scarred: number;
  formedStone: number;
}
export interface ChronicleEvent {
  id: string;
  time: number;
  kind: 'miracle' | 'reaction';
  title: string;
  detail: string;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const tiny = (n: number) => n < 0.003 ? 0 : clamp01(n);
// Solid stone is a permanent scar, not a reason to keep running diffusion.
const hasActivity = (field: GroundField) =>
  (['heat', 'water', 'frost', 'ash'] as const).some(channel => field[channel].some(value => value > 0.003));

export function newGroundField(): GroundField {
  return {
    revision: 0,
    heat: new Float32Array(FIELD_COUNT),
    water: new Float32Array(FIELD_COUNT),
    frost: new Float32Array(FIELD_COUNT),
    ash: new Float32Array(FIELD_COUNT),
    stone: new Float32Array(FIELD_COUNT),
  };
}
export function cloneGroundField(field: GroundField): GroundField {
  return {
    revision: field.revision,
    heat: field.heat.slice(),
    water: field.water.slice(),
    frost: field.frost.slice(),
    ash: field.ash.slice(),
    stone: field.stone.slice(),
  };
}
export function cellIndex(x: number, z: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) >= FIELD_EXTENT / 2 || Math.abs(z) >= FIELD_EXTENT / 2) return -1;
  const column = Math.floor((x + FIELD_EXTENT / 2) / FIELD_CELL);
  const row = Math.floor((z + FIELD_EXTENT / 2) / FIELD_CELL);
  return row * FIELD_WIDTH + column;
}
export function cellCenter(index: number): {x: number; z: number} {
  const column = index % FIELD_WIDTH;
  const row = Math.floor(index / FIELD_WIDTH);
  return {x: -FIELD_EXTENT / 2 + (column + 0.5) * FIELD_CELL,
    z: -FIELD_EXTENT / 2 + (row + 0.5) * FIELD_CELL};
}
export function sampleGround(field: GroundField, x: number, z: number): GroundSample {
  const index = cellIndex(x, z);
  if (index < 0) return {heat: 0, water: 0, frost: 0, ash: 0, stone: 0};
  return {heat: field.heat[index], water: field.water[index], frost: field.frost[index],
    ash: field.ash[index], stone: field.stone[index]};
}

// Heat and water may coexist briefly; quenched material solidifies into stone.
// Returns true only when the newly formed deposit crosses an observable threshold.
function quench(field: GroundField, index: number): {steam: boolean; stone: boolean} {
  const heat = field.heat[index], water = field.water[index];
  if (heat < 0.28 || water < 0.24) return {steam: false, stone: false};
  const before = field.stone[index];
  const reaction = Math.min(heat, water) * 0.48;
  field.heat[index] = tiny(heat - reaction);
  field.water[index] = tiny(water - reaction * 0.6);
  field.stone[index] = tiny(before + reaction * 0.72);
  field.ash[index] = tiny(field.ash[index] + reaction * 0.13);
  return {steam: true, stone: before < 0.15 && field.stone[index] >= 0.15};
}

/** Apply only within the targeted radius, with a continuous distance falloff. */
export function impactGround(
  previous: GroundField,
  cast: {type: CatastropheType; x: number; z: number; radius: number; force: number},
): GroundOutcome {
  if (!Number.isFinite(cast.x) || !Number.isFinite(cast.z) ||
    !Number.isFinite(cast.radius) || !Number.isFinite(cast.force) || cast.radius <= 0) {
    return {field: previous, changed: false, affected: 0, steam: 0, formedStone: 0};
  }
  const field = cloneGroundField(previous);
  const radius = Math.min(80, cast.radius);
  const intensity = Math.max(0.1, Math.min(3, cast.force));
  let affected = 0, steam = 0, formedStone = 0;
  let changed = false;
  for (let index = 0; index < FIELD_COUNT; index++) {
    const point = cellCenter(index);
    const distance = Math.hypot(point.x - cast.x, point.z - cast.z);
    if (distance >= radius) continue;
    const f = (0.3 + 0.7 * (1 - distance / radius)) * intensity;
    const before = FIELD_CHANNELS.map(channel => field[channel][index]);
    switch (cast.type) {
      case 'volcano':
        field.heat[index] = tiny(field.heat[index] + 0.95 * f);
        field.ash[index] = tiny(field.ash[index] + 0.25 * f);
        field.frost[index] = tiny(field.frost[index] - 0.9 * f);
        break;
      case 'meteor':
        field.heat[index] = tiny(field.heat[index] + 0.85 * f);
        field.ash[index] = tiny(field.ash[index] + 0.42 * f);
        field.frost[index] = tiny(field.frost[index] - 0.9 * f);
        break;
      case 'wildfire':
        field.heat[index] = tiny(field.heat[index] + 0.68 * f);
        field.ash[index] = tiny(field.ash[index] + 0.12 * f);
        break;
      case 'lightning':
        field.heat[index] = tiny(field.heat[index] + 0.63 * f);
        break;
      case 'wave':
        field.water[index] = tiny(field.water[index] + 0.95 * f);
        field.frost[index] = tiny(field.frost[index] - 0.32 * f);
        break;
      case 'freeze':
        field.frost[index] = tiny(field.frost[index] + 0.88 * f);
        field.heat[index] = tiny(field.heat[index] - 0.76 * f);
        field.water[index] = tiny(field.water[index] + 0.26 * f);
        break;
      case 'earthquake':
        field.ash[index] = tiny(field.ash[index] + 0.26 * f);
        break;
      case 'tornado':
        field.ash[index] = tiny(field.ash[index] + 0.18 * f);
        field.water[index] = tiny(field.water[index] - 0.12 * f);
        break;
      case 'crystal':
        field.stone[index] = tiny(field.stone[index] + 0.38 * f);
        break;
      case 'restore':
        for (const channel of FIELD_CHANNELS) field[channel][index] = 0;
        break;
    }
    if (cast.type !== 'restore') {
      const result = quench(field, index);
      if (result.steam) steam++;
      if (result.stone) formedStone++;
    }
    if (FIELD_CHANNELS.some((channel, c) => Math.abs(field[channel][index] - before[c]) > 0.0005)) {
      affected++;
      changed = true;
    }
  }
  if (!changed) return {field: previous, changed: false, affected: 0, steam: 0, formedStone: 0};
  field.revision++;
  return {field, changed, affected, steam, formedStone};
}

/** Deposits new ash where a propagated fire *actually* consumed matter. */
export function depositAftermath(previous: GroundField, positions: {x: number; z: number}[]): GroundOutcome {
  if (!positions.length) return {field: previous, changed: false, affected: 0, steam: 0, formedStone: 0};
  const field = cloneGroundField(previous);
  const changedCells = new Set<number>();
  for (const position of positions) {
    const index = cellIndex(position.x, position.z);
    if (index < 0) continue;
    const before = field.ash[index];
    field.ash[index] = tiny(before + 0.37);
    if (Math.abs(before - field.ash[index]) > 0.0005) changedCells.add(index);
  }
  if (!changedCells.size) return {field: previous, changed: false, affected: 0, steam: 0, formedStone: 0};
  field.revision++;
  return {field, changed: true, affected: changedCells.size, steam: 0, formedStone: 0};
}

/** Fixed-step diffusion and cooling. No random walk or variable-frame integration. */
export function advanceGround(previous: GroundField, dt: number): GroundOutcome {
  if (!Number.isFinite(dt) || dt <= 0 || !hasActivity(previous))
    return {field: previous, changed: false, affected: 0, steam: 0, formedStone: 0};
  // The caller provides half-second ticks; reject a destructive timing spike.
  const interval = Math.min(0.5, dt);
  const field = cloneGroundField(previous);
  let affected = 0, steam = 0, formedStone = 0;
  for (let index = 0; index < FIELD_COUNT; index++) {
    const column = index % FIELD_WIDTH, row = Math.floor(index / FIELD_WIDTH);
    const neighbors = [
      row > 0 ? index - FIELD_WIDTH : index,
      row + 1 < FIELD_WIDTH ? index + FIELD_WIDTH : index,
      column > 0 ? index - 1 : index,
      column + 1 < FIELD_WIDTH ? index + 1 : index,
    ];
    const neighborAverage = (channel: FieldChannel) =>
      neighbors.reduce((sum, neighbor) => sum + previous[channel][neighbor], 0) * 0.25;
    const heat = previous.heat[index];
    const water = previous.water[index];
    field.heat[index] = tiny(heat + (neighborAverage('heat') - heat) * 0.21 * interval - 0.065 * interval * heat);
    field.water[index] = tiny(water + (neighborAverage('water') - water) * 0.28 * interval - 0.018 * interval * water);
    field.frost[index] = tiny(previous.frost[index] - (0.018 + heat * 0.26) * interval);
    field.ash[index] = tiny(previous.ash[index] - 0.0025 * interval);
    // Stone is permanent; water will drain toward the river below.
  }
  // Conservative cell-to-cell downslope movement toward the x=0 river.
  // The water in a river cell is discharged; uphill regions do not instantly dry.
  const beforeFlow = field.water.slice();
  for (let index = 0; index < FIELD_COUNT; index++) {
    const {x} = cellCenter(index);
    if (Math.abs(x) <= 10) {
      field.water[index] = tiny(field.water[index] - beforeFlow[index] * 0.12 * interval);
    } else if (Math.abs(x) <= 55) {
      const col = index % FIELD_WIDTH;
      const next = index + (x < 0 ? 1 : -1);
      if (next < 0 || next >= FIELD_COUNT || (next % FIELD_WIDTH) === col) continue;
      // Do not silently discard water against a saturated downstream cell.
      const flow = Math.min(beforeFlow[index] * 0.12 * interval,
        Math.max(0, 1 - field.water[next]));
      field.water[index] = tiny(field.water[index] - flow);
      field.water[next] = tiny(field.water[next] + flow);
    }
  }
  for (let index = 0; index < FIELD_COUNT; index++) {
    const result = quench(field, index);
    if (result.steam) steam++;
    if (result.stone) formedStone++;
    if (FIELD_CHANNELS.some(channel => Math.abs(field[channel][index] - previous[channel][index]) > 0.0005)) affected++;
  }
  if (!affected) return {field: previous, changed: false, affected: 0, steam: 0, formedStone: 0};
  field.revision++;
  return {field, changed: true, affected, steam, formedStone};
}

export function groundStats(field: GroundField): GroundStats {
  const stats = {heated: 0, soaked: 0, frozen: 0, scarred: 0, formedStone: 0};
  for (let i = 0; i < FIELD_COUNT; i++) {
    if (field.heat[i] >= 0.18) stats.heated++;
    if (field.water[i] >= 0.18) stats.soaked++;
    if (field.frost[i] >= 0.18) stats.frozen++;
    if (field.ash[i] >= 0.18) stats.scarred++;
    if (field.stone[i] >= 0.15) stats.formedStone++;
  }
  return stats;
}

export function describeGround(field: GroundField, x: number, z: number): string {
  if (cellIndex(x, z) < 0) return 'Beyond the mapped kingdom. No soil reading.';
  const cell = sampleGround(field, x, z);
  const clauses: string[] = [];
  if (cell.heat >= 0.18) clauses.push('hot ground retaining catastrophe heat');
  if (cell.water >= 0.18) clauses.push('saturated soil holding water');
  if (cell.frost >= 0.18) clauses.push('frost locked into the surface');
  if (cell.ash >= 0.18) clauses.push('ash and impact residue');
  if (cell.stone >= 0.15) clauses.push('stone left by crystallization or quenching');
  const risk = Math.max(cell.heat * 1.15, cell.water * 0.9, cell.frost * 0.55);
  const readout = `Heat ${Math.round(cell.heat * 100)}% · Water ${Math.round(cell.water * 100)}% · ` +
    `Frost ${Math.round(cell.frost * 100)}% · Ash ${Math.round(cell.ash * 100)}% · ` +
    `Stone ${Math.round(cell.stone * 100)}% · Hazard ${Math.round(Math.min(1, risk) * 100)}%.`;
  if (!clauses.length) return `At ${Math.round(x)}, ${Math.round(z)}: undisturbed ground. ${readout}`;
  return `At ${Math.round(x)}, ${Math.round(z)}: ${clauses.join('; ')}. ${readout}`;
}
