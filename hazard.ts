/** Minimal, bounded CPU-only hazard navigation for existing inhabitants.
 * Persistent terrain state, not short-lived disaster VFX, determines danger.
 */
import {sampleGround, type GroundField} from './environment';

export interface EscapeDirection {x: number; z: number; risk: number;}

export function hazardAt(field: GroundField, x: number, z: number): number {
  const cell = sampleGround(field, x, z);
  // Stone and settled ash are terrain history, not perpetual panic triggers.
  return Math.min(1, Math.max(cell.heat * 1.15, cell.water * 0.9, cell.frost * 0.55));
}

const DIRECTIONS = [
  [1,0], [0,1], [-1,0], [0,-1],
  [Math.SQRT1_2, Math.SQRT1_2],[-Math.SQRT1_2,Math.SQRT1_2],
  [-Math.SQRT1_2,-Math.SQRT1_2],[Math.SQRT1_2,-Math.SQRT1_2],
] as const;

/** Pick a safer reachable direction; never wander out of the inhabitants' map. */
export function escapeFromHazard(field: GroundField, x: number, z: number): EscapeDirection | null {
  const risk = hazardAt(field, x, z);
  if (risk < 0.28) return null;
  let best: EscapeDirection | null = null;
  let lowest = risk;
  for (const radius of [8, 16, 24]) {
    for (const [dx,dz] of DIRECTIONS) {
      const tx = Math.max(-43, Math.min(43, x + dx * radius));
      const tz = Math.max(-43, Math.min(43, z + dz * radius));
      if (Math.hypot(tx - x, tz - z) < 2) continue;
      const candidateRisk = hazardAt(field, tx, tz);
      // Small preference for nearby safe ground; don't move toward worse heat.
      const cost = candidateRisk + radius * 0.001;
      if (cost >= lowest - 0.015) continue;
      lowest = cost;
      const length = Math.hypot(tx - x, tz - z);
      best = {x: (tx-x)/length, z: (tz-z)/length, risk};
    }
  }
  return best;
}
