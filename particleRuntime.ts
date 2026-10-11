/** Particle simulation hot path shared by the actual R3F renderer and tests.
 * Compacts the existing pool in place without allocating two arrays per frame. */
export interface ParticleCoordinates {x:number; y:number; z:number;}
export interface MutableParticle {
  pos:ParticleCoordinates; vel:ParticleCoordinates;
  life:number; maxLife:number; opacity:number;
}

/** Advance the same Euler step as THREE.Vector3.addScaledVector, preserve order,
 * and discard only expired particles. Returns the retained count. */
export function advanceParticlesInPlace<P extends MutableParticle>(pool:P[], dt:number):number {
  if (!(dt > 0) || !Number.isFinite(dt) || pool.length === 0) return pool.length;
  let write=0;
  for (let read=0; read<pool.length; read++) {
    const p=pool[read];
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;
    p.vel.y -= 10 * dt;
    p.life -= dt;
    p.opacity=Math.max(0,p.life/p.maxLife);
    if (p.life > 0) pool[write++]=p;
  }
  pool.length=write;
  return write;
}
