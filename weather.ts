/** Deterministic, bounded periodic wind. No wall-clock or random frame state. */
export interface Wind {x: number; z: number; strength: number; name: string;}
export function windAt(simTime: number, seed: number): Wind {
  const time = Number.isFinite(simTime) ? Math.max(0, simTime) : 0;
  const phase = (seed >>> 0) * 0.000000092 + time * 0.015;
  const heading = Math.sin(phase) * 1.55 + Math.cos(phase * 0.37) * 1.1;
  const strength = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(phase * 1.8));
  const x = Math.cos(heading) * strength;
  const z = Math.sin(heading) * strength;
  const name = Math.abs(x) >= Math.abs(z) ? (x >= 0 ? 'east' : 'west') : (z >= 0 ? 'south' : 'north');
  return {x, z, strength, name};
}
