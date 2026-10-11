/** Source-owned art direction for the weathered medieval miniature.
 * Deterministic detail never enters world saves, collisions, scoring, or ray input. */
export type VisualTier = 'low' | 'medium' | 'high';
export type WeatherLook = 'clear' | 'storm' | 'ember';
export const PALETTE = {
  ink: '#101c24', parchment: '#f0e2be', brass: '#e0bc74', slate: '#536a77',
  forest: '#344f3e', river: '#2d8296', cloud: '#dbe2d9', smoke: '#554a47',
} as const;

/** A 32-bit integer hash; placement is stable across reloads and branches. */
export function artNoise(seed: number, index: number, salt = 0): number {
  let x = (Math.trunc(seed) ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function visualBudget(tier: VisualTier) {
  return tier === 'low'
    ? {clouds: 10, rocks: 75, patches: 44, ridgeSegments: 56, ridgeBands: 2}
    : tier === 'medium'
      ? {clouds: 19, rocks: 165, patches: 94, ridgeSegments: 72, ridgeBands: 3}
      : {clouds: 28, rocks: 280, patches: 160, ridgeSegments: 96, ridgeBands: 3};
}

export interface ScenicPlacement {
  x: number; z: number; scale: number; yaw: number; tint: number;
}

function excludesLandmark(x: number, z: number): boolean {
  return (x > -34 && x < -10 && z > -22 && z < 29) ||
    (x > 9 && x < 37 && z > -36 && z < 10) ||
    (x > 8 && x < 29 && z > 12 && z < 34);
}

/** Fill the outskirts and waterline while reserving the actual playable landmarks. */
export function scenicPlacements(seed: number, tier: VisualTier, kind: 'rocks' | 'patches'): ScenicPlacement[] {
  const total = visualBudget(tier)[kind];
  const out: ScenicPlacement[] = [];
  let attempt = 0;
  while (out.length < total && attempt < total * 15) {
    const i = attempt++;
    let x = (artNoise(seed, i, 1) - 0.5) * 130;
    const z = (artNoise(seed, i, 2) - 0.5) * 130;
    if (kind === 'rocks' && i % 3 === 0) {
      x = (artNoise(seed, i, 3) > 0.5 ? 1 : -1) * (9.8 + artNoise(seed, i, 4) * 4.8);
    }
    if (Math.abs(x) < 9.6 || excludesLandmark(x, z)) continue;
    out.push({
      x, z,
      scale: 0.55 + artNoise(seed, i, 5) * (kind === 'rocks' ? 1.5 : 1.9),
      yaw: artNoise(seed, i, 6) * 2 * Math.PI,
      tint: Math.floor(artNoise(seed, i, 7) * 4),
    });
  }
  return out;
}

export interface CloudBank {x: number; y: number; z: number; span: number; depth: number}
export function sculptClouds(seed: number, tier: VisualTier): CloudBank[] {
  return Array.from({length: visualBudget(tier).clouds}, (_, i) => ({
    x: (artNoise(seed, i, 21) - 0.5) * 235,
    z: (artNoise(seed, i, 22) - 0.5) * 235,
    y: 41 + artNoise(seed, i, 23) * 19,
    span: 3.6 + artNoise(seed, i, 24) * 4.8,
    depth: 1.0 + artNoise(seed, i, 25) * 0.7,
  }));
}

/** Periodic closed silhouettes: changing the seed changes form, never topology. */
export function ridgeHeight(seed: number, band: number, angle: number): number {
  const phase = artNoise(seed, band, 31) * Math.PI * 2;
  const pulse = Math.sin(angle * 3 + phase) * 6 + Math.sin(angle * 7 - phase) * 3.3 +
    Math.sin(angle * 13 + phase * 0.7) * 1.4;
  return Math.max(7, 19 + 4.2 * band + pulse);
}

/** Visual companions to *existing* authoritative blocks. They have no collision,
 * durability or save identity and disappear as soon as their parent is destroyed. */
export interface VisualBlock {
  id: string;
  originalPos: readonly [number, number, number];
  size: readonly [number, number, number];
  type?: string;
  destroyed?: boolean;
}
export interface DetailInstance {
  x: number; y: number; z: number;
  width: number; height: number; depth: number;
  tint: number;
}
function detail(x: number, y: number, z: number, width: number,
  height: number, depth: number, tint = 0): DetailInstance {
  return {x, y, z, width, height, depth, tint};
}

/** House doors face the original eastward road; all trim is attached to surviving walls. */
export function livingFacades(blocks: readonly VisualBlock[]) {
  const timber: DetailInstance[] = [];
  const doors: DetailInstance[] = [];
  const glazing: DetailInstance[] = [];
  const hardware: DetailInstance[] = [];
  for (const b of blocks) {
    if (!b.id.startsWith('v_house_w_') || b.destroyed) continue;
    const [x,y,z] = b.originalPos;
    const [width,height,depth] = b.size;
    const face = x + width / 2 + 0.065;
    const sill = y - height / 2;
    const style = (Number(b.id.slice('v_house_w_'.length)) || 0) % 4;
    const edge = depth / 2 - 0.18;
    for (const side of [-1, 1]) {
      timber.push(detail(face, sill + height * 0.51, z + side * edge, .22, height * .92, .23, style));
      const wz = z + side * depth * .28;
      glazing.push(detail(face + .039, sill + 2.48, wz, .055, .65, .57, style));
      for (const slot of [-1, 1]) {
        timber.push(detail(face + .07, sill + 2.48, wz + slot * .31, .12, .84, .105, style));
      }
      timber.push(detail(face + .073, sill + 2.48, wz, .12, .10, .64, style));
      hardware.push(detail(face + .11, sill + 2.47, wz, .045, .75, .035, 0));
    }
    // Back-facing shutters and timber: orbiting behind the village never reveals blank walls.
    const back = x - width / 2 - .065;
    for(const side of [-1,1]){
      timber.push(detail(back, sill + height*.51, z + side * edge, .22, height*.92, .23, style));
      const wz=z + side * depth*.28;
      glazing.push(detail(back-.04,sill+2.48,wz,.055,.64,.55,style));
      for(const slot of [-1,1])
        timber.push(detail(back-.07,sill+2.48,wz+slot*.31,.12,.84,.105,style));
      timber.push(detail(back-.07,sill+2.48,wz,.12,.10,.64,style));
    }
    timber.push(detail(back-.07,sill+height*.88,z,.19,.20,depth-.12,style));
    // Every house has a legible street entry; no window or door has gameplay collision.
    doors.push(detail(face + .043, sill + 1.01, z, .115, 2.02, .83, style));
    hardware.push(detail(face + .118, sill + 1.03, z - .25, .056, .09, .09, 1));
    timber.push(detail(face + .08, sill + height * .88, z, .19, .20, depth - .12, style));
    timber.push(detail(face + .08, sill + .35, z, .20, .26, depth - .10, style));
    timber.push(detail(face + .08, sill + 2.09, z, .18, .20, 1.04, style));
  }
  return {timber, doors, glazing, hardware};
}

/** Stone battlements belong to surviving wall, bastion or keep cap blocks. */
export function survivingMerlons(blocks: readonly VisualBlock[], tier: VisualTier) {
  const out: DetailInstance[] = [];
  for (const b of blocks) {
    if (b.destroyed || !(b.id.startsWith('c_w_') || b.id.includes('bastion_top') || b.id === 'c_keep_battlement')) continue;
    const [x,y,z] = b.originalPos;
    const [w,h,d] = b.size;
    const edgeX = w > d * 1.3;
    const edgeZ = d > w * 1.3;
    const number = edgeX ? Math.max(2, Math.round(w / (tier === 'low' ? 3.0 : 2.05)))
      : edgeZ ? Math.max(2, Math.round(d / (tier === 'low' ? 3.0 : 2.05))) : 4;
    const top = y + h / 2 + .47;
    for (let i = 0; i < number; i++) {
      const t = (i + .5) / number - .5;
      if (edgeX) out.push(detail(x + t * w * .92, top, z, 1.12, .94, Math.min(1.5, d * .78), 0));
      else if (edgeZ) out.push(detail(x, top, z + t * d * .92, Math.min(1.5, w * .78), .94, 1.12, 0));
      else {
        const a = i / number * Math.PI * 2;
        out.push(detail(x + Math.cos(a) * w * .41, top, z + Math.sin(a) * d * .41, .82, .94, .82, 1));
      }
    }
  }
  return out;
}

/** Persistent *visible* broken masonry. Source of truth remains `destroyed` in blocks. */
export function ruinFragments(blocks: readonly VisualBlock[], seed: number, tier: VisualTier) {
  const out: DetailInstance[] = [];
  const per = tier === 'low' ? 2 : tier === 'medium' ? 4 : 7;
  for (const b of blocks) {
    if (!b.destroyed || !['castle','tower','village','bridge','mill'].includes(b.type || '')) continue;
    const [x, ,z] = b.originalPos;
    const [w, ,d] = b.size;
    const idSalt = Array.from(b.id).reduce((a,c)=>Math.imul(a,33)+c.charCodeAt(0)|0,5381);
    for (let i = 0; i < per; i++) {
      const rx = (artNoise(seed ^ idSalt, i, 80) - .5) * Math.max(1.2, w * .81);
      const rz = (artNoise(seed ^ idSalt, i, 81) - .5) * Math.max(1.2, d * .81);
      const scale = .35 + artNoise(seed ^ idSalt, i, 82) * .9;
      const height = scale * (.28 + artNoise(seed ^ idSalt, i, 83) * .45);
      out.push(detail(x + rx, height * .5 + .015, z + rz, scale,
        height, scale * (.65 + artNoise(seed ^ idSalt, i, 84) * .7),
        b.type === 'village' ? 2 : b.type === 'bridge' ? 1 : 0));
    }
  }
  return out;
}

/** A coherent run of eroded stone along each of the four finite-world edges. */
export type CardinalEdge = 'north' | 'south' | 'east' | 'west';
export function escarpmentProfile(seed: number, edge: CardinalEdge, tier: VisualTier) {
  const count = tier === 'low' ? 26 : tier === 'medium' ? 40 : 58;
  const salt = ['north','south','east','west'].indexOf(edge);
  return Array.from({length: count+1}, (_, i) => {
    const at = i / count;
    const broad = Math.sin((at * 2.4 + salt * .6) * Math.PI) * 2.3;
    const ridged = Math.sin(at * 9.8 * Math.PI + salt) * 1.7;
    const n = artNoise(seed, i, 120+salt) - .5;
    return {across: -84 + at * 168, crest: 9.0 + broad + ridged + n * 3.4};
  });
}

/** Shader-free moving water highlights: positions determined by the kingdom seed. */
export function riverHighlights(seed: number, tier: VisualTier) {
  const count = tier === 'low' ? 8 : tier === 'medium' ? 20 : 34;
  return Array.from({length: count}, (_, i) => ({
    x: (artNoise(seed, i, 151) - .5) * 15.2,
    z: (artNoise(seed, i, 152) - .5) * 145,
    width: .17 + artNoise(seed, i, 153) * .26,
    length: 1.2 + artNoise(seed, i, 154) * 2.8,
    speed: .6 + artNoise(seed, i, 155) * 1.7,
  }));
}


/** Roof ridge caps and end finials remain attached to surviving canonical roof blocks. */
export function roofRidges(blocks: readonly VisualBlock[]) {
  const result:DetailInstance[]=[];
  for(const block of blocks){
    if(block.destroyed || !(block.id.startsWith('v_house_r_') || block.id==='c_keep_roof')) continue;
    const [x,y,z]=block.originalPos;
    const [,h,d]=block.size;
    result.push(detail(x,y+h*.5+.055,z,.23,.14,d+.10,
      block.id==='c_keep_roof'?0:(Number(block.id.slice('v_house_r_'.length))||0)%4));
  }
  return result;
}

/** A world catastrophe is lit on desktop tiers but never forces dynamic
 * point lights on low-end GPUs. The luminous spell mesh still renders. */
export function disasterLightLimit(tier: VisualTier): number {
  return tier === 'low' ? 0 : tier === 'medium' ? 1 : 3;
}

/** Camera recoil is a presentation effect: wall-clock decay is independent
 * of simulation speed, and pausing cancels it rather than freezing the shake. */
export function settleCameraRecoil(recoil: number, renderDelta: number, paused: boolean): number {
  if (paused) return 0;
  const value = Number.isFinite(recoil) ? Math.max(0, Math.min(2.5, recoil)) : 0;
  const step = Number.isFinite(renderDelta) ? Math.max(0, Math.min(0.075, renderDelta)) : 0;
  return Math.max(0, value - step * 2.8);
}
