import {CatastropheType} from './types';

export interface GesturePoint {
  x: number;
  y: number;
  t?: number;
}

export interface GestureDefinition {
  id: CatastropheType;
  name: string;
  gestureName: string;
  symbol: string;
  icon: string;
  color: string;
  description: string;
  svgPath: string;
  hint: string;
}

export const GESTURE_DEFINITIONS: Record<CatastropheType, GestureDefinition> = {
  volcano: {
    id: 'volcano',
    name: 'Volcanic Caldera',
    gestureName: 'Triangle (▲)',
    symbol: '▲',
    icon: '🌋',
    color: '#ff4500',
    description: 'Draw a 3-sided triangle starting from bottom-left up to apex and down to base.',
    svgPath: 'M 20 75 L 50 20 L 80 75 Z',
    hint: 'Draw a Triangle (▲)',
  },
  lightning: {
    id: 'lightning',
    name: 'Divine Thunderstorm',
    gestureName: 'Zigzag / Z (⚡)',
    symbol: '⚡',
    icon: '⚡',
    color: '#facc15',
    description: 'Draw a sharp Z or 3-step lightning bolt from top-left to right, diagonal down-left, then right.',
    svgPath: 'M 25 25 L 75 25 L 25 75 L 75 75',
    hint: 'Draw a Z / Zigzag (⚡)',
  },
  tornado: {
    id: 'tornado',
    name: 'Arcane Vortex',
    gestureName: 'Spiral / Swirl (🌀)',
    symbol: '🌀',
    icon: '🌪️',
    color: '#38bdf8',
    description: 'Draw a continuous circular spiral winding inwards or outwards.',
    svgPath: 'M 50 50 m 0 -5 a 5 5 0 1 1 0 10 a 12 12 0 1 1 0 -24 a 20 20 0 1 1 0 40 a 28 28 0 1 1 0 -56',
    hint: 'Draw a Spiral (🌀)',
  },
  wave: {
    id: 'wave',
    name: 'Tidal Deluge',
    gestureName: 'Circle / Loop (⭕)',
    symbol: '⭕',
    icon: '🌊',
    color: '#0284c7',
    description: 'Draw a smooth closed circle or water loop.',
    svgPath: 'M 50 20 A 30 30 0 1 1 49.9 20 Z',
    hint: 'Draw a Circle (⭕)',
  },
  earthquake: {
    id: 'earthquake',
    name: 'Tectonic Quake',
    gestureName: 'Square / Box (▢)',
    symbol: '▢',
    icon: '⚡',
    color: '#d97706',
    description: 'Draw a 4-sided square or rectangular box.',
    svgPath: 'M 25 25 L 75 25 L 75 75 L 25 75 Z',
    hint: 'Draw a Square (▢)',
  },
  meteor: {
    id: 'meteor',
    name: 'Celestial Meteor',
    gestureName: 'Down Chevron / V (∨)',
    symbol: '∨',
    icon: '☄️',
    color: '#ea580c',
    description: 'Draw a downward pointing V or meteor plummet stroke.',
    svgPath: 'M 20 30 L 50 80 L 80 30',
    hint: 'Draw a V / Downward Chevron (∨)',
  },
  crystal: {
    id: 'crystal',
    name: 'Crystalline Growth',
    gestureName: 'Diamond / Star (✦)',
    symbol: '✦',
    icon: '💎',
    color: '#c084fc',
    description: 'Draw a diamond: top -> right -> bottom -> left -> top.',
    svgPath: 'M 50 15 L 85 50 L 50 85 L 15 50 Z',
    hint: 'Draw a Diamond (✦)',
  },
  freeze: {
    id: 'freeze',
    name: 'Glacial Blizzard',
    gestureName: 'Horizontal Slash (━)',
    symbol: '━',
    icon: '❄️',
    color: '#93c5fd',
    description: 'Draw a swift horizontal line slash from left to right.',
    svgPath: 'M 15 50 L 85 50',
    hint: 'Draw a Horizontal Line (━)',
  },
  wildfire: {
    id: 'wildfire',
    name: 'Infernal Wildfire',
    gestureName: 'Flame Arch (∩)',
    symbol: '∩',
    icon: '🔥',
    color: '#ef4444',
    description: 'Draw an arch or dome rising up and over like a burning flame.',
    svgPath: 'M 20 80 C 20 20, 80 20, 80 80',
    hint: 'Draw an Arch / Flame Curve (∩)',
  },
  restore: {
    id: 'restore',
    name: 'Primordial Restoration',
    gestureName: 'Heart / Ankh (💖)',
    symbol: '💖',
    icon: '✨',
    color: '#10b981',
    description: 'Draw a heart shape or holy loop.',
    svgPath: 'M 50 32 C 50 20, 25 15, 25 35 C 25 60, 50 78, 50 82 C 50 78, 75 60, 75 35 C 75 15, 50 20, 50 32 Z',
    hint: 'Draw a Heart (💖)',
  },
};

// ====================================================
// ROBUST $1-STYLE GESTURE RECOGNITION ENGINE
// ====================================================

const SAMPLE_POINTS = 32;

function pathLength(points: GesturePoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return d;
}

export function resamplePoints(points: GesturePoint[], n = SAMPLE_POINTS): GesturePoint[] {
  if (!points.length) return [];
  if (points.length === 1) return Array.from({length: n}, () => ({...points[0]}));

  // Arc-length resampling: duplicates and zero-length segments cannot stall the walk.
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(
      points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = cumulative[cumulative.length - 1];
  if (total < 0.0001) return Array.from({length: n}, () => ({...points[0]}));
  const result: GesturePoint[] = [];
  let segment = 1;
  for (let i = 0; i < n; i++) {
    const target = (i / (n - 1)) * total;
    while (segment < points.length - 1 && cumulative[segment] < target) segment++;
    const start = cumulative[segment - 1];
    const length = cumulative[segment] - start;
    const t = length > 0 ? (target - start) / length : 0;
    result.push({
      x: points[segment - 1].x + (points[segment].x - points[segment - 1].x) * t,
      y: points[segment - 1].y + (points[segment].y - points[segment - 1].y) * t,
    });
  }
  return result;
}

export function normalizePoints(points: GesturePoint[]): GesturePoint[] {
  if (points.length === 0) return [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const width = Math.max(0.001, maxX - minX);
  const height = Math.max(0.001, maxY - minY);
  const scale = Math.max(width, height);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return points.map((p) => ({
    x: (p.x - cx) / scale,
    y: (p.y - cy) / scale,
  }));
}

// Generate canonical template strokes
function createCircleTemplate(): GesturePoint[] {
  const pts: GesturePoint[] = [];
  for (let i = 0; i < SAMPLE_POINTS; i++) {
    const angle = (i / SAMPLE_POINTS) * Math.PI * 2;
    pts.push({x: Math.cos(angle) * 0.45, y: Math.sin(angle) * 0.45});
  }
  return pts;
}

function createTriangleTemplate(): GesturePoint[] {
  const p1 = {x: 0, y: -0.45};
  const p2 = {x: 0.45, y: 0.45};
  const p3 = {x: -0.45, y: 0.45};
  const raw: GesturePoint[] = [];
  for (let i = 0; i <= 10; i++) raw.push({x: p1.x + (p2.x - p1.x) * (i / 10), y: p1.y + (p2.y - p1.y) * (i / 10)});
  for (let i = 1; i <= 10; i++) raw.push({x: p2.x + (p3.x - p2.x) * (i / 10), y: p2.y + (p3.y - p2.y) * (i / 10)});
  for (let i = 1; i <= 10; i++) raw.push({x: p3.x + (p1.x - p3.x) * (i / 10), y: p3.y + (p1.y - p3.y) * (i / 10)});
  return resamplePoints(raw);
}

function createSquareTemplate(): GesturePoint[] {
  const p1 = {x: -0.4, y: -0.4};
  const p2 = {x: 0.4, y: -0.4};
  const p3 = {x: 0.4, y: 0.4};
  const p4 = {x: -0.4, y: 0.4};
  const raw: GesturePoint[] = [];
  for (let i = 0; i <= 8; i++) raw.push({x: p1.x + (p2.x - p1.x) * (i / 8), y: p1.y + (p2.y - p1.y) * (i / 8)});
  for (let i = 1; i <= 8; i++) raw.push({x: p2.x + (p3.x - p2.x) * (i / 8), y: p2.y + (p3.y - p2.y) * (i / 8)});
  for (let i = 1; i <= 8; i++) raw.push({x: p3.x + (p4.x - p3.x) * (i / 8), y: p3.y + (p4.y - p3.y) * (i / 8)});
  for (let i = 1; i <= 8; i++) raw.push({x: p4.x + (p1.x - p4.x) * (i / 8), y: p4.y + (p1.y - p4.y) * (i / 8)});
  return resamplePoints(raw);
}

function createZigzagTemplate(): GesturePoint[] {
  const p1 = {x: -0.45, y: -0.4};
  const p2 = {x: 0.45, y: -0.4};
  const p3 = {x: -0.45, y: 0.4};
  const p4 = {x: 0.45, y: 0.4};
  const raw: GesturePoint[] = [];
  for (let i = 0; i <= 10; i++) raw.push({x: p1.x + (p2.x - p1.x) * (i / 10), y: p1.y + (p2.y - p1.y) * (i / 10)});
  for (let i = 1; i <= 10; i++) raw.push({x: p2.x + (p3.x - p2.x) * (i / 10), y: p2.y + (p3.y - p2.y) * (i / 10)});
  for (let i = 1; i <= 10; i++) raw.push({x: p3.x + (p4.x - p3.x) * (i / 10), y: p3.y + (p4.y - p3.y) * (i / 10)});
  return resamplePoints(raw);
}

function createChevronTemplate(): GesturePoint[] {
  const p1 = {x: -0.45, y: -0.35};
  const p2 = {x: 0, y: 0.45};
  const p3 = {x: 0.45, y: -0.35};
  const raw: GesturePoint[] = [];
  for (let i = 0; i <= 16; i++) raw.push({x: p1.x + (p2.x - p1.x) * (i / 16), y: p1.y + (p2.y - p1.y) * (i / 16)});
  for (let i = 1; i <= 16; i++) raw.push({x: p2.x + (p3.x - p2.x) * (i / 16), y: p2.y + (p3.y - p2.y) * (i / 16)});
  return resamplePoints(raw);
}

function createDiamondTemplate(): GesturePoint[] {
  const p1 = {x: 0, y: -0.45};
  const p2 = {x: 0.45, y: 0};
  const p3 = {x: 0, y: 0.45};
  const p4 = {x: -0.45, y: 0};
  const raw: GesturePoint[] = [];
  for (let i = 0; i <= 8; i++) raw.push({x: p1.x + (p2.x - p1.x) * (i / 8), y: p1.y + (p2.y - p1.y) * (i / 8)});
  for (let i = 1; i <= 8; i++) raw.push({x: p2.x + (p3.x - p2.x) * (i / 8), y: p2.y + (p3.y - p2.y) * (i / 8)});
  for (let i = 1; i <= 8; i++) raw.push({x: p3.x + (p4.x - p3.x) * (i / 8), y: p3.y + (p4.y - p3.y) * (i / 8)});
  for (let i = 1; i <= 8; i++) raw.push({x: p4.x + (p1.x - p4.x) * (i / 8), y: p4.y + (p1.y - p4.y) * (i / 8)});
  return resamplePoints(raw);
}

function createHorizontalLineTemplate(): GesturePoint[] {
  const raw: GesturePoint[] = [];
  for (let i = 0; i < SAMPLE_POINTS; i++) {
    raw.push({x: -0.45 + (i / (SAMPLE_POINTS - 1)) * 0.9, y: 0});
  }
  return raw;
}

function createArchTemplate(): GesturePoint[] {
  const raw: GesturePoint[] = [];
  for (let i = 0; i < SAMPLE_POINTS; i++) {
    const angle = Math.PI - (i / (SAMPLE_POINTS - 1)) * Math.PI;
    raw.push({x: Math.cos(angle) * 0.45, y: -Math.sin(angle) * 0.45 + 0.2});
  }
  return raw;
}

function createHeartTemplate(): GesturePoint[] {
  const raw: GesturePoint[] = [];
  for (let i = 0; i < SAMPLE_POINTS; i++) {
    const t = (i / SAMPLE_POINTS) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push({x: x * 0.025, y: y * 0.025});
  }
  return normalizePoints(raw);
}

function createSpiralTemplate(): GesturePoint[] {
  const raw: GesturePoint[] = [];
  for (let i = 0; i < SAMPLE_POINTS; i++) {
    const t = (i / SAMPLE_POINTS) * (Math.PI * 3.5);
    const r = 0.08 + (i / SAMPLE_POINTS) * 0.38;
    raw.push({x: Math.cos(t) * r, y: Math.sin(t) * r});
  }
  return raw;
}

const TEMPLATE_SOURCES: {type: CatastropheType; points: GesturePoint[]}[] = [
  {type: 'volcano', points: createTriangleTemplate()},
  {type: 'lightning', points: createZigzagTemplate()},
  {type: 'tornado', points: createSpiralTemplate()},
  {type: 'wave', points: createCircleTemplate()},
  {type: 'earthquake', points: createSquareTemplate()},
  {type: 'meteor', points: createChevronTemplate()},
  {type: 'crystal', points: createDiamondTemplate()},
  {type: 'freeze', points: createHorizontalLineTemplate()},
  {type: 'wildfire', points: createArchTemplate()},
  {type: 'restore', points: createHeartTemplate()},
];
const TEMPLATES = TEMPLATE_SOURCES.map(t => ({...t, points: normalizePoints(resamplePoints(t.points))}));

/** Orientation-tolerant where direction does not carry semantic information. */
function gestureDistance(points: GesturePoint[], template: GesturePoint[], type: CatastropheType): number {
  const angles = type === 'wave' || type === 'tornado' || type === 'crystal' || type === 'earthquake'
    ? [0, Math.PI / 2, Math.PI, -Math.PI / 2]
    : [0, -Math.PI / 12, Math.PI / 12];
  let best = Infinity;
  for (const angle of angles) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    let forward = 0, backward = 0;
    for (let i = 0; i < SAMPLE_POINTS; i++) {
      const p = points[i], f = template[i], r = template[SAMPLE_POINTS - 1 - i];
      forward += Math.hypot(p.x - (f.x * cos - f.y * sin), p.y - (f.x * sin + f.y * cos));
      backward += Math.hypot(p.x - (r.x * cos - r.y * sin), p.y - (r.x * sin + r.y * cos));
    }
    best = Math.min(best, forward / SAMPLE_POINTS, backward / SAMPLE_POINTS);
  }
  return best;
}

export interface RecognitionResult {
  matchedType: CatastropheType | null;
  score: number;
  confidence: number;
  bestName: string;
  allScores: {type: CatastropheType; confidence: number}[];
}

export function recognizeGesture(rawStroke: GesturePoint[]): RecognitionResult {
  if (!rawStroke || rawStroke.length < 5) {
    return {
      matchedType: null,
      score: 0,
      confidence: 0,
      bestName: 'Too Short',
      allScores: [],
    };
  }

  const totalLen = pathLength(rawStroke);
  if (totalLen < 25) {
    return {
      matchedType: null,
      score: 0,
      confidence: 0,
      bestName: 'Too Small',
      allScores: [],
    };
  }

  const resampled = resamplePoints(rawStroke, SAMPLE_POINTS);
  const normalized = normalizePoints(resampled);
  const closedStroke = Math.hypot(normalized[0].x - normalized[SAMPLE_POINTS - 1].x,
    normalized[0].y - normalized[SAMPLE_POINTS - 1].y) < 0.24;

  let bestMatch: CatastropheType | null = null;
  let minDistance = Infinity;

  const allScores = TEMPLATES.map((tmpl) => {
    const requiresClosure = ['volcano', 'wave', 'earthquake', 'crystal', 'restore'].includes(tmpl.type);
    const relativeLength = pathLength(normalized) / Math.max(0.001, pathLength(tmpl.points));
    const strokeChord = Math.hypot(normalized[0].x - normalized[SAMPLE_POINTS - 1].x,
      normalized[0].y - normalized[SAMPLE_POINTS - 1].y);
    const lineIsStraight = strokeChord / Math.max(0.001, pathLength(normalized)) > 0.91;
    const invalidLine = tmpl.type === 'freeze' && !lineIsStraight;
    const start = normalized[0], middle = normalized[Math.floor(SAMPLE_POINTS / 2)];
    const end = normalized[SAMPLE_POINTS - 1];
    const horizontalDirection = Math.sign(end.x - start.x) || 1;
    let backwardX = 0, forwardX = 0;
    for (let i = 1; i < normalized.length; i++) {
      const step = (normalized[i].x - normalized[i - 1].x) * horizontalDirection;
      if (step >= 0) forwardX += step;
      else backwardX -= step;
    }
    const invalidChevron = tmpl.type === 'meteor' &&
      !(Math.abs(start.y - end.y) < 0.34 &&
        middle.y > Math.max(start.y, end.y) + 0.38 &&
        Math.abs(middle.x - (start.x + end.x) / 2) < 0.35 &&
        backwardX < forwardX * 0.12);
    const dist = (requiresClosure && !closedStroke) || invalidLine || invalidChevron || relativeLength > 1.65 || relativeLength < 0.68
      ? Infinity : gestureDistance(normalized, tmpl.points, tmpl.type);
    const confidence = Math.max(0, Math.min(100, Math.round((1 - dist / 0.65) * 100)));
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = tmpl.type;
    }
    return {type: tmpl.type, confidence};
  });

  allScores.sort((a, b) => b.confidence - a.confidence);

  const topConfidence = allScores[0]?.confidence || 0;
  const secondConfidence = allScores[1]?.confidence ?? 0;
  // Reject weak or ambiguous guesses rather than accidentally casting a different spell.
  const isMatch = topConfidence >= 80 && topConfidence - secondConfidence >= 10;
  const matchedType: CatastropheType | null = isMatch && bestMatch ? bestMatch : null;
  const bestName = bestMatch ? GESTURE_DEFINITIONS[bestMatch as CatastropheType].name : 'Unknown Gesture';

  return {
    matchedType,
    score: topConfidence,
    confidence: topConfidence,
    bestName,
    allScores,
  };
}
