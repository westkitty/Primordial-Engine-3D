import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {
  Bloom,
  EffectComposer,
  Vignette,
} from '@react-three/postprocessing';
import {CuboidCollider, Physics, RigidBody, type RapierRigidBody} from '@react-three/rapier';
import type {MutableRefObject} from 'react';
import React, {Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {AnimalCharacter} from './components/AnimalCharacter';
import {HumanoidCharacter} from './components/HumanoidCharacter';
import {EnvironmentalAfterglow, EnvironmentalMemory, type MemoryLayer} from './components/EnvironmentalMemory';
import {CATASTROPHES, getConfig} from './constants';
import {GesturePoint, recognizeGesture} from './gestures';
import {InputSnapshot, useInput} from './input';
import {advanceDesktopTaps, discardFocusTap, queueDesktopTap, type PendingTap} from './tapArbitration';
import {CatastropheType} from './types';
import {advanceParticlesInPlace} from './particleRuntime';
import {applyMiracle, copyWorld, tickEnvironment, type WorldSnapshot} from './simulation';
import {advanceGround, depositAftermath, describeGround, groundStats, impactGround, newGroundField, sampleGround,
  type ChronicleEvent, type GroundField, type GroundStats} from './environment';
import {gameAudio, GameState, randomRange} from './utils';
import {escapeFromHazard, type EscapeDirection} from './hazard';
import {forecastImpact, formatForecast, insideKingdom} from './forecast';
import {windAt, type Wind} from './weather';
import {artNoise, ridgeHeight, scenicPlacements, sculptClouds, visualBudget, livingFacades, survivingMerlons,
  ruinFragments, roofRidges, escarpmentProfile, riverHighlights, type DetailInstance, type CardinalEdge,
  type VisualTier, disasterLightLimit, settleCameraRecoil} from './visualDirection';
import {startTrial, trialSpend, trialRecordQuench, trialRecordThreat, trialRecordResponse, trialRecordCollateral,
  forgeStoneFormed, trialObserve, trialStep, trialTarget, trialView, TRIAL_STAGES,
  type TrialRun, type TrialView, type TrialTarget, type TrialThreat} from './trial';
import {generateSeededTrees, hydrateGround, matchesBaseline, type SavedKingdom,
  type WorldCheckpoint} from './continuity';

const WORLD_SIZE = 160;
const HALF_SIZE = 80;
const REDUCE_SCENIC_MOTION = typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export type MouseInteractionMode = 'cast' | 'grab' | 'orbit' | 'inscribe' | 'inspect' | 'forecast';

// ====================================================
// PROCEDURAL PBR TEXTURE GENERATORS
// ====================================================
/** Repeatable visual grain; never touches gameplay random sequence or save state. */
function materialRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createGrassPBR(): {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture} {
  const size = 512;
  const rand = materialRandom(0x3a918d27);
  const dCanvas = document.createElement('canvas');
  dCanvas.width = size;
  dCanvas.height = size;
  const dCtx = dCanvas.getContext('2d')!;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;

  const heights = new Float32Array(size * size);

  dCtx.fillStyle = '#1e3814';
  dCtx.fillRect(0, 0, size, size);

  const colors = [
    '#274718',
    '#345e20',
    '#182e10',
    '#447528',
    '#263f17',
    '#4e842c',
    '#2f501c',
    '#5c9735',
  ];
  for (let i = 0; i < 70000; i++) {
    const x = (rand() * size) | 0;
    const y = (rand() * size) | 0;
    const w = 1 + rand() * 2.2;
    const h = 2 + rand() * 4.5;
    dCtx.fillStyle = colors[(rand() * colors.length) | 0];
    dCtx.fillRect(x, y, w, h);

    const val = 0.35 + rand() * 0.65;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = (x + dx) % size;
        const py = (y + dy) % size;
        heights[py * size + px] = val;
      }
    }
  }

  for (let i = 0; i < 90; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const rad = 12 + rand() * 36;
    const grad = dCtx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, 'rgba(45, 30, 16, 0.6)');
    grad.addColorStop(0.7, 'rgba(28, 44, 16, 0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    dCtx.fillStyle = grad;
    dCtx.beginPath();
    dCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    dCtx.fill();
  }

  const nImg = nCtx.createImageData(size, size);
  const data = nImg.data;
  const strength = 2.6;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dx = (heights[y * size + xR] - heights[y * size + xL]) * strength;
      const dy = (heights[yD * size + x] - heights[yU * size + x]) * strength;
      const dz = 1.0;

      const len = Math.hypot(dx, dy, dz);
      data[idx] = Math.floor(((dx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((dy / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((dz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const diffuse = new THREE.CanvasTexture(dCanvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(24, 24);

  const normal = new THREE.CanvasTexture(nCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(24, 24);

  return {diffuse, normal};
}

function createStoneAshlarPBR(): {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture} {
  const size = 512;
  const rand = materialRandom(0x45a197c3);
  const dCanvas = document.createElement('canvas');
  dCanvas.width = size;
  dCanvas.height = size;
  const dCtx = dCanvas.getContext('2d')!;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;

  dCtx.fillStyle = '#111827';
  dCtx.fillRect(0, 0, size, size);

  const rows = 16;
  const cols = 8;
  const bh = size / rows;
  const bw = size / cols;
  const heights = new Float32Array(size * size);

  const stoneShades = ['#64748b', '#526173', '#718398', '#424f5e', '#5b6c80', '#7b8da3', '#475666'];

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const bx = c * bw + offset + 2;
      const by = r * bh + 2;
      const w = bw - 4;
      const h = bh - 4;

      const baseCol = stoneShades[((r * 11 + c * 7) % stoneShades.length + stoneShades.length) % stoneShades.length];
      dCtx.fillStyle = baseCol;
      dCtx.fillRect(bx, by, w, h);

      dCtx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      dCtx.fillRect(bx, by, w, 2);
      dCtx.fillRect(bx, by, 2, h);

      dCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      dCtx.fillRect(bx, by + h - 2, w, 2);
      dCtx.fillRect(bx + w - 2, by, 2, h);

      for (let py = Math.max(0, Math.floor(by)); py < Math.min(size, Math.floor(by + h)); py++) {
        for (let px = Math.max(0, Math.floor(bx)); px < Math.min(size, Math.floor(bx + w)); px++) {
          const edgeDist = Math.min(px - bx, bx + w - px, py - by, by + h - py);
          const bevel = Math.min(1.0, edgeDist / 3.0);
          heights[py * size + px] = 0.75 * bevel + rand() * 0.15;
        }
      }
    }
  }

  const nImg = nCtx.createImageData(size, size);
  const data = nImg.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dx = (heights[y * size + xR] - heights[y * size + xL]) * 3.4;
      const dy = (heights[yD * size + x] - heights[yU * size + x]) * 3.4;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      data[idx] = Math.floor(((dx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((dy / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((dz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const diffuse = new THREE.CanvasTexture(dCanvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;

  const normal = new THREE.CanvasTexture(nCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;

  return {diffuse, normal};
}

function createCobblestonePBR(): {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture} {
  const size = 512;
  const dCanvas = document.createElement('canvas');
  dCanvas.width = size;
  dCanvas.height = size;
  const dCtx = dCanvas.getContext('2d')!;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;

  dCtx.fillStyle = '#0f172a';
  dCtx.fillRect(0, 0, size, size);

  const colors = ['#78889b', '#5c6d80', '#697b8e', '#889aac', '#4d5d6f'];
  const heights = new Float32Array(size * size);

  for (let r = 0; r < 24; r++) {
    for (let c = -1; c < 14; c++) {
      const cx = c * 42 + ((r % 2) * 21) + (Math.sin(r + c) * 3);
      const cy = r * 22 + (Math.cos(r * 2) * 2);
      const rw = 17 + (Math.sin(c * 3) * 3);
      const rh = 9 + (Math.cos(r * 3) * 2);

      dCtx.fillStyle = colors[((r * 7 + c * 3) % colors.length + colors.length) % colors.length];
      dCtx.beginPath();
      dCtx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
      dCtx.fill();

      dCtx.strokeStyle = 'rgba(8, 12, 18, 0.7)';
      dCtx.lineWidth = 2.5;
      dCtx.stroke();

      dCtx.fillStyle = 'rgba(255,255,255,0.2)';
      dCtx.beginPath();
      dCtx.ellipse(cx - 3, cy - 2, rw * 0.55, rh * 0.45, 0, 0, Math.PI * 2);
      dCtx.fill();

      for (let dy = -rh; dy <= rh; dy++) {
        for (let dx = -rw; dx <= rw; dx++) {
          const normD = (dx * dx) / (rw * rw) + (dy * dy) / (rh * rh);
          if (normD <= 1.0) {
            const px = Math.floor((cx + dx + size * 2) % size);
            const py = Math.floor((cy + dy + size * 2) % size);
            const hVal = Math.sqrt(Math.max(0, 1.0 - normD)) * 0.92;
            heights[py * size + px] = Math.max(heights[py * size + px], hVal);
          }
        }
      }
    }
  }

  const nImg = nCtx.createImageData(size, size);
  const data = nImg.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dx = (heights[y * size + xR] - heights[y * size + xL]) * 3.6;
      const dy = (heights[yD * size + x] - heights[yU * size + x]) * 3.6;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      data[idx] = Math.floor(((dx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((dy / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((dz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const diffuse = new THREE.CanvasTexture(dCanvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(2, 24);

  const normal = new THREE.CanvasTexture(nCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(2, 24);

  return {diffuse, normal};
}

function createRoofTilePBR(colorHex: string): {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture} {
  const size = 256;
  const dCanvas = document.createElement('canvas');
  dCanvas.width = size;
  dCanvas.height = size;
  const dCtx = dCanvas.getContext('2d')!;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;

  dCtx.fillStyle = '#0f172a';
  dCtx.fillRect(0, 0, size, size);

  const rows = 12;
  const cols = 6;
  const h = size / rows;
  const w = size / cols;
  const heights = new Float32Array(size * size);

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (w * 0.5);
    for (let c = -1; c <= cols; c++) {
      const bx = c * w + offset + 1;
      const by = r * h + 1;

      dCtx.fillStyle = colorHex;
      dCtx.fillRect(bx, by, w - 2, h - 2);

      dCtx.fillStyle = 'rgba(0,0,0,0.38)';
      dCtx.fillRect(bx, by + h - 3, w - 2, 3);

      dCtx.fillStyle = 'rgba(255,255,255,0.22)';
      dCtx.fillRect(bx, by, w - 2, 2);

      for (let py = Math.max(0, Math.floor(by)); py < Math.min(size, Math.floor(by + h)); py++) {
        const vSlope = (py - by) / h;
        for (let px = Math.max(0, Math.floor(bx)); px < Math.min(size, Math.floor(bx + w)); px++) {
          heights[py * size + px] = (1.0 - vSlope * 0.7) * 0.85;
        }
      }
    }
  }

  const nImg = nCtx.createImageData(size, size);
  const data = nImg.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const xL = (x - 1 + size) % size;
      const xR = (x + 1) % size;
      const yU = (y - 1 + size) % size;
      const yD = (y + 1) % size;

      const dx = (heights[y * size + xR] - heights[y * size + xL]) * 3.0;
      const dy = (heights[yD * size + x] - heights[yU * size + x]) * 3.0;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      data[idx] = Math.floor(((dx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((dy / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((dz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const diffuse = new THREE.CanvasTexture(dCanvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;
  diffuse.repeat.set(3, 3);

  const normal = new THREE.CanvasTexture(nCanvas);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(3, 3);

  return {diffuse, normal};
}

function createWaterWaveNormalMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = Math.sin((x / size) * Math.PI * 8) * 0.38 + Math.cos((y / size) * Math.PI * 12) * 0.28;
      const ny = Math.cos((x / size) * Math.PI * 6) * 0.28 + Math.sin((y / size) * Math.PI * 8) * 0.38;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz);

      data[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 18);
  return texture;
}

interface DebrisItem {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
  velocity?: [number, number, number];
}

interface ActiveDisaster {
  id: string;
  type: CatastropheType;
  position: THREE.Vector3;
  duration: number;
  maxDuration: number;
  radius: number;
  phase: number;
}

interface TreeData {
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

interface StructureBlock {
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

interface CrystalCluster {
  id: string;
  position: [number, number, number];
  scale: number;
  color: string;
  rotY: number;
}

interface ParticleFX {
  id: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
  type?: 'ember' | 'sparkle' | 'smoke' | 'debris' | 'arcane' | 'water' | 'petal' | 'rain' | 'sun_mote';
}

interface IcePatch {id: string; x: number; z: number; radius: number;}
export type GraphicsQuality = 'low' | 'medium' | 'high';

interface SceneProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  inputRef: MutableRefObject<InputSnapshot>;
  activePower: CatastropheType;
  isMiraclePrimed: boolean;
  onGestureSuccess: (miracle: CatastropheType, confidence: number) => void;
  onGestureFail: () => void;
  resetSignal: number;
  worldSeed: number;
  restoredKingdom?: SavedKingdom | null;
  checkpointRequest: number;
  onCheckpoint?: (state: WorldCheckpoint, sourceEpoch: number) => void;
  onBaseline?: (blocks: StructureBlock[]) => void;
  onSaveRejected?: () => void;
  simSpeed: number;
  powerForce: number;
  interactionMode: MouseInteractionMode;
  cameraPreset?: string | null;
  onPresetApplied?: () => void;
  onMessage?: (text: string) => void;
  onTelemetry?: (fps: number, drawCalls: number) => void;
  onWorldEvent?: (event: ChronicleEvent) => void;
  onGroundStats?: (stats: GroundStats) => void;
  onInspect?: (description: string) => void;
  onWind?: (wind: Wind) => void;
  trialEnabled: boolean;
  trialGeneration: number;
  onTrialView?: (view: TrialView | null) => void;
  memoryLayer?: MemoryLayer;
  quality: GraphicsQuality;
}

const scratchVec = new THREE.Vector3();
const pointerVec = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const planeNormal = new THREE.Vector3(0, 1, 0);
const groundPlane = new THREE.Plane(planeNormal, 0);

type HandState = 'idle' | 'point' | 'grab_world' | 'holding' | 'cast' | 'drawing_gesture';

// ====================================================
// ATMOSPHERIC SYSTEM
// ====================================================

function AtmosphericDustMotes() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dustFrame = useRef(-1);
  const object = useMemo(() => new THREE.Object3D(), []);
  const motes = useMemo(() => Array.from({length: 120}, () => ({
    x: randomRange(-50, 50), y: randomRange(2, 28), z: randomRange(-50, 50),
    speed: randomRange(0.2, 0.7), phase: randomRange(0, Math.PI * 2),
    size: randomRange(0.04, 0.14),
  })), []);
  useFrame(({clock}) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (t - dustFrame.current < 0.05) return;
    dustFrame.current = t;
    motes.forEach((m, i) => {
      object.position.set(m.x + Math.sin(t * 0.5 + m.phase) * 1.8,
        2 + ((m.y + t * m.speed) % 26), m.z + Math.cos(t * 0.4 + m.phase) * 1.8);
      object.scale.setScalar(m.size);
      object.updateMatrix();
      ref.current!.setMatrixAt(i, object.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, motes.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshBasicMaterial color="#fef08a" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  );
}

function SoaringEagles() {
  const birdsRef = useRef<THREE.Group>(null);
  const birds = useMemo(
    () => [
      {radius: 45, speed: 0.28, height: 38, offset: 0},
      {radius: 58, speed: -0.22, height: 44, offset: 2.1},
      {radius: 36, speed: 0.32, height: 32, offset: 4.2},
    ],
    [],
  );

  useFrame(({clock}) => {
    if (!birdsRef.current) return;
    const t = REDUCE_SCENIC_MOTION ? 0 : clock.getElapsedTime();
    birdsRef.current.children.forEach((b, i) => {
      const cfg = birds[i];
      const angle = t * cfg.speed + cfg.offset;
      b.position.set(
        Math.cos(angle) * cfg.radius,
        cfg.height + Math.sin(t * 0.8 + i) * 1.5,
        Math.sin(angle) * cfg.radius,
      );
      b.rotation.y = -angle + (cfg.speed > 0 ? -Math.PI / 2 : Math.PI / 2);
      b.rotation.z = REDUCE_SCENIC_MOTION ? 0 : Math.sin(t * 3.5 + i) * 0.08;
      const beat = REDUCE_SCENIC_MOTION ? 0 : Math.sin(t * 3.5 + i * 0.7) * 0.19;
      if (b.children[1]) b.children[1].rotation.z = 1.42 + beat;
      if (b.children[2]) b.children[2].rotation.z = -1.42 - beat;
    });
  });

  return (
    <group ref={birdsRef}>
      {birds.map((_, i) => (
        <group key={i} scale={[0.65, 0.65, 0.65]}>
          <mesh position={[0, 0, 0]} castShadow>
            <coneGeometry args={[0.3, 1.8, 5]} />
            <meshStandardMaterial color="#332211" roughness={0.8} />
          </mesh>
          <mesh position={[-0.75, 0.1, 0.2]} rotation={[0, 0, 1.42]}>
            <coneGeometry args={[0.54, 2.45, 3]} />
            <meshStandardMaterial color="#382f24" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0.75, 0.1, 0.2]} rotation={[0, 0, -1.42]}>
            <coneGeometry args={[0.54, 2.45, 3]} />
            <meshStandardMaterial color="#382f24" roughness={0.9} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Color-graded sky: horizon / weather are one coherent field, not a solid blue bubble.
 * The owned geometry is disposed on weather transitions and unmount. */
function createGradientSky(mode: 'clear' | 'storm' | 'ember') {
  const geometry = new THREE.SphereGeometry(340, 40, 24);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  const horizon = new THREE.Color(mode === 'storm' ? '#626a72' : mode === 'ember' ? '#b16a48' : '#e8c8a0');
  const zenith = new THREE.Color(mode === 'storm' ? '#142c3b' : mode === 'ember' ? '#3e2930' : '#245975');
  const low = new THREE.Color(mode === 'storm' ? '#33464a' : mode === 'ember' ? '#49342a' : '#8ba18b');
  const col = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const latitude = positions.getY(i) / 340;
    if (latitude >= 0) col.copy(horizon).lerp(zenith, Math.pow(Math.min(1, latitude), 0.58));
    else col.copy(horizon).lerp(low, Math.min(1, -latitude));
    col.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function SceneWeatherFog({hasStorm, hasVolcano}: {hasStorm: boolean; hasVolcano: boolean}) {
  const {scene} = useThree();
  useEffect(() => {
    const prior = scene.fog;
    scene.fog = new THREE.Fog(hasVolcano ? '#8a6758' : hasStorm ? '#566975' : '#a6b1a7', 72, 265);
    return () => {scene.fog = prior;};
  }, [scene, hasStorm, hasVolcano]);
  return null;
}

function RealisticSkyDome({hasStorm, hasVolcano}: {hasStorm: boolean; hasVolcano: boolean}) {
  const mode = hasVolcano ? 'ember' : hasStorm ? 'storm' : 'clear';
  const geometry = useMemo(() => createGradientSky(mode), [mode]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group>
    <mesh geometry={geometry} position={[0, -20, 0]}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
    {/* The warm solar disk remains visible against the painted atmosphere. */}
    {!hasStorm && <group position={[70, 95, 55]}>
      <mesh><sphereGeometry args={[8.2, 20, 16]} />
        <meshBasicMaterial color={hasVolcano ? '#ffc88a' : '#ffeed0'} fog={false}/></mesh>
      <mesh><sphereGeometry args={[12.5, 16, 12]} />
        <meshBasicMaterial color={hasVolcano ? '#e76d32' : '#f6d6aa'} transparent opacity={0.10}
          depthWrite={false} fog={false} /></mesh>
    </group>}
  </group>;
}

/** Two instanced cloud strata (rather than 128 individually drawn giant spheres).
 * Placement is seed-stable and movement is slow enough not to disrupt casting. */
function RealisticAtmosphericClouds({hasStorm, hasVolcano, seed, quality}: {
  hasStorm: boolean; hasVolcano: boolean; seed: number; quality: VisualTier;
}) {
  const banks = useMemo(() => sculptClouds(seed, quality), [seed, quality]);
  const upper = useRef<THREE.InstancedMesh>(null);
  const underside = useRef<THREE.InstancedMesh>(null);
  const drift = useRef<THREE.Group>(null);
  const object = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    if (!upper.current || !underside.current) return;
    banks.forEach((b, i) => {
      for (let l = 0; l < 3; l++) {
        object.position.set(b.x + (l - 1) * b.span * 0.76, b.y + (l === 1 ? 0.8 : 0), b.z + (l - 1) * 0.4);
        object.rotation.set(0, (l - 1) * 0.11, 0);
        object.scale.set(b.span * (l === 1 ? 1.05 : 0.78), b.depth * (l === 1 ? 1.6 : 1.15), b.span * 0.59);
        object.updateMatrix();
        upper.current!.setMatrixAt(i * 3 + l, object.matrix);
      }
      object.position.set(b.x, b.y - b.depth * 0.74, b.z);
      object.scale.set(b.span * 1.62, b.depth * 0.47, b.span * 0.78);
      object.rotation.set(0, 0, 0); object.updateMatrix();
      underside.current!.setMatrixAt(i, object.matrix);
    });
    upper.current.instanceMatrix.needsUpdate = true;
    underside.current.instanceMatrix.needsUpdate = true;
    upper.current.computeBoundingSphere(); underside.current.computeBoundingSphere();
  }, [banks, object]);
  useFrame(({clock}) => {
    if (!drift.current) return;
    const t = clock.getElapsedTime();
    drift.current.position.x = REDUCE_SCENIC_MOTION ? 0 : Math.sin(t * 0.008) * 3.8;
    drift.current.rotation.y = REDUCE_SCENIC_MOTION ? 0 : Math.sin(t * 0.002) * 0.014;
  });
  const top = hasVolcano ? '#8a6051' : hasStorm ? '#87949c' : '#e6e1d3';
  const shade = hasVolcano ? '#503c3b' : hasStorm ? '#334957' : '#95a9ad';
  return <group ref={drift}>
    <instancedMesh ref={upper} args={[undefined, undefined, banks.length * 3]}>
      <sphereGeometry args={[1, 9, 6]} />
      <meshLambertMaterial color={top} transparent opacity={0.82} depthWrite={false} />
    </instancedMesh>
    <instancedMesh ref={underside} args={[undefined, undefined, banks.length]}>
      <sphereGeometry args={[1, 8, 5]} />
      <meshLambertMaterial color={shade} transparent opacity={0.56} depthWrite={false} />
    </instancedMesh>
  </group>;
}

/** Silhouette rings extend beyond the playable collider and never change game physics. */
function createRidgeGeometry(seed: number, band: number, segments: number) {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const radius = 112 + 41 * band;
  const rock = new THREE.Color(band === 0 ? '#456359' : band === 1 ? '#4b6570' : '#506679');
  const foot = new THREE.Color(band === 0 ? '#394c42' : band === 1 ? '#344b55' : '#324653');
  for (let i = 0; i <= segments; i++) {
    const angle = i / segments * Math.PI * 2;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const crown = ridgeHeight(seed, band, angle);
    vertices.push(x, -13, z, x, crown, z);
    foot.toArray(colors, colors.length); rock.toArray(colors, colors.length);
    if (i < segments) {const k = 2 * i; indices.push(k, k + 1, k + 3, k, k + 3, k + 2);}
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function RidgeBand({seed, band, segments}: {seed: number; band: number; segments: number}) {
  const geometry = useMemo(() => createRidgeGeometry(seed, band, segments), [seed, band, segments]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow={false} frustumCulled={false}>
    <meshLambertMaterial side={THREE.DoubleSide} vertexColors flatShading />
  </mesh>;
}
function DistantRidges({seed, quality}: {seed: number; quality: VisualTier}) {
  const budget = visualBudget(quality);
  return <group>{Array.from({length: budget.ridgeBands}, (_, band) =>
    <RidgeBand key={band} seed={seed} band={band} segments={budget.ridgeSegments} />)}</group>;
}

/** Actual instanced art objects: limestone fragments and undergrowth, no collisions or input layer. */
function ScenicGround({seed, quality}: {seed: number; quality: VisualTier}) {
  const stones = useMemo(() => scenicPlacements(seed, quality, 'rocks'), [seed, quality]);
  const soil = useMemo(() => scenicPlacements(seed, quality, 'patches'), [seed, quality]);
  const stonesRef = useRef<THREE.InstancedMesh>(null);
  const soilRef = useRef<THREE.InstancedMesh>(null);
  const marker = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  useEffect(() => {
    if (!stonesRef.current || !soilRef.current) return;
    stones.forEach((p, i) => {
      marker.position.set(p.x, 0.12 * p.scale, p.z);
      marker.rotation.set(0, p.yaw, 0.12);
      marker.scale.set(p.scale * 0.53, p.scale * 0.23, p.scale * 0.41);
      marker.updateMatrix(); stonesRef.current!.setMatrixAt(i, marker.matrix);
      stonesRef.current!.setColorAt(i, tint.set(['#747c73', '#9a967f', '#636e69', '#827b6f'][p.tint]));
    });
    soil.forEach((p, i) => {
      marker.position.set(p.x, 0.013, p.z);
      marker.rotation.set(-Math.PI / 2, 0, p.yaw);
      marker.scale.set(p.scale * 0.9, p.scale * 0.66, 1);
      marker.updateMatrix(); soilRef.current!.setMatrixAt(i, marker.matrix);
      soilRef.current!.setColorAt(i, tint.set(['#6d7051', '#526346', '#777259', '#536452'][p.tint]));
    });
    for (const mesh of [stonesRef.current, soilRef.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [stones, soil, marker, tint]);
  return <group>
    <instancedMesh ref={stonesRef} args={[undefined, undefined, stones.length]} receiveShadow={quality === 'high'}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.95} metalness={0.03} />
    </instancedMesh>
    <instancedMesh ref={soilRef} args={[undefined, undefined, soil.length]}>
      <circleGeometry args={[1, 9]} />
      <meshBasicMaterial transparent opacity={0.34} depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
    </instancedMesh>
  </group>;
}

/** Shared PBR accents: survival/destruction controls the instances, not decorative local state.
 * One draw submission per material family; the canonical mesh/collider remains unchanged. */
const FACADE_TIMBER = ['#493525','#61452b','#3e3329','#715337'];
const FACADE_DOOR = ['#2c2520','#493228','#302925','#46392d'];
const FACADE_GLASS = ['#3e6671','#536d6b','#476576','#6e746e'];
const FACADE_IRON = ['#d6b777','#4b5454'];
const MASONRY_COLORS = ['#758078','#a9a69a','#8c8f89'];
const RUBBLE_COLORS = ['#64726c','#929187','#695c50'];
function InstancedDetail({pieces,palette,metalness=0,roughness=.88,shadow=false,glow=false}: {
  pieces: DetailInstance[]; palette: readonly string[];
  metalness?:number; roughness?:number; shadow?:boolean; glow?:boolean;
}) {
  const mesh=useRef<THREE.InstancedMesh>(null);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const tint=useMemo(()=>new THREE.Color(),[]);
  useLayoutEffect(()=>{
    if(!mesh.current) return;
    for(let i=0;i<pieces.length;i++){
      const d=pieces[i];
      dummy.position.set(d.x,d.y,d.z);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(d.width,d.height,d.depth);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i,dummy.matrix);
      mesh.current.setColorAt(i,tint.set(palette[d.tint%palette.length]));
    }
    mesh.current.instanceMatrix.needsUpdate=true;
    if(mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate=true;
    mesh.current.computeBoundingSphere();
  },[pieces,palette,dummy,tint]);
  if(pieces.length===0) return null;
  return <instancedMesh ref={mesh} args={[undefined,undefined,pieces.length]} castShadow={shadow} receiveShadow={shadow}>
    <boxGeometry args={[1,1,1]}/>
    <meshStandardMaterial color="#ffffff" metalness={metalness} roughness={roughness}
      emissive={glow?'#27383a':'#000000'} emissiveIntensity={glow?.3:0}/>
  </instancedMesh>;
}

/** Road-facing timber and inhabited windows vanish with their parent house wall. */
function LivingVillageFacades({blocks,quality}:{blocks:StructureBlock[];quality:VisualTier}){
  const parts=useMemo(()=>livingFacades(blocks),[blocks]);
  return <group>
    <InstancedDetail pieces={parts.timber} palette={FACADE_TIMBER} shadow={quality==='high'}/>
    <InstancedDetail pieces={parts.doors} palette={FACADE_DOOR}/>
    <InstancedDetail pieces={parts.glazing} palette={FACADE_GLASS} metalness={.32} roughness={.24} glow/>
    <InstancedDetail pieces={parts.hardware} palette={FACADE_IRON} metalness={.75} roughness={.46}/>
  </group>;
}

/** Readable defensive silhouettes, governed by actual surviving stone blocks. */
function FortificationDetail({blocks,quality}:{blocks:StructureBlock[];quality:VisualTier}){
  const merlons=useMemo(()=>survivingMerlons(blocks,quality),[blocks,quality]);
  return <InstancedDetail pieces={merlons} palette={MASONRY_COLORS} shadow={quality==='high'}/>;
}

/** A restored wall removes its old rubble immediately; time travel repeats its seed-stable debris. */
function RuinedFoundations({blocks,seed,quality}:{blocks:StructureBlock[];seed:number;quality:VisualTier}){
  const fragments=useMemo(()=>ruinFragments(blocks,seed,quality),[blocks,seed,quality]);
  return <InstancedDetail pieces={fragments} palette={RUBBLE_COLORS} roughness={1}/>;
}

function RoofRidgelines({blocks}:{blocks:StructureBlock[]}){
  const ridges=useMemo(()=>roofRidges(blocks),[blocks]);
  return <InstancedDetail pieces={ridges} palette={['#9d503f','#a87848','#526789','#8b533d']}
    roughness={.9}/>;
}

/** The forged gate is real dark iron geometry, never a wireframe debugging cube. */
function ForgedPortcullis(){
  const bars=useMemo<DetailInstance[]>(()=>{
    const out:DetailInstance[]=[];
    for(let i=0;i<9;i++)out.push({x:13.96,y:1.95,z:-20.0+i*.5,width:.14,height:3.35,depth:.14,tint:0});
    for(const y of [.98,2.65])out.push({x:13.95,y,z:-18.0,width:.18,height:.2,depth:4.24,tint:1});
    return out;
  },[]);
  return <group>
    <InstancedDetail pieces={bars} palette={['#293038','#4b4a43']} metalness={.84} roughness={.36}/>
    {[-20.45,-15.55].map(z=><mesh key={z} position={[13.9,2,z]} castShadow>
      <boxGeometry args={[.7,4.4,.6]}/><meshStandardMaterial color="#77827e" roughness={.91}/>
    </mesh>)}
    <mesh position={[13.9,4.25,-18]} castShadow>
      <boxGeometry args={[.8,.7,5.5]}/><meshStandardMaterial color="#748077" roughness={.88}/>
    </mesh>
  </group>;
}

/** The old four perfect cones become eroded, irregular mountains at each map edge.
 * Decorative cliff meshes never acquire collision or change the game world's ground plane. */
function createEscarpmentGeometry(seed:number,edge:CardinalEdge,tier:VisualTier){
  const profile=escarpmentProfile(seed,edge,tier);
  const positions:number[]=[]; const colors:number[]=[]; const indices:number[]=[];
  const inner=new THREE.Color('#536a53');
  const crest=new THREE.Color('#5c6e69');
  const outer=new THREE.Color('#68777b');
  for(const section of profile){
    const sign=edge==='north'||edge==='west'?-1:1;
    const cross=section.across;
    const row:[[number,number,number,THREE.Color],[number,number,number,THREE.Color],[number,number,number,THREE.Color]] =
      edge==='north'||edge==='south'
        ? [[cross,.05,sign*81,inner],[cross,section.crest,sign*89,crest],[cross,section.crest*.62,sign*102,outer]]
        : [[sign*81,.05,cross,inner],[sign*89,section.crest,cross,crest],[sign*102,section.crest*.62,cross,outer]];
    for(const [x,y,z,color] of row){positions.push(x,y,z);color.toArray(colors,colors.length);}
  }
  for(let i=0;i<profile.length-1;i++)for(let lane=0;lane<2;lane++){
    const a=i*3+lane,b=a+3;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  return geometry;
}
function LivingEscarpments({seed,quality}:{seed:number;quality:VisualTier}){
  return <group>{(['north','south','east','west'] as const).map(edge=><Escarpment key={edge} seed={seed} edge={edge} quality={quality}/>)}</group>;
}
function Escarpment({seed,edge,quality}:{seed:number;edge:CardinalEdge;quality:VisualTier}){
  const geometry=useMemo(()=>createEscarpmentGeometry(seed,edge,quality),[seed,edge,quality]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} receiveShadow={quality!=='low'}>
    <meshLambertMaterial vertexColors side={THREE.DoubleSide} flatShading/>
  </mesh>;
}

/** Thin refracted-current dashes move with the physical river without simulating new water. */
function RiverCurrentHighlights({seed,quality,isFrozen}:{seed:number;quality:VisualTier;isFrozen:boolean}){
  const items=useMemo(()=>riverHighlights(seed,quality),[seed,quality]);
  const mesh=useRef<THREE.InstancedMesh>(null);
  const marker=useMemo(()=>new THREE.Object3D(),[]);
  const last=useRef(-1);
  useFrame(({clock})=>{
    if(!mesh.current||isFrozen||(REDUCE_SCENIC_MOTION&&last.current>=0))return;
    const t=clock.getElapsedTime();
    if(t-last.current<.05)return;
    last.current=t;
    for(let i=0;i<items.length;i++){
      const d=items[i];
      marker.position.set(d.x,REDUCE_SCENIC_MOTION?.105:(.089+Math.sin(t*1.6)*.025),
        (d.z+80+t*(REDUCE_SCENIC_MOTION?0:d.speed)*2)%160-80);
      marker.rotation.set(-Math.PI/2,0,0);
      marker.scale.set(d.width,d.length,1);
      marker.updateMatrix();mesh.current.setMatrixAt(i,marker.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate=true;
  });
  return !isFrozen?<instancedMesh ref={mesh} args={[undefined,undefined,items.length]} frustumCulled={false}>
    <planeGeometry args={[1,1]}/>
    <meshBasicMaterial color="#ddf7ee" transparent opacity={.22} depthWrite={false} toneMapped={false}/>
  </instancedMesh>:null;
}

function DynamicGrassFoliage({isRiverFrozen, worldSeed, quality}: {isRiverFrozen: boolean; worldSeed: number; quality: VisualTier}) {
  const tufts = useMemo(() => {
    const list: {x: number; z: number; rot: number; scale: number; flower?: string}[] = [];
    const colors = ['#ef4444', '#a855f7', '#facc15', '#38bdf8', '#fb7185', '#ffffff'];
    for (let i = 0; i < (quality === 'high' ? 260 : 160); i++) {
      const angle = artNoise(worldSeed, i, 40) * Math.PI * 2;
      const dist = 5 + artNoise(worldSeed, i, 41) * 63;
      const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist;
      if (Math.abs(x) < 9.5 || (x > 8 && z < -6) || (x < -10 && z > -18 && z < 28)) continue;
      list.push({x, z, rot: artNoise(worldSeed, i, 42) * 6.28, scale: 0.75 + artNoise(worldSeed, i, 43) * 0.7,
        flower: i % 4 === 0 ? colors[i % colors.length] : undefined});
    }
    return list;
  }, [worldSeed, quality]);
  const flowerTufts = useMemo(() => tufts.filter(t => t.flower), [tufts]);
  const bladesRef = useRef<THREE.InstancedMesh>(null);
  const tipsRef = useRef<THREE.InstancedMesh>(null);
  const flowersRef = useRef<THREE.InstancedMesh>(null);
  const object = useMemo(() => new THREE.Object3D(), []);
  const flowerColor = useMemo(() => new THREE.Color(), []);
  const grassFrame = useRef(-1);
  useEffect(() => {
    if (!flowersRef.current) return;
    flowerTufts.forEach((tf, i) => {
      object.position.set(tf.x, 0.75 * tf.scale, tf.z);
      object.rotation.set(0, 0, 0);
      object.scale.setScalar(0.12 * tf.scale);
      object.updateMatrix();
      flowersRef.current!.setMatrixAt(i, object.matrix);
      flowersRef.current!.setColorAt(i, flowerColor.set(tf.flower!));
    });
    flowersRef.current.instanceMatrix.needsUpdate = true;
    if (flowersRef.current.instanceColor) flowersRef.current.instanceColor.needsUpdate = true;
  }, [flowerTufts, object, flowerColor]);
  useFrame(({clock}) => {
    if (!bladesRef.current || !tipsRef.current) return;
    const t = clock.getElapsedTime();
    // 20 Hz botanical sway is perceptually continuous at kingdom camera distance.
    if (t - grassFrame.current < 0.05) return;
    grassFrame.current = t;
    tufts.forEach((tf, i) => {
      for (let b = 0; b < 3; b++) {
        const idx = i * 3 + b;
        const sway = REDUCE_SCENIC_MOTION ? 0 : Math.sin(t * 2.0 + i * 0.25) * 0.085;
        object.rotation.set(0, tf.rot + b * Math.PI / 3, sway);
        object.position.set(tf.x, 0.38 * tf.scale, tf.z);
        object.scale.set(tf.scale, tf.scale, tf.scale);
        object.updateMatrix();
        bladesRef.current!.setMatrixAt(idx, object.matrix);
        object.position.y = 0.82 * tf.scale;
        object.updateMatrix();
        tipsRef.current!.setMatrixAt(idx, object.matrix);
      }
    });
    bladesRef.current.instanceMatrix.needsUpdate = true;
    tipsRef.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={bladesRef} args={[undefined, undefined, tufts.length * 3]} frustumCulled={false}>
        <boxGeometry args={[0.07, 0.76, 0.02]} />
        <meshStandardMaterial color={isRiverFrozen ? '#94a3b8' : '#365314'} roughness={0.65} />
      </instancedMesh>
      <instancedMesh ref={tipsRef} args={[undefined, undefined, tufts.length * 3]} frustumCulled={false}>
        <coneGeometry args={[0.05, 0.32, 3]} />
        <meshStandardMaterial color={isRiverFrozen ? '#cbd5e1' : '#65a30d'} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={flowersRef} args={[undefined, undefined, flowerTufts.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.55} emissive="#3b0764" emissiveIntensity={0.18} />
      </instancedMesh>
    </group>
  );
}

function GestureRibbonTrail({points, activeColor}: {points: THREE.Vector3[]; activeColor: string}) {
  if (points.length < 2) return null;

  return (
    <group>
      {points.slice(1).map((pt, i) => {
        const prev = points[i];
        const mid = new THREE.Vector3().addVectors(pt, prev).multiplyScalar(0.5);
        const dist = pt.distanceTo(prev);
        const dir = new THREE.Vector3().subVectors(pt, prev).normalize();

        const orient = new THREE.Quaternion();
        orient.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        return (
          <group key={i} position={[mid.x, mid.y + 0.3, mid.z]} quaternion={orient}>
            <mesh>
              <cylinderGeometry args={[0.26, 0.26, Math.max(0.1, dist), 8]} />
              <meshBasicMaterial color={activeColor} transparent opacity={0.92} />
            </mesh>
          </group>
        );
      })}

      {points.map((pt, i) => (
        <mesh key={`pt_${i}`} position={[pt.x, pt.y + 0.3, pt.z]}>
          <sphereGeometry args={[0.32, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

function SummoningMandala({
  positionRef,
  activeColor,
  isPrimed,
  radius,
}: {
  positionRef: React.MutableRefObject<THREE.Vector3 | null>;
  activeColor: string;
  isPrimed: boolean;
  radius: number;
}) {
  const mandalaRef = useRef<THREE.Group>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame(({clock}) => {
    const t = clock.getElapsedTime();
    const mandala = mandalaRef.current;
    if (mandala) {
      const position = positionRef.current;
      mandala.visible = !!position && isPrimed;
      if (position) mandala.position.set(position.x, 0.15, position.z);
    }
    if (ringRef1.current) ringRef1.current.rotation.z = t * 1.8;
    if (ringRef2.current) ringRef2.current.rotation.z = -t * 2.4;
  });

  if (!isPrimed) return null;

  return (
    <group ref={mandalaRef} visible={false} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ringRef1}>
        <ringGeometry args={[radius * 0.95, radius, 72]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef2}>
        <ringGeometry args={[radius * 0.38, radius * 0.43, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <circleGeometry args={[Math.min(2.8, radius * 0.28), 24]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function RealisticDivineHand({
  groundPosRef,
  handState,
  activePowerDef,
  isPrimed,
  quality,
}: {
  groundPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  handState: HandState;
  activePowerDef: any;
  isPrimed: boolean;
  quality: VisualTier;
}) {
  const handGroupRef = useRef<THREE.Group>(null);
  const currentPosRef = useRef(new THREE.Vector3(0, 15, 0));
  const previousPosRef = useRef(new THREE.Vector3(0, 15, 0));
  const targetPosRef = useRef(new THREE.Vector3(0, 15, 0));
  const tiltRef = useRef(new THREE.Vector2(0, 0));
  const orbRef = useRef<THREE.Group>(null);

  const fingersRef = useRef<{
    thumb: THREE.Group | null;
    index: THREE.Group | null;
    middle: THREE.Group | null;
    ring: THREE.Group | null;
    pinky: THREE.Group | null;
  }>({thumb: null, index: null, middle: null, ring: null, pinky: null});

  useFrame(({clock}, dt) => {
    if (!handGroupRef.current) return;
    const t = clock.getElapsedTime();

    const groundPos = groundPosRef.current;
    if (groundPos) {
      const hoverHeight =
        handState === 'grab_world'
          ? 0.4
          : handState === 'drawing_gesture'
          ? 0.8
          : handState === 'point'
          ? 2.0
          : 3.2;

      targetPosRef.current.set(groundPos.x, groundPos.y + hoverHeight, groundPos.z);
    }

    const lerpSpeed = handState === 'grab_world' || handState === 'drawing_gesture' ? 28 : 18;
    const prevPos = previousPosRef.current.copy(currentPosRef.current);
    currentPosRef.current.lerp(targetPosRef.current, Math.min(1, dt * lerpSpeed));

    const velX = (currentPosRef.current.x - prevPos.x) / Math.max(0.001, dt);
    const velZ = (currentPosRef.current.z - prevPos.z) / Math.max(0.001, dt);
    tiltRef.current.x = THREE.MathUtils.lerp(tiltRef.current.x, THREE.MathUtils.clamp(-velZ * 0.035, -0.6, 0.6), 0.15);
    tiltRef.current.y = THREE.MathUtils.lerp(tiltRef.current.y, THREE.MathUtils.clamp(velX * 0.035, -0.6, 0.6), 0.15);

    const floatOffset = REDUCE_SCENIC_MOTION || handState === 'grab_world' ? 0 : Math.sin(t * 3.6) * 0.16;

    handGroupRef.current.position.set(
      currentPosRef.current.x,
      currentPosRef.current.y + floatOffset,
      currentPosRef.current.z,
    );

    const basePitch =
      handState === 'grab_world'
        ? 0.68
        : handState === 'drawing_gesture'
        ? 0.75
        : handState === 'point'
        ? 0.18
        : 0.35;

    handGroupRef.current.rotation.set(
      basePitch + tiltRef.current.x,
      -0.22,
      tiltRef.current.y,
    );

    const f = fingersRef.current;
    if (f.index && f.middle && f.ring && f.pinky && f.thumb) {
      if (handState === 'grab_world') {
        f.index.rotation.x = 1.42;
        f.middle.rotation.x = 1.52;
        f.ring.rotation.x = 1.48;
        f.pinky.rotation.x = 1.42;
        f.thumb.rotation.y = -0.85;
      } else if (handState === 'drawing_gesture') {
        f.index.rotation.x = 0.05;
        f.middle.rotation.x = 1.4;
        f.ring.rotation.x = 1.4;
        f.pinky.rotation.x = 1.4;
        f.thumb.rotation.y = -0.7;
      } else if (handState === 'point') {
        f.index.rotation.x = 0.05;
        f.middle.rotation.x = 1.25;
        f.ring.rotation.x = 1.25;
        f.pinky.rotation.x = 1.25;
        f.thumb.rotation.y = -0.65;
      } else {
        const curl = REDUCE_SCENIC_MOTION ? 0.35 : Math.sin(t * 3.0) * 0.08 + 0.35;
        f.index.rotation.x = curl;
        f.middle.rotation.x = curl + 0.05;
        f.ring.rotation.x = curl + 0.03;
        f.pinky.rotation.x = curl - 0.05;
        f.thumb.rotation.y = -0.28;
      }
    }

    if (orbRef.current && !REDUCE_SCENIC_MOTION) {
      orbRef.current.rotation.y = t * 2.8;
      orbRef.current.rotation.x = t * 1.8;
    }
  });

  return (
    <group ref={handGroupRef} scale={[0.88, 0.88, 0.88]}>
      {/* Wrist Gauntlet */}
      <group position={[0, 1.3, 1.45]} rotation={[0.42, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.56, 0.72, 1.35, 16]} />
          <meshStandardMaterial
            color="#fbbf24"
            metalness={0.94}
            roughness={0.14}
            emissive="#d97706"
            emissiveIntensity={0.35}
          />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <torusGeometry args={[0.7, 0.09, 12, 32]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.8}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </group>

      {/* Palm */}
      <mesh position={[0, 0.35, 0.45]} castShadow>
        <boxGeometry args={[1.12, 0.4, 1.22]} />
        <meshStandardMaterial
          color="#fef08a"
          metalness={0.55}
          roughness={0.28}
          emissive="#ca8a04"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Sapphire Gem Inset on Hand Back */}
      <mesh position={[0, 0.58, 0.45]} castShadow>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={2.2}
          roughness={0.05}
          metalness={0.95}
        />
      </mesh>

      {/* Hovering Primed Elemental Orb */}
      {isPrimed && (
        <group ref={orbRef} position={[0, 1.3, 0]}>
          <mesh>
            <octahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial
              color={activePowerDef ? activePowerDef.color : '#facc15'}
              emissive={activePowerDef ? activePowerDef.color : '#facc15'}
              emissiveIntensity={3.5}
              roughness={0.05}
              metalness={0.95}
            />
          </mesh>
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((satAngle, idx) => (
            <mesh
              key={idx}
              position={[Math.cos(satAngle) * 0.85, Math.sin(satAngle * 2) * 0.3, Math.sin(satAngle) * 0.85]}>
              <sphereGeometry args={[0.12, 6, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
          {quality !== 'low' && <pointLight color={activePowerDef ? activePowerDef.color : '#facc15'} intensity={8.5} distance={12} />}
        </group>
      )}

      {/* Fingers */}
      <group ref={(el) => { fingersRef.current.thumb = el; }} position={[-0.6, 0.25, 0.4]} rotation={[0.2, -0.42, -0.32]}>
        <mesh position={[0, 0, -0.3]} castShadow>
          <boxGeometry args={[0.26, 0.24, 0.55]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.05, -0.65]} rotation={[0.4, 0, 0]} castShadow>
          <boxGeometry args={[0.24, 0.22, 0.45]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
      </group>

      <group ref={(el) => { fingersRef.current.index = el; }} position={[-0.39, 0.3, -0.15]}>
        <mesh position={[0, 0, -0.4]} castShadow>
          <boxGeometry args={[0.23, 0.22, 0.65]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.08, -0.85]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.21, 0.2, 0.5]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
        {(handState === 'point' || handState === 'drawing_gesture') && (
          <mesh position={[0, -0.15, -1.18]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshBasicMaterial color={activePowerDef.color} />
          </mesh>
        )}
      </group>

      <group ref={(el) => { fingersRef.current.middle = el; }} position={[-0.13, 0.3, -0.18]}>
        <mesh position={[0, 0, -0.45]} castShadow>
          <boxGeometry args={[0.24, 0.22, 0.72]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.08, -0.92]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.22, 0.2, 0.55]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
      </group>

      <group ref={(el) => { fingersRef.current.ring = el; }} position={[0.14, 0.3, -0.16]}>
        <mesh position={[0, 0, -0.4]} castShadow>
          <boxGeometry args={[0.23, 0.22, 0.65]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.08, -0.85]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.21, 0.2, 0.5]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
      </group>

      <group ref={(el) => { fingersRef.current.pinky = el; }} position={[0.39, 0.28, -0.12]}>
        <mesh position={[0, 0, -0.32]} castShadow>
          <boxGeometry args={[0.2, 0.2, 0.5]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[0, -0.08, -0.68]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 0.18, 0.42]} />
          <meshStandardMaterial color="#fef08a" metalness={0.55} roughness={0.28} />
        </mesh>
      </group>

      {/* Divine Arcane Halo Ring */}
      <mesh position={[0, 0.42, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.55, 32]} />
        <meshBasicMaterial
          color={activePowerDef ? activePowerDef.color : '#fbbf24'}
          transparent
          opacity={isPrimed ? 0.9 : 0.45}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function RealisticRiverSystem({
  isFrozen,
  blocks,
  stonePBR,
  waterNormalMap,
  quality,
  worldSeed,
}: {
  isFrozen: boolean;
  blocks: StructureBlock[];
  quality: VisualTier;
  worldSeed: number;
  stonePBR: {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture};
  waterNormalMap: THREE.CanvasTexture;
}) {
  const waterRef = useRef<THREE.Mesh>(null);
  const foamRef = useRef<THREE.Group>(null);
  const millRef = useRef<THREE.Group>(null);

  useFrame(({clock}) => {
    const t = REDUCE_SCENIC_MOTION ? 0 : clock.getElapsedTime();
    if (!isFrozen) {
      if (waterRef.current) {
        waterRef.current.position.y = 0.08 + Math.sin(t * 1.6) * 0.025;
        waterNormalMap.offset.y = -(t * 0.16) % 1;
        waterNormalMap.offset.x = Math.sin(t * 0.3) * 0.02;
      }
      if (foamRef.current) {
        foamRef.current.position.y = 0.09 + Math.sin(t * 2.2) * 0.015;
      }
      if (millRef.current) {
        millRef.current.rotation.x = t * 1.4;
      }
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]} receiveShadow>
        <planeGeometry args={[20, WORLD_SIZE, 8, 32]} />
        <meshStandardMaterial color="#08101e" roughness={0.96} />
      </mesh>

      {[-9.5, 9.5].map((bx, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[bx, 0.035, 0]} receiveShadow>
          <planeGeometry args={[3.6, WORLD_SIZE]} />
          <meshStandardMaterial color="#44403c" roughness={0.65} metalness={0.25} />
        </mesh>
      ))}

      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} receiveShadow>
        <planeGeometry args={[19.2, WORLD_SIZE, 16, 64]} />
        <meshStandardMaterial
          color={isFrozen ? '#bcdde3' : '#377e91'}
          normalMap={isFrozen ? undefined : waterNormalMap}
          normalScale={isFrozen ? undefined : new THREE.Vector2(0.9, 0.9)}
          roughness={isFrozen ? 0.26 : 0.22}
          metalness={isFrozen ? 0.22 : 0.38}
          transparent
          opacity={isFrozen ? 0.98 : 0.94}
        />
      </mesh>

      {!isFrozen && <group ref={foamRef} position={[0, 0.09, 0]}>
        {[-9.1, 9.1].map(edge =>
          <mesh key={edge} rotation={[-Math.PI / 2, 0, 0]} position={[edge, 0, 0]}>
            <planeGeometry args={[0.72, WORLD_SIZE]} />
            <meshBasicMaterial color="#cde9e4" transparent opacity={0.20}
              depthWrite={false} polygonOffset polygonOffsetFactor={-2}/>
          </mesh>)}
      </group>}

      <RiverCurrentHighlights seed={worldSeed} quality={quality} isFrozen={isFrozen}/>

      {/* Riverbank Spinning Waterwheel */}
      {blocks.some(b => b.id === 'riverside_watermill' && !b.destroyed) &&
      <group position={[-9.6, 1.2, 10]}>
        <group ref={millRef}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[2.2, 2.2, 0.8, 12, 1, true]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((ang, pIdx) => (
            <mesh key={pIdx} rotation={[ang, 0, 0]} castShadow>
              <boxGeometry args={[0.85, 4.4, 0.1]} />
              <meshStandardMaterial color="#451a03" roughness={0.9} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, -0.6, 0]} castShadow>
          <boxGeometry args={[1.2, 1.8, 1.2]} />
          <meshStandardMaterial color="#334155" roughness={0.85} />
        </mesh>
      </group>}

      {/* Stone Bridge with Parapets */}
      {blocks
        .filter((b) => b.type === 'bridge')
        .map((b) => {
          if (b.destroyed) return null;
          return (
            <mesh key={b.id} position={b.originalPos} castShadow receiveShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial
                map={stonePBR.diffuse}
                normalMap={stonePBR.normal}
                normalScale={new THREE.Vector2(1.2, 1.2)}
                roughness={0.75}
                metalness={0.12}
              />
            </mesh>
          );
        })}

      {[-4.8, 4.8].map((px, idx) => (
        <mesh key={idx} position={[px, 0.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.1, 1.45, 1.8, 12]} />
          <meshStandardMaterial
            map={stonePBR.diffuse}
            normalMap={stonePBR.normal}
            normalScale={new THREE.Vector2(1.2, 1.2)}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Pitched medieval roof uses the existing saved roof block dimensions.
 * Destruction and collision keep their original canonical block identity. */
function GabledRoof({block, tile}: {block: StructureBlock;
  tile: {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture}}) {
  const geometry = useMemo(() => {
    const [width, height, depth] = block.size;
    const face = new THREE.Shape();
    face.moveTo(-width / 2, -height / 2);
    face.lineTo(0, height / 2);
    face.lineTo(width / 2, -height / 2);
    face.closePath();
    const roof = new THREE.ExtrudeGeometry(face,
      {steps: 1, depth, bevelEnabled: false, curveSegments: 1});
    roof.translate(0, 0, -depth / 2);
    return roof;
  }, [block.size[0], block.size[1], block.size[2]]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={block.originalPos} geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial map={tile.diffuse} normalMap={tile.normal} color={block.color}
      roughness={0.88} metalness={0.04} flatShading side={THREE.DoubleSide} />
  </mesh>;
}

/** A softly waving cloth attached at x=0 to a stationary standard.
 * Bends only a 9x4 plane, capped at 20 Hz; never changes input or simulation. */
function RoyalStandard(){
  const cloth=useRef<THREE.Mesh>(null);
  const last=useRef(-1);
  useFrame(({clock})=>{
    if(REDUCE_SCENIC_MOTION)return;
    const geometry=cloth.current?.geometry;
    if(!geometry)return;
    const t=clock.elapsedTime;
    if(t-last.current<.05)return;
    last.current=t;
    const vertices=geometry.getAttribute('position') as THREE.BufferAttribute;
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i);
      const y=vertices.getY(i);
      const attachment=(x+.8)/1.6;
      vertices.setZ(i,REDUCE_SCENIC_MOTION?0:
        Math.sin(t*2.15 + x*2.4 + y*1.15) * .16 * attachment);
    }
    vertices.needsUpdate=true;
    geometry.computeVertexNormals();
  });
  return <group position={[22,14.8,-18]}>
    <mesh position={[0,1.25,0]} castShadow>
      <cylinderGeometry args={[.065,.07,3.05,8]}/>
      <meshStandardMaterial color="#6b4b30" roughness={.87}/>
    </mesh>
    <mesh position={[0,2.85,0]}>
      <sphereGeometry args={[.14,8,6]}/>
      <meshStandardMaterial color="#c1a36d" roughness={.40} metalness={.56}/>
    </mesh>
    <mesh ref={cloth} position={[.8,1.95,0]} castShadow>
      <planeGeometry args={[1.6,.90,8,3]}/>
      <meshStandardMaterial color="#9d322f" side={THREE.DoubleSide} roughness={.92} metalness={.02}/>
    </mesh>
  </group>;
}

function RealisticCitadel({
  blocks,
  onFire,
  quality,
  stonePBR,
  roofTilePBR,
}: {
  blocks: StructureBlock[];
  onFire: boolean;
  quality: VisualTier;
  stonePBR: {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture};
  roofTilePBR: {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture};
}) {
  const brazierLightRef = useRef<THREE.PointLight>(null);

  useFrame(({clock}) => {
    const t = clock.getElapsedTime();
    if (brazierLightRef.current) {
      brazierLightRef.current.intensity = 10 + Math.sin(t * 12) * 2.5 + Math.cos(t * 18) * 1.5;
    }
  });

  return (
    <group>
      {blocks
        .filter((b) => b.type === 'castle' || b.type === 'tower')
        .map((b) => {
          if (b.destroyed) return null;
          const isRoof = b.id.includes('roof') || b.id.includes('spire');
          if (b.id.includes('spire')) return <mesh key={b.id} position={b.originalPos} castShadow receiveShadow>
            <coneGeometry args={[b.size[0] * 0.78, b.size[1] * 1.65, 4]} />
            <meshStandardMaterial map={roofTilePBR.diffuse} normalMap={roofTilePBR.normal}
              color={b.color} roughness={0.78} metalness={0.04} flatShading />
          </mesh>;
          if (b.id.includes('roof')) return <GabledRoof key={b.id} block={b} tile={roofTilePBR} />;
          return (
            <mesh key={b.id} position={b.originalPos} castShadow receiveShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial
                map={isRoof ? roofTilePBR.diffuse : stonePBR.diffuse}
                normalMap={isRoof ? roofTilePBR.normal : stonePBR.normal}
                normalScale={new THREE.Vector2(1.2, 1.2)}
                color={onFire ? '#a19d96' : undefined}
                roughness={b.roughness ?? 0.75}
                metalness={b.metalness ?? 0.12}
                emissive={b.emissive || '#000000'}
                emissiveIntensity={b.emissiveIntensity || 0}
              />
            </mesh>
          );
        })}

      <FortificationDetail blocks={blocks} quality={quality}/>

      {blocks.some(b => b.id === 'c_keep_main' && !b.destroyed) && <>
      {/* Forged lattice and stone jambs respect the keep's actual existence. */}
      <ForgedPortcullis/>

      {/* Stained Glass Rose Window */}
      <mesh position={[22, 7.5, -13.7]} castShadow>
        <boxGeometry args={[1.9, 3.4, 0.1]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={1.6}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>

      {/* Citadel Courtyard Fountain */}
      <group position={[22, 0.4, -18]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.9, 3.3, 0.6, 16]} />
          <meshStandardMaterial map={stonePBR.diffuse} normalMap={stonePBR.normal} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[2.6, 2.6, 0.1, 16]} />
          <meshStandardMaterial color="#0284c7" roughness={0.03} metalness={0.95} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.7, 1.8, 10]} />
          <meshStandardMaterial map={stonePBR.diffuse} normalMap={stonePBR.normal} roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.4, 0]}>
          <sphereGeometry args={[0.48, 10, 10]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.1} emissive="#0284c7" emissiveIntensity={1.0} />
        </mesh>
        {quality !== 'low' && <pointLight position={[0, 2.6, 0]} color="#38bdf8" intensity={6.0} distance={14} />}
      </group>

      {/* Burning Citadel Brazier */}
      <group position={[22, 4.5, -10]}>
        {quality !== 'low' && <pointLight ref={brazierLightRef} color="#f97316" intensity={10} distance={16} decay={2} />}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.25, 0.7, 0.25]} />
          <meshStandardMaterial color="#78350f" metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.22, 6, 6]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>

      {/* Authored cloth remains visibly anchored to its standing pole. */}
      <RoyalStandard/>
      </>}
    </group>
  );
}

function RealisticVillage({
  blocks,
  quality,
  roofTilePBR,
  stonePBR,
}: {
  blocks: StructureBlock[];
  quality: VisualTier;
  roofTilePBR: {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture};
  stonePBR: {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture};
}) {
  const smokeRef = useRef<THREE.Group>(null);

  useFrame(({clock}) => {
    if (smokeRef.current) {
      const t = clock.getElapsedTime();
      smokeRef.current.children.forEach((puff, idx) => {
        puff.position.y = 5.6 + ((t * 0.85 + idx * 0.6) % 3.2);
        puff.scale.setScalar(0.25 + ((t * 0.85 + idx * 0.6) % 3.2) * 0.45);
        (puff as THREE.Mesh).position.x = Math.sin(t * 1.2 + idx) * 0.35;
      });
    }
  });

  return (
    <group>
      {blocks
        .filter((b) => b.type === 'village' || b.type === 'fence' || b.type === 'prop')
        .map((b) => {
          if (b.destroyed) return null;
          const isRoof = b.id.includes('_r_');
          if (isRoof) return <GabledRoof key={b.id} block={b} tile={roofTilePBR} />;
          return (
            <mesh key={b.id} position={b.originalPos} castShadow receiveShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial
                map={isRoof ? roofTilePBR.diffuse : undefined}
                normalMap={isRoof ? roofTilePBR.normal : undefined}
                color={b.id.includes('v_house_w_') ? '#ddd0bb' : b.color}
                roughness={b.roughness ?? 0.82}
                metalness={b.metalness ?? 0.08}
              />
            </mesh>
          );
        })}

      <LivingVillageFacades blocks={blocks} quality={quality}/>

      {blocks.some(b=>b.id==='v_house_c_0'&&!b.destroyed) &&
       blocks.some(b=>b.id==='v_house_w_0'&&!b.destroyed) &&
       <group ref={smokeRef} position={[-23, 0, -14]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, 5.5 + i * 0.65, 0]}>
            <sphereGeometry args={[0.36, 8, 8]} />
            <meshStandardMaterial color="#f1f5f9" transparent opacity={0.45} roughness={1.0} />
          </mesh>
        ))}
      </group>}

      {[-16, -26].map((lx, idx) => (
        <group key={idx} position={[lx, 0, 2]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 3.2, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          <mesh position={[0, 3.2, 0]} castShadow>
            <boxGeometry args={[0.5, 0.6, 0.5]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 3.15, 0]}>
            <boxGeometry args={[0.35, 0.4, 0.35]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          {quality !== 'low' && (quality === 'high' || idx === 0) &&
            <pointLight position={[0, 3.2, 0]} color="#fef08a" intensity={7.5} distance={15} decay={2} />}
        </group>
      ))}

      <group position={[-20, 0, 4]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.15, 1.3, 1.0, 10]} />
          <meshStandardMaterial map={stonePBR.diffuse} normalMap={stonePBR.normal} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.1, 10]} />
          <meshStandardMaterial color="#0284c7" roughness={0.05} metalness={0.9} />
        </mesh>
        <mesh position={[0, 1.85, 0]} castShadow>
          <coneGeometry args={[1.4, 0.9, 8]} />
          <meshStandardMaterial map={roofTilePBR.diffuse} normalMap={roofTilePBR.normal} roughness={0.75} />
        </mesh>
      </group>
    </group>
  );
}

function RealisticTree({tree, isRiverFrozen, registerSway}: {
  tree: TreeData; isRiverFrozen: boolean;
  registerSway: (id: number, offset: number, burnt: boolean, node: THREE.Group | null) => void;
}) {
  const attach=useCallback((node:THREE.Group|null)=>registerSway(tree.id,tree.swayOffset,tree.burnt,node),
    [registerSway,tree.id,tree.swayOffset,tree.burnt]);

  const isPine = tree.type === 'pine';
  const isCherry = tree.type === 'cherry';
  const isBirch = tree.type === 'birch';
  const regrowing = tree.burnt && (tree.regrowth ?? 0) > 0.10;

  return (
    <group ref={attach} position={tree.position} scale={[tree.scale, tree.scale, tree.scale]}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.42, 2.8, 8]} />
        <meshStandardMaterial
          color={tree.burnt ? '#1c1917' : isBirch ? '#f1f5f9' : '#78350f'}
          roughness={0.9}
        />
      </mesh>

      {isPine ? (
        <>
          <mesh position={[0, 2.8, 0]} castShadow>
            <coneGeometry args={[1.6, 2.5, 7]} />
            <meshStandardMaterial
              color={
                tree.onFire
                  ? '#ea580c'
                  : tree.burnt
                  ? (regrowing ? '#365314' : '#292524')
                  : isRiverFrozen
                  ? '#e2e8f0'
                  : '#15803d'
              }
              emissive={tree.onFire ? '#ef4444' : '#000000'}
              emissiveIntensity={tree.onFire ? 1.0 : 0}
              roughness={0.65}
            />
          </mesh>
          <mesh position={[0, 4.3, 0]} castShadow>
            <coneGeometry args={[1.2, 2.2, 7]} />
            <meshStandardMaterial
              color={
                tree.onFire
                  ? '#f97316'
                  : tree.burnt
                  ? (regrowing ? '#3f6212' : '#1c1917')
                  : isRiverFrozen
                  ? '#cbd5e1'
                  : '#16a34a'
              }
              emissive={tree.onFire ? '#f97316' : '#000000'}
              emissiveIntensity={tree.onFire ? 1.2 : 0}
              roughness={0.65}
            />
          </mesh>
        </>
      ) : isCherry ? (
        <group position={[0, 3.4, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[1.85, 10, 10]} />
            <meshStandardMaterial
              color={
                tree.onFire
                  ? '#ea580c'
                  : tree.burnt
                  ? (regrowing ? '#365314' : '#292524')
                  : isRiverFrozen
                  ? '#fce7f3'
                  : '#f472b6'
              }
              emissive={tree.onFire ? '#ef4444' : '#000000'}
              emissiveIntensity={tree.onFire ? 0.9 : 0}
              roughness={0.6}
            />
          </mesh>
          <mesh position={[0.4, 0.4, 0.3]} castShadow>
            <sphereGeometry args={[1.2, 8, 8]} />
            <meshStandardMaterial color={tree.onFire ? '#ea580c' : tree.burnt ? (regrowing ? '#3f6212' : '#292524') : '#fb7185'} roughness={0.6} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 3.4, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[1.9, 10, 10]} />
            <meshStandardMaterial
              color={
                tree.onFire
                  ? '#ea580c'
                  : tree.burnt
                  ? (regrowing ? '#365314' : '#292524')
                  : isRiverFrozen
                  ? '#f1f5f9'
                  : '#4d7c0f'
              }
              emissive={tree.onFire ? '#ef4444' : '#000000'}
              emissiveIntensity={tree.onFire ? 0.9 : 0}
              roughness={0.65}
            />
          </mesh>
          <mesh position={[-0.4, 0.5, 0.2]} castShadow>
            <sphereGeometry args={[1.3, 8, 8]} />
            <meshStandardMaterial color={tree.onFire ? '#ea580c' : tree.burnt ? (regrowing ? '#3f6212' : '#292524') : '#65a30d'} roughness={0.65} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** One R3F frame subscriber for the entire forest instead of one per tree.
 * Tree meshes and authored materials remain unchanged; the parent owns sway. */
function SwayingForest({trees,isRiverFrozen,quality}:{trees:TreeData[];isRiverFrozen:boolean;quality:VisualTier}) {
  const forest=useRef(new Map<number,{node:THREE.Group;offset:number;burnt:boolean}>());
  const registerSway=useCallback((id:number,offset:number,burnt:boolean,node:THREE.Group|null)=>{
    if(node) forest.current.set(id,{node,offset,burnt});
    else forest.current.delete(id);
  },[]);
  const previousSwayTime=useRef(-1);
  useFrame(({clock})=>{
    // The forest has no gameplay-owned motion; only visual sway is throttled.
    // Reduced-motion trees start upright and need no per-frame writes.
    if (REDUCE_SCENIC_MOTION) return;
    const now=clock.getElapsedTime();
    const interval=quality==='high'?1/30:quality==='medium'?1/20:1/12;
    if (previousSwayTime.current >= 0 && now-previousSwayTime.current < interval) return;
    previousSwayTime.current=now;
    const at=now*2.2;
    for(const item of forest.current.values()) {
      const sway=item.burnt?0:Math.sin(at+item.offset)*0.035;
      item.node.rotation.z=sway;
      item.node.rotation.x=sway*0.5;
    }
  });
  return <group>{trees.map(tree=><RealisticTree key={tree.id} tree={tree}
    isRiverFrozen={isRiverFrozen} registerSway={registerSway}/>)}</group>;
}

function RealisticSanctuary({quality}: {quality: VisualTier}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  useFrame(({clock}) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.6;
      coreRef.current.rotation.y = t * 0.8;
      coreRef.current.position.y = 3.4 + Math.sin(t * 2) * 0.35;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y = -t * 0.45;
      ringRef.current.rotation.z = Math.sin(t * 0.5) * 0.25;
    }
    if (beamRef.current) {
      const pulse = 0.35 + Math.sin(t * 4) * 0.18;
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });

  return (
    <group position={[18, 0, 22]}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const rAngle = (i / 8) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(rAngle) * 6.8, 0, Math.sin(rAngle) * 6.8]} rotation={[0, -rAngle, 0]}>
            <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.25, 5.0, 0.95]} />
              <meshStandardMaterial color="#334155" roughness={0.85} />
            </mesh>
            <mesh position={[0, 2.5, 0.5]}>
              <boxGeometry args={[0.65, 3.4, 0.05]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.75} />
            </mesh>
          </group>
        );
      })}

      <mesh ref={coreRef} position={[0, 3.4, 0]}>
        <octahedronGeometry args={[1.75, 0]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={1.4}
          roughness={0.12}
          metalness={0.94}
        />
      </mesh>

      <group ref={ringRef} position={[0, 3.4, 0]}>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[3.0, 0.08, 12, 36]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
        </mesh>
        <mesh rotation={[-Math.PI / 4, 0, 0]}>
          <torusGeometry args={[3.6, 0.07, 12, 36]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.55} />
        </mesh>
      </group>

      <mesh ref={beamRef} position={[0, 15, 0]}>
        <cylinderGeometry args={[0.45, 0.9, 30, 12, 1, true]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.38} side={THREE.DoubleSide} />
      </mesh>

      {quality !== 'low' && <pointLight position={[0, 3.5, 0]} color="#38bdf8" intensity={12} distance={21} decay={2} />}
    </group>
  );
}

function RealisticLighting({activeDisasters, quality}: {activeDisasters: ActiveDisaster[]; quality: VisualTier}) {
  const sunIntensity = getConfig('sunIntensity');
  const ambientIntensity = getConfig('ambientIntensity');
  const hemiIntensity = getConfig('hemiIntensity');
  const shadowResolution = quality === 'high' ? 2048 : quality === 'medium' ? 1024 : 512;
  const disasterLights = quality === 'low' ? [] : activeDisasters.slice(-disasterLightLimit(quality));

  const hasStorm = getConfig('dynamicWeatherLighting') && activeDisasters.some(
    (d) => d.type === 'lightning' || d.type === 'tornado' || d.type === 'wave',
  );
  const hasVolcano = getConfig('dynamicWeatherLighting') && activeDisasters.some(
    (d) => d.type === 'volcano' || d.type === 'meteor' || d.type === 'wildfire',
  );

  return (
    <>
      <ambientLight
        color={hasVolcano ? '#f97316' : hasStorm ? '#334155' : getConfig('ambientColor')}
        intensity={hasStorm ? ambientIntensity * 0.65 : ambientIntensity}
      />
      <directionalLight
        position={[70, 95, 55]}
        intensity={hasStorm ? sunIntensity * 0.35 : sunIntensity}
        color={hasVolcano ? '#fed7aa' : '#fffbeb'}
        castShadow
        shadow-mapSize={[shadowResolution, shadowResolution]}
        shadow-camera-near={0.5}
        shadow-camera-far={240}
        shadow-camera-left={-85}
        shadow-camera-right={85}
        shadow-camera-top={85}
        shadow-camera-bottom={-85}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-42, 38, -38]} intensity={0.85} color={hasStorm ? '#0284c7' : '#93c5fd'} />
      <hemisphereLight
        color={hasStorm ? '#38bdf8' : getConfig('hemiSkyColor')}
        groundColor={getConfig('hemiGroundColor')}
        intensity={hemiIntensity}
      />

      {disasterLights.map((d) => {
        let lightColor = '#ff4500';
        let lightIntensity = 55;
        if (d.type === 'lightning') {
          lightColor = '#fef08a';
          lightIntensity = 200;
        } else if (d.type === 'crystal') {
          lightColor = '#c084fc';
          lightIntensity = 60;
        } else if (d.type === 'restore') {
          lightColor = '#34d399';
          lightIntensity = 95;
        } else if (d.type === 'freeze') {
          lightColor = '#60a5fa';
          lightIntensity = 55;
        } else if (d.type === 'meteor') {
          lightColor = '#ea580c';
          lightIntensity = 140;
        }

        return (
          <pointLight
            key={d.id}
            position={[d.position.x, d.position.y + 4.5, d.position.z]}
            color={lightColor}
            intensity={lightIntensity}
            distance={d.radius * 5.0}
            decay={1.5}
          />
        );
      })}
    </>
  );
}

function Inhabitants({activeDisasters, simSpeed, fieldRef}: {activeDisasters: ActiveDisaster[]; simSpeed: number; fieldRef: React.MutableRefObject<GroundField>}) {
  const villagers = useMemo(
    () => [
      {id: 'v1', startPos: [-20, 0, -6], color: '#3b82f6'},
      {id: 'v2', startPos: [-24, 0, 10], color: '#10b981'},
      {id: 'v3', startPos: [-16, 0, 4], color: '#f59e0b'},
      {id: 'v4', startPos: [-18, 0, -10], color: '#ec4899'},
      {id: 'k1', startPos: [16, 0, -14], color: '#64748b', tool: 'sword'},
      {id: 'k2', startPos: [24, 0, -12], color: '#475569', tool: 'sword'},
      {id: 'k3', startPos: [22, 0, -6], color: '#334155', tool: 'sword'},
    ],
    [],
  );

  return (
    <group>
      {villagers.map((v) => (
        <AnimatedVillager
          key={v.id}
          startPos={v.startPos as [number, number, number]}
          clothesColor={v.color}
          tool={v.tool as any}
          activeDisasters={activeDisasters}
          simSpeed={simSpeed}
          fieldRef={fieldRef}
        />
      ))}
      <AnimatedHorse startPos={[-14, 0, -16]} activeDisasters={activeDisasters} simSpeed={simSpeed} fieldRef={fieldRef} />
      <AnimatedHorse startPos={[-28, 0, -22]} activeDisasters={activeDisasters} simSpeed={simSpeed} fieldRef={fieldRef} />
      <AnimatedChicken startPos={[-19, 0, 8]} activeDisasters={activeDisasters} simSpeed={simSpeed} fieldRef={fieldRef} />
    </group>
  );
}

function AnimatedVillager({
  startPos,
  clothesColor,
  tool,
  activeDisasters,
  simSpeed,
  fieldRef,
}: {
  startPos: [number, number, number];
  clothesColor: string;
  tool?: 'sword' | 'none';
  activeDisasters: ActiveDisaster[];
  simSpeed: number;
  fieldRef: React.MutableRefObject<GroundField>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(...startPos));
  const headingRef = useRef(0);
  const hazardCheckRef = useRef(0);
  const escapeRef = useRef<EscapeDirection | null>(null);

  useFrame((_, rawDt) => {
    if (!groupRef.current) return;
    const dt = Math.min(rawDt, 0.075) * simSpeed;
    const p = posRef.current;

    let isFleeing = false;
    activeDisasters.forEach((d) => {
      const dist = p.distanceTo(d.position);
      if (dist < d.radius + 12) {
        isFleeing = true;
        const awayX = p.x - d.position.x;
        const awayZ = p.z - d.position.z;
        const fleeAngle = Math.atan2(awayX, awayZ);
        headingRef.current = fleeAngle;
        p.x += Math.sin(fleeAngle) * 9.5 * dt;
        p.z += Math.cos(fleeAngle) * 9.5 * dt;
      }
    });

    if (!isFleeing && dt > 0) {
      hazardCheckRef.current += dt;
      if (hazardCheckRef.current >= 0.25) {
        hazardCheckRef.current = 0;
        escapeRef.current = escapeFromHazard(fieldRef.current, p.x, p.z);
      }
      if (escapeRef.current) {
        isFleeing = true;
        const toward = escapeRef.current;
        headingRef.current = Math.atan2(toward.x, toward.z);
        p.x += toward.x * 7.5 * dt;
        p.z += toward.z * 7.5 * dt;
      }
    }
    if (!isFleeing) {
      headingRef.current += Math.sin(Date.now() * 0.001) * 0.45 * dt;
      p.x += Math.sin(headingRef.current) * 1.8 * dt;
      p.z += Math.cos(headingRef.current) * 1.8 * dt;
    }

    p.x = THREE.MathUtils.clamp(p.x, -45, 45);
    p.z = THREE.MathUtils.clamp(p.z, -45, 45);

    groupRef.current.position.copy(p);
    // Smooth only the visible facing direction, never the actual escape vector.
    const turn = THREE.MathUtils.euclideanModulo(headingRef.current - groupRef.current.rotation.y + Math.PI,
      Math.PI * 2) - Math.PI;
    groupRef.current.rotation.y += turn * (1 - Math.exp(-10 * Math.min(rawDt, 0.08)));
  });

  return (
    <group ref={groupRef} position={startPos}>
      <HumanoidCharacter clothesColor={clothesColor} toolType={tool || 'none'} state={simSpeed <= 0 ? 'idle' : 'walk'} />
    </group>
  );
}

function AnimatedHorse({startPos, activeDisasters, simSpeed, fieldRef}: {
  startPos: [number, number, number]; activeDisasters: ActiveDisaster[]; simSpeed: number;
  fieldRef: React.MutableRefObject<GroundField>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(...startPos));
  const hazardCheckRef = useRef(0);
  const escapeRef = useRef<EscapeDirection | null>(null);
  useFrame((_, rawDt) => {
    if (!groupRef.current) return;
    const dt = Math.min(rawDt, 0.075) * simSpeed;
    const p = posRef.current;
    let targetFacing = groupRef.current.rotation.y;
    const danger = activeDisasters.find(d => p.distanceTo(d.position) < d.radius + 10);
    if (danger) {
      const away = Math.atan2(p.x - danger.position.x, p.z - danger.position.z);
      p.x += Math.sin(away) * dt * 13;
      p.z += Math.cos(away) * dt * 13;
      targetFacing = away;
    } else {
      hazardCheckRef.current += dt;
      if (hazardCheckRef.current >= 0.3) {
        hazardCheckRef.current = 0;
        escapeRef.current = escapeFromHazard(fieldRef.current, p.x, p.z);
      }
      if (escapeRef.current) {
        p.x += escapeRef.current.x * dt * 11;
        p.z += escapeRef.current.z * dt * 11;
        targetFacing = Math.atan2(escapeRef.current.x, escapeRef.current.z);
      } else p.x += Math.sin(Date.now() * 0.002) * 1.7 * dt;
    }
    p.x = THREE.MathUtils.clamp(p.x, -45, 45);
    p.z = THREE.MathUtils.clamp(p.z, -45, 45);
    groupRef.current.position.copy(p);
    const angle = THREE.MathUtils.euclideanModulo(targetFacing - groupRef.current.rotation.y + Math.PI,
      Math.PI * 2) - Math.PI;
    groupRef.current.rotation.y += angle * (1 - Math.exp(-10 * Math.min(rawDt, 0.08)));
  });
  return <group ref={groupRef} position={startPos}>
    <AnimalCharacter type="horse" color="#78350f" size={0.88} state={simSpeed <= 0 ? 'idle' : 'walk'} />
  </group>;
}

function AnimatedChicken({startPos, activeDisasters, simSpeed, fieldRef}: {
  startPos: [number, number, number]; activeDisasters: ActiveDisaster[]; simSpeed: number;
  fieldRef: React.MutableRefObject<GroundField>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(...startPos));
  const hazardCheckRef = useRef(0);
  const escapeRef = useRef<EscapeDirection | null>(null);
  useFrame((_, rawDt) => {
    if (!groupRef.current) return;
    const dt = Math.min(rawDt, 0.075) * simSpeed;
    const p = posRef.current;
    let targetFacing = groupRef.current.rotation.y;
    const danger = activeDisasters.find(d => p.distanceTo(d.position) < d.radius + 8);
    if (danger) {
      const away = Math.atan2(p.x - danger.position.x, p.z - danger.position.z);
      p.x += Math.sin(away) * dt * 8;
      p.z += Math.cos(away) * dt * 8;
      targetFacing = away;
    } else {
      hazardCheckRef.current += dt;
      if (hazardCheckRef.current >= 0.3) {
        hazardCheckRef.current = 0;
        escapeRef.current = escapeFromHazard(fieldRef.current, p.x, p.z);
      }
      if (escapeRef.current) {
        p.x += escapeRef.current.x * dt * 8;
        p.z += escapeRef.current.z * dt * 8;
        targetFacing = Math.atan2(escapeRef.current.x, escapeRef.current.z);
      } else p.z += Math.sin(Date.now() * 0.003) * 1.2 * dt;
    }
    p.x = THREE.MathUtils.clamp(p.x, -45, 45);
    p.z = THREE.MathUtils.clamp(p.z, -45, 45);
    groupRef.current.position.copy(p);
    const angle = THREE.MathUtils.euclideanModulo(targetFacing - groupRef.current.rotation.y + Math.PI,
      Math.PI * 2) - Math.PI;
    groupRef.current.rotation.y += angle * (1 - Math.exp(-10 * Math.min(rawDt, 0.08)));
  });
  return <group ref={groupRef} position={startPos}>
    <AnimalCharacter type="chicken" color="#ffffff" size={0.45} state={simSpeed <= 0 ? 'idle' : 'walk'} />
  </group>;
}

function DisasterVisualEffect({disaster, simSpeed}: {disaster: ActiveDisaster; simSpeed: number}) {
  const groupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(Math.max(0, disaster.maxDuration - disaster.duration));
  const lightningPath = useMemo(() => new THREE.CatmullRomCurve3(
    Array.from({length: 13}, (_, i) => {
      const y = 36 - i * 3;
      const drift = i === 0 || i === 12 ? 0 : Math.sin(i * 3.2 + disaster.position.x * 0.17) * (0.7 + i * 0.08);
      return new THREE.Vector3(drift, y, Math.cos(i * 2.55 + disaster.position.z) * 0.7);
    }), false, 'centripetal'), [disaster.position.x, disaster.position.z]);
  const tornadoPath = useMemo(() => new THREE.CatmullRomCurve3(
    Array.from({length: 57}, (_, i) => {
      const h = i / 56 * 20;
      const a = i / 56 * Math.PI * 9;
      const r = 0.7 + h * 0.40;
      return new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r);
    }), false, 'centripetal'), []);
  useFrame((_, rawDt) => {
    elapsedRef.current = Math.min(disaster.maxDuration, elapsedRef.current + Math.min(rawDt, 0.075) * simSpeed);
    if (!groupRef.current) return;
    if (disaster.type === 'tornado') groupRef.current.rotation.y += 2.7 * rawDt * simSpeed;
    if (disaster.type === 'wildfire') {
      groupRef.current.children.forEach((flame, index) => {
        flame.position.y = 1.8 + Math.sin(elapsedRef.current * 7 + index * 1.9) * 0.28;
        flame.scale.y = 0.88 + Math.sin(elapsedRef.current * 8 + index) * 0.12;
      });
    }
    if (disaster.type === 'meteor') {
      const progress = elapsedRef.current / disaster.maxDuration;
      groupRef.current.position.y = Math.max(0, (1 - progress * 1.5) * 42);
    }
  });

  const p = disaster.position;

  if (disaster.type === 'volcano') {
    return (
      <group position={[p.x, 0, p.z]}>
        <mesh position={[0, 3.2, 0]}>
          <coneGeometry args={[disaster.radius * 0.85, 6.4, 16, 1, true]} />
          <meshStandardMaterial color="#1c1917" roughness={0.95} />
        </mesh>
        <mesh position={[0, 5.2, 0]}>
          <cylinderGeometry args={[3.2, 3.2, 1.2, 16]} />
          <meshStandardMaterial color="#ff4500" emissive="#ea580c" emissiveIntensity={2.6} />
        </mesh>
        <mesh position={[Math.sin(disaster.phase) * 3.6, 6.8 + Math.abs(Math.sin(disaster.phase * 2)) * 4.8, Math.cos(disaster.phase) * 3.6]}>
          <sphereGeometry args={[0.7, 8, 8]} />
          <meshStandardMaterial color="#f97316" emissive="#ef4444" emissiveIntensity={3.2} />
        </mesh>
      </group>
    );
  }

  if (disaster.type === 'tornado') {
    return <group ref={groupRef} position={[p.x, 0, p.z]}>
      {/* Wind-carried earth, not an implausible electric wireframe cone. */}
      {[0, 1, 2, 3, 4].map(tier =>
        <mesh key={tier} position={[0, tier * 3.8 + 2.1, 0]}>
          <cylinderGeometry args={[tier * 1.18 + 1.5, tier * 0.82 + 0.52, 4.0, 12, 1, true]} />
          <meshLambertMaterial color={tier % 2 ? '#68716b' : '#a3a39a'} transparent
            opacity={0.18 + tier * 0.025} depthWrite={false} side={THREE.DoubleSide}/>
        </mesh>)}
      <mesh>
        <tubeGeometry args={[tornadoPath, 72, 0.19, 5, false]}/>
        <meshBasicMaterial color="#d4ceba" transparent opacity={0.46} depthWrite={false}/>
      </mesh>
    </group>;
  }

  if (disaster.type === 'meteor') {
    return (
      <group ref={groupRef} position={[p.x, 42, p.z]}>
        <mesh castShadow>
          <dodecahedronGeometry args={[3.0, 0]} />
          <meshStandardMaterial color="#594039" roughness={0.72} metalness={0.12}
            emissive="#dd531f" emissiveIntensity={1.8}/>
        </mesh>
        <mesh>
          <sphereGeometry args={[3.9, 12, 10]} />
          <meshBasicMaterial color="#f8ae69" transparent opacity={0.16} depthWrite={false}/>
        </mesh>
        <mesh position={[0, 4.0, 0]}>
          <coneGeometry args={[2.3, 9.8, 9]} />
          <meshBasicMaterial color="#ef9a58" transparent opacity={0.28} depthWrite={false}/>
        </mesh>
      </group>
    );
  }

  if (disaster.type === 'lightning') {
    return (
      <group position={[p.x, 0, p.z]}>
        <mesh>
          <tubeGeometry args={[lightningPath, 24, 0.35, 5, false]} />
          <meshBasicMaterial color="#97c9d7" transparent opacity={0.42} depthWrite={false}/>
        </mesh>
        <mesh>
          <tubeGeometry args={[lightningPath, 24, 0.13, 5, false]} />
          <meshBasicMaterial color="#f7f4db" transparent opacity={0.95} depthWrite={false}/>
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[disaster.radius * 0.75, 16]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.45} />
        </mesh>
      </group>
    );
  }

  if (disaster.type === 'wave') {
    const surgeRadius = (1 - disaster.duration / disaster.maxDuration) * disaster.radius * 1.45;
    return (
      <group position={[p.x, 1, p.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.1, surgeRadius - 2.4), surgeRadius, 32]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.78} roughness={0.08} />
        </mesh>
      </group>
    );
  }

  if (disaster.type === 'earthquake') {
    return (
      <group position={[p.x, 0.14, p.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[disaster.radius * 0.75, disaster.radius * 0.79, 42]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.82} depthWrite={false} />
        </mesh>
        {Array.from({length: 9}, (_, i) => {
          const angle = i * Math.PI * 2 / 9;
          const dist = disaster.radius * (0.48 + (i % 3) * 0.13);
          return <mesh key={i} position={[Math.cos(angle) * dist * 0.5, 0.02, Math.sin(angle) * dist * 0.5]}
            rotation={[-Math.PI / 2, 0, angle + 0.15]}>
            <planeGeometry args={[0.15 + (i % 3) * 0.09, dist]} />
            <meshBasicMaterial color="#160d08" side={THREE.DoubleSide} depthWrite={false} />
          </mesh>;
        })}
      </group>
    );
  }

  if (disaster.type === 'wildfire') {
    return <group ref={groupRef} position={[p.x, 0.5, p.z]}>
      {Array.from({length: 10}, (_, i) => {
        const angle = i * Math.PI * 2 / 10;
        const distance = 1.8 + (i % 3) * (disaster.radius / 4);
        return <mesh key={i} position={[Math.cos(angle) * distance, 1.8, Math.sin(angle) * distance]}>
          <coneGeometry args={[0.7 + (i % 3) * 0.3, 3.8 + (i % 3), 7]} />
          <meshStandardMaterial color="#fb923c" emissive="#ef4444" emissiveIntensity={1.8}
            transparent opacity={0.66} depthWrite={false} />
        </mesh>;
      })}
    </group>;
  }

  if (disaster.type === 'freeze' || disaster.type === 'crystal') {
    return <group position={[p.x, 0.12, p.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[disaster.radius * 0.85, disaster.radius * 0.91, 48]} />
        <meshBasicMaterial color={disaster.type === 'freeze' ? '#bfdbfe' : '#d8b4fe'}
          transparent opacity={0.88} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <octahedronGeometry args={[1.8, 0]} />
        <meshStandardMaterial color={disaster.type === 'freeze' ? '#bae6fd' : '#a78bfa'}
          emissive={disaster.type === 'freeze' ? '#38bdf8' : '#c084fc'}
          emissiveIntensity={1.3} transparent opacity={0.55} />
      </mesh>
    </group>;
  }

  if (disaster.type === 'restore') {
    const expandRadius = (1 - disaster.duration / disaster.maxDuration) * disaster.radius * 1.35;
    return (
      <group position={[p.x, 0.5, p.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.1, expandRadius - 2.2), expandRadius, 40]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.8} />
        </mesh>
      </group>
    );
  }

  return null;
}

/** Tornado and flood fields apply actual impulses to existing rigid-body rubble. */
function PhysicsRubble({item, impulseDisasters, stonePBR, simSpeed}: {
  item: DebrisItem;
  impulseDisasters: ActiveDisaster[];
  stonePBR: {diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture};
  simSpeed: number;
}) {
  const body = useRef<RapierRigidBody>(null);
  // Rapier does not accept a linvel JSX prop. Apply initial velocity once the
  // rigid body actually exists, without losing the impulse on first mount.
  const bindBody = useCallback((instance: RapierRigidBody | null) => {
    body.current = instance;
    if (instance && item.velocity) {
      instance.setLinvel({x: item.velocity[0], y: item.velocity[1], z: item.velocity[2]}, true);
    }
  }, [item.velocity]);
  useFrame((_, rawDt) => {
    // Avoid the Rapier/WASM translation call for every sleeping fragment when
    // there is no physically effective wave or tornado in the world.
    if (!body.current || simSpeed <= 0 || impulseDisasters.length === 0) return;
    const dt = Math.min(rawDt, 0.075) * simSpeed;
    const position = body.current.translation();
    for (const d of impulseDisasters) {
      const dx = position.x - d.position.x;
      const dz = position.z - d.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= d.radius || distance < 0.01) continue;
      const falloff = 1 - distance / d.radius;
      if (d.type === 'tornado') {
        // Tangential lift draws debris around the vortex instead of merely spawning it high.
        body.current.applyImpulse({x: (-dz / distance - dx / distance * 0.5) * falloff * dt * 30,
          y: falloff * dt * 65,
          z: (dx / distance - dz / distance * 0.5) * falloff * dt * 30}, true);
      } else {
        body.current.applyImpulse({x: (dx / distance) * falloff * dt * 36,
          y: falloff * dt * 7,
          z: (dz / distance) * falloff * dt * 36}, true);
      }
    }
  });
  return <RigidBody ref={bindBody} position={item.position} rotation={item.rotation}
    colliders="cuboid" restitution={0.35} friction={0.8}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={item.size} />
      <meshStandardMaterial map={stonePBR.diffuse} normalMap={stonePBR.normal}
        color={item.color} roughness={item.roughness ?? 0.8} metalness={item.metalness ?? 0.1} />
    </mesh>
  </RigidBody>;
}

/** Render a bounded particle pool in one draw call without React reconciliation. */
function InstancedParticleField({particles, simSpeed}: {
  particles: React.MutableRefObject<ParticleFX[]>;
  simSpeed: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const object = useMemo(() => new THREE.Object3D(), []);
  const colorCache = useMemo(() => new Map<string,THREE.Color>(), []);
  const lastDrawnPool = useRef<ParticleFX[] | null>(null);
  const lastDrawnCount = useRef(0);
  useFrame((_, rawDt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(rawDt, 0.08) * Math.max(0, simSpeed);
    const pool = particles.current;
    if (dt > 0 && pool.length) advanceParticlesInPlace(pool, dt);
    // As before, the most recently emitted 240 particles remain visible.
    const start = Math.max(0, pool.length - 240);
    const visibleCount = pool.length - start;
    if (visibleCount === 0) {
      mesh.count = 0;
      lastDrawnPool.current = pool;
      lastDrawnCount.current = 0;
      return;
    }
    // A paused, unchanged pool needs no repeat GPU matrix/color uploads.
    // A new cast replaces the pool reference, so even paused snapshots repaint.
    if (dt === 0 && pool === lastDrawnPool.current && visibleCount === lastDrawnCount.current) return;
    mesh.count = visibleCount;
    for (let i = 0; i < visibleCount; i++) {
      const p = pool[start + i];
      object.position.copy(p.pos);
      object.scale.setScalar(Math.max(0.001, p.size * p.opacity));
      object.rotation.set(0, 0, 0);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
      let tint = colorCache.get(p.color);
      if (!tint) { tint = new THREE.Color(p.color); colorCache.set(p.color, tint); }
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    lastDrawnPool.current = pool;
    lastDrawnCount.current = visibleCount;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 240]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false}
        blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

/** Visible tactical objective: a grounded marker, not an unrelated particle effect. */
function TrialBeacon({target, stage}: {target: TrialTarget; stage: number}) {
  const lightRef = useRef<THREE.Group>(null);
  useFrame(({clock}) => {
    if (lightRef.current) lightRef.current.position.y = 0.18 + Math.sin(clock.elapsedTime * 2.8) * 0.12;
  });
  const color = stage === 0 ? '#ff7849' : stage === 1 ? '#6de6fc' : '#fbce79';
  return <group position={[target.x, 0.13, target.z]}>
    <group ref={lightRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[7.5, 0.13, 8, 56]}/>
        <meshBasicMaterial color={color} transparent opacity={0.92} depthWrite={false}/>
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.18, 0.65, 6.4, 9, 1, true]}/>
        <meshBasicMaterial color={color} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide}/>
      </mesh>
    </group>
  </group>;
}

// ====================================================
// MAIN 3D SCENE & ENGINE
// ====================================================
function Scene({
  gameState,
  setGameState,
  inputRef,
  activePower,
  isMiraclePrimed,
  onGestureSuccess,
  onGestureFail,
  resetSignal,
  worldSeed,
  restoredKingdom,
  checkpointRequest,
  onCheckpoint,
  onSaveRejected,
  onBaseline,
  simSpeed,
  powerForce,
  cameraPreset,
  onPresetApplied,
  onMessage,
  onTelemetry,
  onWorldEvent,
  onGroundStats,
  onInspect,
  onWind,
  trialEnabled,
  trialGeneration,
  onTrialView,
  memoryLayer = 'all',
  interactionMode,
  quality,
}: SceneProps) {
  const {camera, gl} = useThree();

  const grassPBR = useMemo(() => createGrassPBR(), []);
  const stonePBR = useMemo(() => createStoneAshlarPBR(), []);
  const cobblestonePBR = useMemo(() => createCobblestonePBR(), []);
  const roofTilePBR = useMemo(() => createRoofTilePBR('#bcb3a4'), []);
  const waterNormalMap = useMemo(() => createWaterWaveNormalMap(), []);
  // CanvasTexture objects are generated imperatively, so R3F cannot own them.
  // Explicitly release all nine GPU textures when this scene is disposed.
  useEffect(() => () => {
    for (const material of [grassPBR, stonePBR, cobblestonePBR, roofTilePBR]) {
      material.diffuse.dispose();
      material.normal.dispose();
    }
    waterNormalMap.dispose();
  }, [grassPBR, stonePBR, cobblestonePBR, roofTilePBR, waterNormalMap]);

  const camState = useRef({
    target: new THREE.Vector3(0, 0, 0),
    smoothedTarget: new THREE.Vector3(0, 0, 0),
    orbitAngle: 0.35,
    smoothedOrbit: 0.35,
    distance: 42,
    smoothedDistance: 42,
    pitch: 0.8,
    velocity: new THREE.Vector3(0, 0, 0),
    isDraggingGround: false,
    dragStartGroundPos: new THREE.Vector3(),
    dragStartTarget: new THREE.Vector3(),
    pitchOffset: 0,
  });

  // High-frequency cursor motion stays in the Three render loop, not React state.
  const hoverGroundRef = useRef<THREE.Vector3 | null>(null);
  const [debris, setDebris] = useState<DebrisItem[]>([]);
  const [activeDisasters, setActiveDisasters] = useState<ActiveDisaster[]>([]);
  const [crystals, setCrystals] = useState<CrystalCluster[]>([]);
  const [icePatches, setIcePatches] = useState<IcePatch[]>([]);
  const [handState, setHandState] = useState<HandState>('idle');

  // Gesture Stroke State directly on 3D terrain
  const [gesture3DPoints, setGesture3DPoints] = useState<THREE.Vector3[]>([]);
  const gestureScreenPointsRef = useRef<GesturePoint[]>([]);
  const isDrawingGestureRef = useRef(false);
  const pointerDownPosRef = useRef<{x: number; y: number; t: number} | null>(null);

  const particlesRef = useRef<ParticleFX[]>([]);

  useEffect(() => {
    if (!cameraPreset) return;
    const cam = camState.current;
    if (cameraPreset === 'castle') {
      cam.target.set(22, 2, -18);
      cam.distance = 22;
      cam.orbitAngle = 0.45;
    } else if (cameraPreset === 'village') {
      cam.target.set(-20, 1, 2);
      cam.distance = 24;
      cam.orbitAngle = -0.35;
    } else if (cameraPreset === 'sanctuary') {
      cam.target.set(18, 1, 22);
      cam.distance = 20;
      cam.orbitAngle = 1.25;
    } else if (cameraPreset === 'god') {
      cam.target.set(0, 0, 0);
      cam.distance = 54;
      cam.orbitAngle = 0.25;
    } else if (cameraPreset.startsWith('trial:')) {
      const [,x,z] = cameraPreset.split(':');
      const px=Number(x),pz=Number(z);
      if (Number.isFinite(px) && Number.isFinite(pz) && insideKingdom(px,pz)) {
        cam.target.set(px,0,pz);
        cam.distance=25;
        cam.orbitAngle=0.5;
      }
    }
    onPresetApplied?.();
  }, [cameraPreset, onPresetApplied]);

  // The same 32-bit seed reconstructs the initial habitat on every reload.
  const initialTrees = useMemo<TreeData[]>(() => generateSeededTrees(worldSeed), [worldSeed]);

  const [trees, setTrees] = useState<TreeData[]>(initialTrees);


  const initialBlocks = useMemo<StructureBlock[]>(() => {
    const blocks: StructureBlock[] = [];
    let bId = 1;
    const cx = 22;
    const cz = -18;

    blocks.push({
      id: `c_base_${bId++}`,
      originalPos: [cx, 0.4, cz],
      size: [20, 0.8, 20],
      color: '#334155',
      destroyed: false,
      type: 'castle',
      roughness: 0.9,
    });

    blocks.push({
      id: `c_w_n_${bId++}`,
      originalPos: [cx, 2.6, cz - 8],
      size: [16, 4.4, 1.8],
      color: '#475569',
      destroyed: false,
      type: 'castle',
    });
    blocks.push({
      id: `c_w_s_${bId++}`,
      originalPos: [cx, 2.6, cz + 8],
      size: [16, 4.4, 1.8],
      color: '#475569',
      destroyed: false,
      type: 'castle',
    });
    blocks.push({
      id: `c_w_w_${bId++}`,
      originalPos: [cx - 8, 2.6, cz],
      size: [1.8, 4.4, 16],
      color: '#475569',
      destroyed: false,
      type: 'castle',
    });
    blocks.push({
      id: `c_w_e_${bId++}`,
      originalPos: [cx + 8, 2.6, cz],
      size: [1.8, 4.4, 16],
      color: '#475569',
      destroyed: false,
      type: 'castle',
    });

    const bastionOffsets = [
      [-8, -8],
      [8, -8],
      [-8, 8],
      [8, 8],
    ];
    bastionOffsets.forEach(([ox, oz], idx) => {
      blocks.push({
        id: `c_bastion_${idx}`,
        originalPos: [cx + ox, 4.2, cz + oz],
        size: [3.8, 8.4, 3.8],
        color: '#1e293b',
        destroyed: false,
        type: 'tower',
      });
      blocks.push({
        id: `c_bastion_top_${idx}`,
        originalPos: [cx + ox, 8.8, cz + oz],
        size: [4.4, 1.6, 4.4],
        color: '#0f172a',
        destroyed: false,
        type: 'tower',
      });
      blocks.push({
        id: `c_bastion_spire_${idx}`,
        originalPos: [cx + ox, 10.6, cz + oz],
        size: [2.6, 2.2, 2.6],
        color: '#991b1b',
        destroyed: false,
        type: 'tower',
      });
    });

    blocks.push({
      id: `c_keep_main`,
      originalPos: [cx, 6.0, cz],
      size: [8.5, 12, 8.5],
      color: '#64748b',
      destroyed: false,
      type: 'castle',
    });
    blocks.push({
      id: `c_keep_battlement`,
      originalPos: [cx, 12.4, cz],
      size: [9.5, 1.8, 9.5],
      color: '#334155',
      destroyed: false,
      type: 'castle',
    });
    blocks.push({
      id: `c_keep_roof`,
      originalPos: [cx, 14.2, cz],
      size: [7.5, 2.4, 7.5],
      color: '#b91c1c',
      destroyed: false,
      type: 'castle',
    });

    const villagePositions = [
      [-24, -14, '#991b1b', 5.0],
      [-18, -5, '#b45309', 4.6],
      [-26, 4, '#1e3a8a', 5.2],
      [-17, 14, '#991b1b', 4.8],
      [-25, 22, '#4d7c0f', 5.0],
    ];

    villagePositions.forEach(([vx, vz, roofColor, size], idx) => {
      const s = size as number;
      blocks.push({
        id: `v_house_w_${idx}`,
        originalPos: [vx as number, 1.8, vz as number],
        size: [s, 3.6, s * 0.8],
        color: '#e2e8f0',
        destroyed: false,
        type: 'village',
      });
      blocks.push({
        id: `v_house_r_${idx}`,
        originalPos: [vx as number, 4.2, vz as number],
        size: [s + 0.6, 1.8, s * 0.8 + 0.6],
        color: roofColor as string,
        destroyed: false,
        type: 'village',
      });
      blocks.push({
        id: `v_house_c_${idx}`,
        originalPos: [(vx as number) + s * 0.3, 5.0, vz as number],
        size: [0.9, 2.4, 0.9],
        color: '#78350f',
        destroyed: false,
        type: 'village',
      });
    });

    for (let f = 0; f < 5; f++) {
      blocks.push({
        id: `fence_${f}`,
        originalPos: [-12, 0.5, -12 + f * 4],
        size: [0.4, 1.0, 3.6],
        color: '#78350f',
        destroyed: false,
        type: 'fence',
      });
    }

    blocks.push({
      id: 'riverside_watermill', originalPos: [-9.6, 1.2, 10],
      size: [4.6, 4.6, 2.0], color: '#78350f', destroyed: false, type: 'mill',
    });

    blocks.push({
      id: `bridge_deck`,
      originalPos: [0, 1.4, 0],
      size: [18, 0.8, 5.2],
      color: '#94a3b8',
      destroyed: false,
      type: 'bridge',
    });
    blocks.push({
      id: `bridge_parapet_n`,
      originalPos: [0, 2.2, -2.5],
      size: [18, 1.0, 0.4],
      color: '#64748b',
      destroyed: false,
      type: 'bridge',
    });
    blocks.push({
      id: `bridge_parapet_s`,
      originalPos: [0, 2.2, 2.5],
      size: [18, 1.0, 0.4],
      color: '#64748b',
      destroyed: false,
      type: 'bridge',
    });

    return blocks;
  }, [resetSignal]);

  const [blocks, setBlocks] = useState<StructureBlock[]>(initialBlocks);
  useEffect(() => {onBaseline?.(initialBlocks);}, [initialBlocks, onBaseline]);

  // Canonical initial-world objects are never passed to a mutating transition.
  const initialWorld = useMemo<WorldSnapshot<StructureBlock, TreeData>>(
    () => ({blocks: initialBlocks, trees: initialTrees}), [initialBlocks, initialTrees]);
  const worldRef = useRef<WorldSnapshot<StructureBlock, TreeData>>(initialWorld);
  // This ref is the authoritative material field. Rendering observes its revision,
  // never feeds authoritative values back into the simulation.
  const groundRef = useRef<GroundField>(newGroundField());
  const lastMemoryReportRef = useRef(0);
  const lastReactionRecordRef = useRef(-100);
  const simClockRef = useRef(0);
  const fireAccumulatorRef = useRef(0);
  const renderAccumulatorRef = useRef(0);
  const lastCastRef = useRef<Partial<Record<CatastropheType, number>>>({});
  const pendingImpactsRef = useRef<{remaining: number; power: CatastropheType; pos: THREE.Vector3; radius: number; force: number; source?: 'player' | 'world'}[]>([]);
  const telemetryRef = useRef({elapsed: 0, frames: 0});
  const checkpointElapsedRef = useRef(0);

  useEffect(() => {
    // Reject layout mismatches instead of pasting damage onto different geometry.
    const restored = restoredKingdom && matchesBaseline(restoredKingdom, initialBlocks)
      ? restoredKingdom : null;
    if (restoredKingdom && !restored) onSaveRejected?.();
    const fresh: WorldSnapshot<StructureBlock, TreeData> = restored
      ? copyWorld(restored.world as WorldSnapshot<StructureBlock, TreeData>) : copyWorld(initialWorld);
    worldRef.current = fresh;
    groundRef.current = restored ? hydrateGround(restored.ground) : newGroundField();
    onGroundStats?.(groundStats(groundRef.current));
    lastMemoryReportRef.current = 0;
    lastReactionRecordRef.current = -100;
    setBlocks(fresh.blocks);
    setTrees(fresh.trees);
    setDebris([]);
    // An in-flight meteor remains visible, then impacts on its saved timer.
    setActiveDisasters(restored ? restored.pendingImpacts.map((impact, index) => {
      const maxDuration = CATASTROPHES[impact.power].cooldown * 3;
      return {id: `resumed_meteor_${index}`, type: impact.power,
        position: new THREE.Vector3(impact.x, 0, impact.z),
        duration: maxDuration / 3 + impact.remaining, maxDuration,
        radius: impact.radius, phase: 0};
    }) : []);
    setCrystals(restored?.crystals ?? []);
    setIcePatches(restored?.icePatches ?? []);
    setHandState('idle');
    simClockRef.current = restored?.simTime ?? 0;
    fireAccumulatorRef.current = 0;
    renderAccumulatorRef.current = 0;
    checkpointElapsedRef.current = 0;
    lastCastRef.current = restored ? {...restored.cooldowns} : {};
    pendingImpactsRef.current = restored ? restored.pendingImpacts.map(impact => ({
      remaining: impact.remaining, power: impact.power,
      pos: new THREE.Vector3(impact.x, 0, impact.z), radius: impact.radius, force: impact.force,
    })) : [];
    particlesRef.current = [];
  }, [initialWorld, initialBlocks, restoredKingdom, onGroundStats, onSaveRejected]);

  const emitCheckpoint = useCallback(() => {
    onCheckpoint?.({
      seed: worldSeed, simTime: simClockRef.current,
      world: worldRef.current, ground: groundRef.current,
      cooldowns: {...lastCastRef.current},
      pendingImpacts: pendingImpactsRef.current.map(impact => ({power: impact.power,
        x: impact.pos.x, z: impact.pos.z, radius: impact.radius,
        force: impact.force, remaining: impact.remaining})),
      crystals, icePatches,
    }, resetSignal);
  }, [onCheckpoint, worldSeed, resetSignal, crystals, icePatches]);
  // Browser teardown: synchronous local checkpoint, not a network request.
  useEffect(() => {
    window.addEventListener('pagehide', emitCheckpoint);
    return () => window.removeEventListener('pagehide', emitCheckpoint);
  }, [emitCheckpoint]);
  // One trial controller, co-located with the authoritative world and fixed clock.
  // The App receives a display snapshot only, never controls a frame-by-frame simulation.
  const trialRef = useRef<TrialRun | null>(null);
  // One immutable starting position for all retries of the same Covenant session.
  // Ending the trial keeps the actual world; only Retry restores this checkpoint.
  const trialOriginRef = useRef<{
    generation: number;
    world: WorldSnapshot<StructureBlock, TreeData>;
    ground: GroundField;
    time: number;
    score: number;
    chaosScore: number;
    cooldowns: Partial<Record<CatastropheType,number>>;
    pending: typeof pendingImpactsRef.current;
    crystals: CrystalCluster[];
    ice: IcePatch[];
  } | null>(null);
  const [trialMarker, setTrialMarker] = useState<{target: TrialTarget; stage: number} | null>(null);
  useEffect(() => {
    if (!trialEnabled) {
      trialRef.current = null;
      trialOriginRef.current = null;
      setTrialMarker(null);
      onTrialView?.(null);
      return;
    }
    if (!trialOriginRef.current) {
      trialOriginRef.current = {
        generation:trialGeneration,world:copyWorld(worldRef.current),ground:groundRef.current,
        time:simClockRef.current,score:gameState.score,chaosScore:gameState.chaosScore??0,
        cooldowns:{...lastCastRef.current},pending:pendingImpactsRef.current.map(i=>({...i,pos:i.pos.clone()})),
        crystals:crystals.map(c=>({...c,position:[...c.position] as [number,number,number]})),
        ice:icePatches.map(p=>({...p})),
      };
    } else if (trialOriginRef.current.generation !== trialGeneration) {
      const origin=trialOriginRef.current;
      origin.generation=trialGeneration;
      worldRef.current=copyWorld(origin.world);
      groundRef.current=origin.ground;
      simClockRef.current=origin.time;
      fireAccumulatorRef.current=0;
      renderAccumulatorRef.current=0;
      checkpointElapsedRef.current=0;
      lastReactionRecordRef.current=-100;
      lastMemoryReportRef.current=0;
      lastCastRef.current={...origin.cooldowns};
      pendingImpactsRef.current=origin.pending.map(i=>({...i,pos:i.pos.clone()}));
      particlesRef.current=[];
      setTrees(worldRef.current.trees);
      setBlocks(worldRef.current.blocks);
      setDebris([]);setActiveDisasters([]);
      setCrystals(origin.crystals.map(c=>({...c,position:[...c.position] as [number,number,number]})));
      setIcePatches(origin.ice.map(p=>({...p})));
      setHandState('idle');setGesture3DPoints([]);
      onGroundStats?.(groundStats(groundRef.current));
      onWind?.(windAt(origin.time,worldSeed));
      setGameState(previous => ({...previous,score:origin.score,chaosScore:origin.chaosScore}));
    }
    const next = startTrial(worldRef.current);
    trialRef.current = next;
    setTrialMarker({target: trialTarget(next), stage: next.stage});
    onTrialView?.(trialView(next, worldRef.current));
  }, [trialEnabled, trialGeneration, onTrialView]);
  const lastCheckpointRequestRef = useRef(0);
  useEffect(() => {
    if (checkpointRequest > lastCheckpointRequestRef.current) {
      lastCheckpointRequestRef.current = checkpointRequest;
      emitCheckpoint();
    }
  }, [checkpointRequest, emitCheckpoint]);

  const wasPointerDownRef = useRef(false);
  const cameraShakeRef = useRef(0);

  const spawnParticles = useCallback(
    (
      center: THREE.Vector3,
      color: string,
      count: number,
      speedMultiplier: number,
      type: 'ember' | 'sparkle' | 'smoke' | 'debris' | 'arcane' | 'water' | 'petal' | 'rain' | 'sun_mote' = 'debris',
    ) => {
      const newParticles: ParticleFX[] = [];
      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: Math.random(),
          pos: center
            .clone()
            .add(new THREE.Vector3(randomRange(-1.2, 1.2), randomRange(0.2, 2.5), randomRange(-1.2, 1.2))),
          vel: new THREE.Vector3(
            randomRange(-1.5, 1.5) * speedMultiplier,
            randomRange(2.5, 8.5) * speedMultiplier,
            randomRange(-1.5, 1.5) * speedMultiplier,
          ),
          color,
          size: type === 'sparkle' ? randomRange(0.15, 0.35) : randomRange(0.25, 0.75),
          life: randomRange(0.8, 2.2),
          maxLife: 2.2,
          opacity: 1.0,
          type,
        });
      }
      particlesRef.current = [...particlesRef.current.slice(-180), ...newParticles];
    },
    [],
  );

  const spawnRubble = useCallback((destroyed: StructureBlock[], type: CatastropheType, origin: THREE.Vector3) => {
    if (!destroyed.length) return;
    const next: DebrisItem[] = [];
    for (const block of destroyed) {
      const count = Math.min(4, Math.max(2, Math.ceil(Math.max(...block.size) / 6)));
      for (let j = 0; j < count; j++) {
        const dx = block.originalPos[0] - origin.x;
        const dz = block.originalPos[2] - origin.z;
        const magnitude = Math.max(1, Math.hypot(dx, dz));
        const launch = type === 'tornado' ? 12 : type === 'wave' ? 7 : 4;
        next.push({
          id: `deb_${Date.now()}_${Math.random()}`,
          position: [block.originalPos[0] + randomRange(-0.4, 0.4), block.originalPos[1] + 0.8,
            block.originalPos[2] + randomRange(-0.4, 0.4)],
          velocity: [(dx / magnitude) * launch + randomRange(-2, 2),
            type === 'tornado' ? randomRange(12, 22) : randomRange(2, 8),
            (dz / magnitude) * launch + randomRange(-2, 2)],
          rotation: [randomRange(0, 6.28), randomRange(0, 6.28), randomRange(0, 6.28)],
          size: [(block.size[0] / count) * 0.85, block.size[1] * 0.45,
            (block.size[2] / count) * 0.85],
          color: block.color,
        });
      }
    }
    setDebris(prev => [...prev, ...next].slice(-Math.max(20, getConfig('debrisCountLimit'))));
  }, []);

  const applyImpact = useCallback((powerType: CatastropheType, pos: THREE.Vector3, radius: number, force: number, source: 'player' | 'world' = 'player') => {
    const beforeImpact = worldRef.current;
    const beforeGround=groundRef.current;
    let witnessDetail: string | null = null;
    const result = applyMiracle(beforeImpact, initialWorld, {
      type: powerType, x: pos.x, z: pos.z, radius, force,
    });
    if (result.changed) {
      worldRef.current = result.world;
      setBlocks(result.world.blocks);
      setTrees(result.world.trees);
    }
    if (result.destroyed.length) spawnRubble(result.destroyed, powerType, pos);
    const memory = impactGround(groundRef.current, {type: powerType, x: pos.x, z: pos.z, radius, force});
    if (memory.changed) groundRef.current = memory.field;
    if (trialRef.current) {
      const previous = trialRef.current;
      if (source === 'player') {
        // The forged stone must actually form at the bridge, not just anywhere
        // in the Wave's potentially huge impact circle.
        const localStone=powerType==='wave'?forgeStoneFormed(beforeGround,groundRef.current):0;
        trialRef.current = trialRecordQuench(trialRef.current, powerType, localStone, {x:pos.x,z:pos.z});
        trialRef.current = trialRecordResponse(trialRef.current, powerType, {x:pos.x,z:pos.z}, beforeImpact,worldRef.current);
        const priorCollateral=trialRef.current.collateral;
        trialRef.current = trialRecordCollateral(trialRef.current,powerType,beforeImpact,worldRef.current);
        const currentCollateral=trialRef.current.collateral;
        const addedStructures=currentCollateral.structures-priorCollateral.structures;
        const addedTrees=currentCollateral.trees-priorCollateral.trees;
        if(addedStructures+addedTrees>0) witnessDetail=
          `your spell harmed ${addedStructures} off-target structures and ${addedTrees} trees (witness account retained)`;
      } else {
        trialRef.current = trialRecordThreat(trialRef.current,powerType);
      }
      trialRef.current=trialObserve(trialRef.current,worldRef.current);
      if (trialRef.current !== previous) onTrialView?.(trialView(trialRef.current, worldRef.current));
    }
    onGroundStats?.(groundStats(groundRef.current));
    if (memory.steam > 0) {
      spawnParticles(pos, '#c6f5ff', Math.min(45, memory.steam * 3), 1.1, 'smoke');
    }
    if (powerType === 'crystal') {
      const newCrystals: CrystalCluster[] = Array.from({length: 8}, (_, i) => {
        const angle = (i / 8) * Math.PI * 2 + randomRange(-0.25, 0.25);
        const distance = randomRange(1.0, radius * 0.9);
        return {id: `crys_${Date.now()}_${i}_${Math.random()}`,
          position: [pos.x + Math.cos(angle) * distance, 0, pos.z + Math.sin(angle) * distance],
          scale: randomRange(1.8, 3.8), color: '#c084fc', rotY: randomRange(0, Math.PI * 2)};
      });
      setCrystals(prev => [...prev, ...newCrystals].slice(-50));
    }
    if (powerType === 'freeze') {
      setIcePatches(prev => [...prev, {id: `ice_${Date.now()}_${Math.random()}`, x: pos.x, z: pos.z, radius}].slice(-12));
    }
    if (powerType === 'restore') {
      setCrystals(prev => prev.filter(c => Math.hypot(c.position[0] - pos.x, c.position[2] - pos.z) >= radius));
      setIcePatches(prev => prev.filter(c => Math.hypot(c.x - pos.x, c.z - pos.z) >= radius));
      setDebris(prev => prev.filter(d => Math.hypot(d.position[0] - pos.x, d.position[2] - pos.z) >= radius));
    }
    // Trial casting has its own causal score and never inflates sandbox records.
    if (result.score > 0 && !trialRef.current) {
      setGameState(prev => ({...prev, score: prev.score + result.score,
        chaosScore: (prev.chaosScore || 0) + (powerType === 'restore' ? 0 : result.score)}));
    }
    if (getConfig('cameraShakeEnabled') && powerType !== 'restore') {
      cameraShakeRef.current = Math.min(2.5, cameraShakeRef.current + force);
    }
    if (powerType === 'meteor' || powerType === 'volcano') gameAudio.playGunshotBlast();
    if (powerType === 'lightning') gameAudio.playArcadeLaser();
    const consequences = [
      `${result.destroyed.length} structures collapsed`,
      `${result.treesIgnited} trees ignited`,
      `${memory.affected} surface cells changed`,
    ];
    if (memory.steam) consequences.push(`${memory.steam} steam reactions`);
    if (memory.formedStone) consequences.push(`${memory.formedStone} new cooled-stone patches`);
    if (witnessDetail) consequences.push(witnessDetail);
    const detail = consequences.join('; ');
    onMessage?.(`${CATASTROPHES[powerType].name}: ${detail}`);
    onWorldEvent?.({id: `event_${Date.now()}_${Math.random()}`, time: simClockRef.current,
      kind: 'miracle', title: CATASTROPHES[powerType].name, detail});
  }, [initialWorld, setGameState, onMessage, onWorldEvent, onGroundStats, onTrialView, spawnRubble, spawnParticles]);

  const executeThreat = useCallback((threat: TrialThreat) => {
    const position = new THREE.Vector3(threat.x, 0, threat.z);
    const maxDuration = CATASTROPHES[threat.type].cooldown * 3;
    setActiveDisasters(prev => [...prev.slice(-7), {id:`ordeal_${Date.now()}_${Math.random()}`,
      type:threat.type, position, duration:maxDuration, maxDuration, radius:threat.radius, phase:0}]);
    spawnParticles(position,CATASTROPHES[threat.type].color,30,2,'debris');
    if(threat.type === 'meteor') {
      pendingImpactsRef.current.push({power:threat.type,pos:position,radius:threat.radius,
        force:threat.force,remaining:maxDuration * (2 / 3),source:'world'});
    } else {
      applyImpact(threat.type,position,threat.radius,threat.force,'world');
    }
  },[applyImpact,spawnParticles]);

  const executeCatastropheAt = useCallback((powerType: CatastropheType, pos: THREE.Vector3) => {
    if (!isMiraclePrimed || simSpeed <= 0) return;
    // A concluded Covenant is a frozen result, not a free-casting loophole.
    // Return to sandbox (or retry) before changing the kingdom again.
    if (trialRef.current && trialRef.current.result !== 'running') {
      onMessage?.('The Covenant has concluded. Return to sandbox or retry before casting.');
      return;
    }
    if (!insideKingdom(pos.x, pos.z)) {
      onMessage?.('The hand cannot reach beyond the playable kingdom.');
      return;
    }
    const power = CATASTROPHES[powerType];
    const lastCast = lastCastRef.current[powerType];
    if (lastCast !== undefined && simClockRef.current - lastCast < power.cooldown) {
      onMessage?.(`${power.name} recharging`);
      return;
    }
    const currentTrial=trialRef.current;
    if (currentTrial?.result === 'running') {
      const spent = trialSpend(currentTrial, powerType);
      if (!spent.accepted) {
        onMessage?.(currentTrial.elapsed>=TRIAL_STAGES[currentTrial.stage].time
          ? 'The deadline has passed. Awaiting outstanding impacts; no new miracles allowed.'
          : `Insufficient will for ${power.name}. Costs more than your current energy.`);
        return;
      }
      trialRef.current = spent.run;
      onTrialView?.(trialView(spent.run, worldRef.current));
    }
    lastCastRef.current[powerType] = simClockRef.current;
    const force = THREE.MathUtils.clamp(powerForce, 0.5, 3);
    const radius = power.radius * Math.sqrt(force);
    const duration = power.cooldown * 3.0;
    const origin = pos.clone();
    setHandState('cast');
    setActiveDisasters(prev => [...prev.slice(-7), {
      id: `dis_${Date.now()}_${Math.random()}`, type: powerType, position: origin,
      duration, maxDuration: duration, radius, phase: 0,
    }]);
    spawnParticles(origin, power.color, 32, 2.6,
      powerType === 'crystal' ? 'sparkle' : powerType === 'restore' ? 'arcane' :
        powerType === 'wave' ? 'water' : 'debris');
    if (powerType === 'meteor') {
      // The actual damage is deferred until the descending meteor reaches the ground.
      pendingImpactsRef.current.push({remaining: duration * (2 / 3), power: powerType, pos: origin, radius, force});
      onMessage?.('Meteor incoming - impact pending');
    } else {
      applyImpact(powerType, origin, radius, force);
    }
  }, [applyImpact, onMessage, onTrialView, isMiraclePrimed, simSpeed, powerForce, spawnParticles]);

  // Navigation uses the unscaled render clock. World events use a bounded simulation clock.
  const pendingTapRef = useRef<PendingTap<{power: CatastropheType; position: THREE.Vector3}>[]>([]);
  useEffect(() => {
    const cancelPending = () => {pendingTapRef.current = [];};
    window.addEventListener('blur', cancelPending);
    return () => window.removeEventListener('blur', cancelPending);
  }, []);
  useEffect(() => {
    if (interactionMode !== 'cast') pendingTapRef.current = [];
  }, [interactionMode]);
  useEffect(() => { pendingTapRef.current = []; }, [resetSignal]);
  useEffect(() => { pendingTapRef.current = []; }, [trialGeneration,trialEnabled]);
  const gestureClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (gestureClearTimer.current) clearTimeout(gestureClearTimer.current);
    if (handClearTimer.current) clearTimeout(handClearTimer.current);
  }, []);

  useFrame(({clock}, rawDelta) => {
    const renderDt = Math.min(rawDelta, 0.075);
    const dt = renderDt * Math.max(0, simSpeed);
    const input = inputRef.current;
    const cam = camState.current;
    const pointer = input.pointer;
    pointerVec.set(pointer.nx, pointer.ny);
    raycaster.setFromCamera(pointerVec, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, scratchVec);

    if (hit) {
      if (!hoverGroundRef.current) hoverGroundRef.current = new THREE.Vector3();
      hoverGroundRef.current.copy(scratchVec);
    } else {
      hoverGroundRef.current = null;
    }

    const scale = cam.distance * 0.002;
    const rightX = Math.cos(cam.orbitAngle), rightZ = -Math.sin(cam.orbitAngle);
    const forwardX = -Math.sin(cam.orbitAngle), forwardZ = -Math.cos(cam.orbitAngle);
    const orbitDrag = pointer.rightDown && !pointer.shiftDown;
    const panDrag = pointer.middleDown || (pointer.rightDown && pointer.shiftDown);
    if (orbitDrag) {
      cam.orbitAngle -= pointer.movementX * 0.008;
      cam.pitchOffset = THREE.MathUtils.clamp(cam.pitchOffset + pointer.movementY * 0.005, -0.5, 0.52);
    } else if (panDrag) {
      cam.target.x -= pointer.movementX * rightX * scale + pointer.movementY * forwardX * scale;
      cam.target.z -= pointer.movementX * rightZ * scale + pointer.movementY * forwardZ * scale;
    }
    if (pointer.panDeltaX !== 0 || pointer.panDeltaY !== 0) {
      cam.target.x -= pointer.panDeltaX * rightX * scale + pointer.panDeltaY * forwardX * scale;
      cam.target.z -= pointer.panDeltaX * rightZ * scale + pointer.panDeltaY * forwardZ * scale;
    }
    pointer.movementX = 0;
    pointer.movementY = 0;
    pointer.panDeltaX = 0;
    pointer.panDeltaY = 0;

    const lateral = Number(input.actions.right) - Number(input.actions.left);
    const axial = Number(input.actions.up) - Number(input.actions.down);
    const moveSpeed = cam.distance * 0.55 * renderDt;
    if (lateral || axial) {
      cam.target.x += (rightX * lateral + forwardX * axial) * moveSpeed;
      cam.target.z += (rightZ * lateral + forwardZ * axial) * moveSpeed;
    }
    if (input.actions.rotateLeft) cam.orbitAngle -= 1.3 * renderDt;
    if (input.actions.rotateRight) cam.orbitAngle += 1.3 * renderDt;
    cam.target.x = THREE.MathUtils.clamp(cam.target.x, -65, 65);
    cam.target.z = THREE.MathUtils.clamp(cam.target.z, -65, 65);
    if (orbitDrag || panDrag || pointer.touchCount >= 2) {
      if (isDrawingGestureRef.current) setGesture3DPoints([]);
      isDrawingGestureRef.current = false;
      pointerDownPosRef.current = null;
      gestureScreenPointsRef.current = [];
      setHandState(prev => prev === 'grab_world' ? prev : 'grab_world');
    } else if (!pointer.down && handState === 'grab_world') {
      setHandState('idle');
    }

    if (pointer.down && !panDrag && !orbitDrag && !pointer.cancelled && pointer.touchCount < 2) {
      if (!wasPointerDownRef.current) {
        pointerDownPosRef.current = {x: pointer.clientX, y: pointer.clientY, t: performance.now()};
        gestureScreenPointsRef.current = [{x: pointer.clientX, y: pointer.clientY}];
        isDrawingGestureRef.current = false;
        if (interactionMode === 'cast') setGesture3DPoints(hit ? [scratchVec.clone()] : []);
      } else if (pointerDownPosRef.current && interactionMode === 'cast') {
        const distance = Math.hypot(pointer.clientX - pointerDownPosRef.current.x,
          pointer.clientY - pointerDownPosRef.current.y);
        if (distance > 16) {
          if (!isDrawingGestureRef.current) {
            isDrawingGestureRef.current = true;
            setHandState('drawing_gesture');
          }
          const previousPoint = gestureScreenPointsRef.current[gestureScreenPointsRef.current.length - 1];
          if (!previousPoint || Math.hypot(pointer.clientX - previousPoint.x, pointer.clientY - previousPoint.y) > 4) {
            gestureScreenPointsRef.current.push({x: pointer.clientX, y: pointer.clientY});
            if (hit) setGesture3DPoints(prev => [...prev.slice(-45), scratchVec.clone()]);
          }
        }
      }
    } else if (wasPointerDownRef.current && !pointer.down) {
      let castHappened = false;
      if (!pointer.cancelled && pointerDownPosRef.current && hit) {
        const dragDistance = Math.hypot(pointer.clientX - pointerDownPosRef.current.x,
          pointer.clientY - pointerDownPosRef.current.y);
        const duration = performance.now() - pointerDownPosRef.current.t;
        if (interactionMode === 'inspect' && dragDistance < 24 && duration < 650) {
          onInspect?.(describeGround(groundRef.current, scratchVec.x, scratchVec.z));
        } else if (interactionMode === 'forecast' && dragDistance < 24 && duration < 650) {
          const def = CATASTROPHES[activePower];
          const force = THREE.MathUtils.clamp(powerForce, 0.5, 3);
          const cooldown = lastCastRef.current[activePower];
          const recharging = cooldown !== undefined && simClockRef.current - cooldown < def.cooldown;
          const prediction = forecastImpact(worldRef.current, initialWorld, groundRef.current,
            {type: activePower, x: scratchVec.x, z: scratchVec.z,
              radius: def.radius * Math.sqrt(force), force});
          onInspect?.(`${formatForecast(prediction)}${recharging ? ` ${def.name} is still recharging.` : ''}`);
        } else if (isDrawingGestureRef.current && interactionMode === 'cast') {
          const recognition = recognizeGesture(gestureScreenPointsRef.current);
          if (recognition.matchedType) {
            onGestureSuccess(recognition.matchedType, recognition.confidence);
            executeCatastropheAt(recognition.matchedType, scratchVec.clone());
            castHappened = true;
          } else {
            onGestureFail();
            onMessage?.('Rune not recognized - no spell cast');
          }
        } else if (interactionMode === 'cast' && duration < 650 && dragDistance < 24 && !pointer.doubleClicked) {
          if (pointer.pointerType !== 'mouse') {
            executeCatastropheAt(activePower, scratchVec.clone());
          } else {
            // A double-click focuses the camera; its first click must not
            // detonate a catastrophe before the second click arrives.
            pendingTapRef.current = queueDesktopTap(pendingTapRef.current,
              {x: pointer.clientX, y: pointer.clientY,
                payload: {power: activePower, position: scratchVec.clone()}});
          }
          castHappened = true;
        }
      }
      isDrawingGestureRef.current = false;
      pointerDownPosRef.current = null;
      gestureScreenPointsRef.current = [];
      setHandState(castHappened ? 'cast' : 'idle');
      if (handClearTimer.current) clearTimeout(handClearTimer.current);
      if (castHappened) handClearTimer.current = setTimeout(() => setHandState('idle'), 500);
      if (gestureClearTimer.current) clearTimeout(gestureClearTimer.current);
      gestureClearTimer.current = setTimeout(() => setGesture3DPoints([]), 300);
    }
    wasPointerDownRef.current = pointer.down && !pointer.cancelled;

    if (Math.abs(pointer.wheelDelta) > 0.001) {
      cam.distance = THREE.MathUtils.clamp(cam.distance + pointer.wheelDelta * 0.08 *
        getConfig('bwZoomSensitivity'), 6, 70);
      pointer.wheelDelta = 0;
    }
    if (pointer.doubleClicked) {
      pendingTapRef.current = discardFocusTap(pendingTapRef.current, pointer.clientX, pointer.clientY);
      pointer.cancelled = true; // focus gestures must not also cast
      if (hit) {
        cam.target.set(scratchVec.x, 0, scratchVec.z);
        cam.distance = Math.max(12, cam.distance * 0.68);
      }
      pointer.doubleClicked = false; // a one-shot event, never an every-frame zoom loop
    }
    const taps = advanceDesktopTaps(pendingTapRef.current, renderDt);
    pendingTapRef.current = taps.pending;
    for (const tap of taps.ready) executeCatastropheAt(tap.power, tap.position);

    const altitude = (cam.distance - 6) / 64;
    const pitchTarget = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(0.22, 1.12, Math.pow(altitude, 0.7)) + cam.pitchOffset, 0.18, 1.43);
    const lerpFactor = 1 - Math.exp(-8 * renderDt);
    cam.pitch = THREE.MathUtils.lerp(cam.pitch, pitchTarget, lerpFactor);
    cam.smoothedTarget.lerp(cam.target, lerpFactor);
    cam.smoothedOrbit = THREE.MathUtils.lerp(cam.smoothedOrbit, cam.orbitAngle, lerpFactor);
    cam.smoothedDistance = THREE.MathUtils.lerp(cam.smoothedDistance, cam.distance, lerpFactor);
    const camX = cam.smoothedTarget.x + Math.sin(cam.smoothedOrbit) * Math.cos(cam.pitch) * cam.smoothedDistance;
    const camY = cam.smoothedTarget.y + Math.sin(cam.pitch) * cam.smoothedDistance + 1.2;
    const camZ = cam.smoothedTarget.z + Math.cos(cam.smoothedOrbit) * Math.cos(cam.pitch) * cam.smoothedDistance;
    const shake = simSpeed > 0 && !REDUCE_SCENIC_MOTION && getConfig('cameraShakeEnabled')
      ? Math.min(.42,cameraShakeRef.current) : 0;
    const shakeTime = clock.elapsedTime;
    camera.position.set(camX + Math.sin(shakeTime*31.3) * shake * .39,
      camY + Math.sin(shakeTime*26.2 + 1.2) * shake * .26,
      camZ + Math.sin(shakeTime*23.6 + 2.4) * shake * .39);
    camera.lookAt(cam.smoothedTarget.x, cam.smoothedTarget.y + 1.2, cam.smoothedTarget.z);
    cameraShakeRef.current = settleCameraRecoil(cameraShakeRef.current, renderDt, simSpeed <= 0);

    // World time, destruction, fire, and recharge are independent of render FPS.
    if (dt > 0) {
      simClockRef.current += dt;
      for (let i = pendingImpactsRef.current.length - 1; i >= 0; i--) {
        const impact = pendingImpactsRef.current[i];
        impact.remaining -= dt;
        if (impact.remaining <= 0) {
          pendingImpactsRef.current.splice(i, 1);
          applyImpact(impact.power, impact.pos, impact.radius, impact.force, impact.source ?? 'player');
        }
      }
      // Step the environmental simulation at a fixed 0.5s interval, with
      // bounded catch-up. Diffusion, combustion and scoring share the same tick.
      fireAccumulatorRef.current += dt;
      let steps = 0;
      while (fireAccumulatorRef.current >= 0.5 && steps < 4) {
        steps++;
        fireAccumulatorRef.current -= 0.5;
        const updatedGround = advanceGround(groundRef.current, 0.5);
        if (updatedGround.changed) groundRef.current = updatedGround.field;
        const beforeWorld = worldRef.current;
        const wind = windAt(simClockRef.current, worldSeed);
        const next = tickEnvironment(beforeWorld, 0.5, wind.x, wind.z,
          (x, z) => sampleGround(groundRef.current, x, z));
        if (next.changed) {
          // A spreading blaze marks its *new* casualties, not just the original
          // cast circle. Derived scar placement follows authoritative deaths.
          const lostTrees = next.world.trees.flatMap((tree, i) =>
            tree.burnt && !beforeWorld.trees[i].burnt ?
              [{x: tree.position[0], z: tree.position[2]}] : []);
          const lostBuildings = next.destroyed.map(block =>
            ({x: block.originalPos[0], z: block.originalPos[2]}));
          const scars = depositAftermath(groundRef.current, [...lostTrees, ...lostBuildings]);
          if (scars.changed) groundRef.current = scars.field;
          worldRef.current = next.world;
          setTrees(next.world.trees);
          setBlocks(next.world.blocks);
          if (next.destroyed.length) spawnRubble(next.destroyed, 'wildfire', new THREE.Vector3(0, 0, 0));
          // The sandbox chaos high score belongs to player actions, not an
          // opposing catastrophe spreading fire during the active trial.
          if (next.score && !trialRef.current) setGameState(prev => ({...prev, score: prev.score + next.score,
            chaosScore: (prev.chaosScore || 0) + next.score}));
        }
        if ((updatedGround.formedStone > 0 || next.destroyed.length > 0 || next.treesIgnited > 0) &&
          simClockRef.current - lastReactionRecordRef.current >= 3) {
          lastReactionRecordRef.current = simClockRef.current;
          const developments = [];
          if (updatedGround.formedStone > 0) developments.push(`${updatedGround.formedStone} patches solidified`);
          if (next.treesIgnited > 0) developments.push(`${next.treesIgnited} trees caught fire`);
          if (next.destroyed.length > 0) developments.push(`${next.destroyed.length} structures burned down`);
          onWorldEvent?.({id: `chain_${Date.now()}_${Math.random()}`, time: simClockRef.current,
            kind: 'reaction', title: 'The aftermath', detail: developments.join('; ')});
        }
        if (trialRef.current?.result === 'running') {
          const previousStage = trialRef.current.stage;
          const pendingPlayerImpacts=pendingImpactsRef.current.filter(
            impact=>(impact.source??'player')==='player').length;
          const outcome = trialStep(trialRef.current, 0.5, worldRef.current,pendingPlayerImpacts);
          trialRef.current = outcome.state;
          for (const threat of outcome.threats) executeThreat(threat);
          if (outcome.state.stage !== previousStage || outcome.state.result !== 'running') {
            setTrialMarker(outcome.state.result === 'running'
              ? {target:trialTarget(outcome.state),stage:outcome.state.stage} : null);
          }
          onTrialView?.(trialView(outcome.state,worldRef.current));
          for (const notice of outcome.notices) {
            onMessage?.(notice);
            onWorldEvent?.({id:`trial_${Date.now()}_${Math.random()}`,time:simClockRef.current,
              kind:'reaction',title:'The Covenant',detail:notice});
          }
        }
        if (simClockRef.current - lastMemoryReportRef.current >= 1.5) {
          lastMemoryReportRef.current = simClockRef.current;
          onGroundStats?.(groundStats(groundRef.current));
          onWind?.(windAt(simClockRef.current, worldSeed));
        }
      }
      if (activeDisasters.length > 0) {
        renderAccumulatorRef.current += dt;
        if (renderAccumulatorRef.current >= 1 / 15) {
          const elapsed = renderAccumulatorRef.current;
          renderAccumulatorRef.current = 0;
          setActiveDisasters(prev => prev.length === 0 ? prev : prev.map(d => ({...d,
            duration: d.duration - elapsed, phase: d.phase + elapsed * 3.8})).filter(d => d.duration > 0));
        }
      } else {
        // Never accumulate idle time; it would make the next catastrophe expire instantly.
        renderAccumulatorRef.current = 0;
      }
    }

    // A bounded background checkpoint; no React state is updated each frame.
    checkpointElapsedRef.current += renderDt;
    if (checkpointElapsedRef.current >= 7) {
      checkpointElapsedRef.current = 0;
      emitCheckpoint();
    }
    telemetryRef.current.elapsed += renderDt;
    telemetryRef.current.frames += 1;
    if (telemetryRef.current.elapsed >= 0.85) {
      onTelemetry?.(Math.round(telemetryRef.current.frames / telemetryRef.current.elapsed), gl.info.render.calls);
      telemetryRef.current.elapsed = 0;
      telemetryRef.current.frames = 0;
    }
  });

  const hasStorm = getConfig('dynamicWeatherLighting') && activeDisasters.some(
    (d) => d.type === 'lightning' || d.type === 'tornado' || d.type === 'wave',
  );
  const hasVolcano = getConfig('dynamicWeatherLighting') && activeDisasters.some(
    (d) => d.type === 'volcano' || d.type === 'meteor' || d.type === 'wildfire',
  );
  // Share one filtered array among all rubble bodies rather than querying
  // unrelated catastrophe types across up to eighty per-frame callbacks.
  const impulseDisasters = useMemo(() => activeDisasters.filter(
    d => d.type === 'tornado' || d.type === 'wave'), [activeDisasters]);

  return (
    <group>
      <RealisticLighting activeDisasters={activeDisasters} quality={quality} />
      {trialMarker && <TrialBeacon target={trialMarker.target} stage={trialMarker.stage}/>}
      <RealisticSkyDome hasStorm={hasStorm} hasVolcano={hasVolcano} />
      <SceneWeatherFog hasStorm={hasStorm} hasVolcano={hasVolcano} />
      <DistantRidges seed={worldSeed} quality={quality} />
      <RealisticAtmosphericClouds hasStorm={hasStorm} hasVolcano={hasVolcano} seed={worldSeed} quality={quality} />
      {quality === 'high' && !REDUCE_SCENIC_MOTION && <AtmosphericDustMotes />}
      <SoaringEagles />

      {/* 3D Black & White 2 Divine God Hand (Replaces the OS Cursor) */}
      <RealisticDivineHand
        groundPosRef={hoverGroundRef}
        handState={handState}
        activePowerDef={CATASTROPHES[activePower]}
        isPrimed={isMiraclePrimed}
        quality={quality}
      />

      {/* 3D Gesture In-World Ink Trail */}
      <GestureRibbonTrail points={gesture3DPoints} activeColor={CATASTROPHES[activePower].color} />

      {/* Summoning Transmutation Mandala on Ground */}
      <SummoningMandala
        positionRef={hoverGroundRef}
        activeColor={CATASTROPHES[activePower].color}
        isPrimed={isMiraclePrimed}
        radius={CATASTROPHES[activePower].radius * Math.sqrt(THREE.MathUtils.clamp(powerForce, 0.5, 3))}
      />

      {/* PBR Terrain Floor */}
      <RigidBody type="fixed" colliders="cuboid" name="ground">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
          <boxGeometry args={[WORLD_SIZE, WORLD_SIZE, 0.5]} />
          <meshStandardMaterial
            map={grassPBR.diffuse}
            normalMap={grassPBR.normal}
            normalScale={new THREE.Vector2(1.25, 1.25)}
            color={undefined}
            roughness={0.88}
            metalness={0.05}
          />
        </mesh>
      </RigidBody>

      {/* Persistent local consequence field: water, heat, frost, ash and stone.
          Instanced and updated only when material state changes. */}
      <EnvironmentalMemory fieldRef={groundRef} layer={memoryLayer} />
      <EnvironmentalAfterglow fieldRef={groundRef} />

      {/* Sculpted Hills */}
      {[
        [-28, -26, 8, 1.2],
        [-32, 18, 10, 1.4],
        [34, -28, 12, 1.6],
        [32, 24, 11, 1.5],
      ].map(([hx, hz, hr, hh], idx) => (
        <mesh key={`hill_${idx}`} position={[hx, -1.7, hz]} scale={[1, 0.26 * hh, 1]} receiveShadow>
          <sphereGeometry args={[hr, 18, 10]} />
          <meshStandardMaterial
            map={grassPBR.diffuse}
            normalMap={grassPBR.normal}
            color={'#536b4b'}
            roughness={0.9}
          />
        </mesh>
      ))}

      {/* Cobblestone Village Highway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0.035, 0]} receiveShadow>
        <planeGeometry args={[4.2, 58]} />
        <meshStandardMaterial
          map={cobblestonePBR.diffuse}
          normalMap={cobblestonePBR.normal}
          normalScale={new THREE.Vector2(1.4, 1.4)}
          roughness={0.82}
          metalness={0.1}
        />
      </mesh>

      {/* Shared instanced shoreline and meadow microdetail. */}
      <ScenicGround seed={worldSeed} quality={quality} />

      {/* 3D Grass Tufts & Wildflowers */}
      {quality !== 'low' && <DynamicGrassFoliage isRiverFrozen={false} worldSeed={worldSeed} quality={quality} />}

      {/* Eroded four-sided escarpments replace the four identical cone placeholders.
          Original map-boundary collision bodies remain unchanged below. */}
      <LivingEscarpments seed={worldSeed} quality={quality}/>

      {/* Landmarks & River */}
      <RealisticRiverSystem
        isFrozen={false}
        blocks={blocks}
        stonePBR={stonePBR}
        waterNormalMap={waterNormalMap}
        quality={quality} worldSeed={worldSeed}
      />
      <RealisticCitadel
        blocks={blocks}
        onFire={trees.some((t) => t.onFire && t.position[0] > 10)}
        quality={quality}
        stonePBR={stonePBR}
        roofTilePBR={roofTilePBR}
      />
      <RealisticVillage blocks={blocks} quality={quality} roofTilePBR={roofTilePBR} stonePBR={stonePBR} />
      <RuinedFoundations blocks={blocks} seed={worldSeed} quality={quality}/>
      <RoofRidgelines blocks={blocks}/>
      <RealisticSanctuary quality={quality}/>

      {/* Swaying Foliage Trees */}
      <SwayingForest trees={trees} isRiverFrozen={false} quality={quality} />

      {/* Localized frost: never recolor the whole kingdom for one cast. */}
      {icePatches.map(p => (
        <group key={p.id} position={[p.x, 0.16, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <circleGeometry args={[p.radius, 40]} />
            <meshStandardMaterial color="#93c5fd" transparent opacity={0.36} roughness={0.2} metalness={0.22} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, 0.012]}>
            <ringGeometry args={[Math.max(0.1, p.radius - 0.2), p.radius, 40]} />
            <meshBasicMaterial color="#e0f2fe" transparent opacity={0.72} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* Crystals */}
      {crystals.map((c) => (
        <group key={c.id} position={c.position} rotation={[0, c.rotY, 0]} scale={[c.scale, c.scale, c.scale]}>
          <mesh position={[0, 1.8, 0]} castShadow>
            <octahedronGeometry args={[0.95, 0]} />
            <meshStandardMaterial
              color={c.color}
              emissive="#9333ea"
              emissiveIntensity={1.4}
              roughness={0.06}
              metalness={0.94}
            />
          </mesh>
        </group>
      ))}

      {/* Inhabitants */}
      <Inhabitants key={`${worldSeed}_${resetSignal}`} activeDisasters={activeDisasters} simSpeed={simSpeed} fieldRef={groundRef} />

      {/* Physics Rubble: applied forces affect existing pieces as well as newly spawned ones. */}
      {debris.map(deb => <PhysicsRubble key={deb.id} item={deb} impulseDisasters={impulseDisasters}
        stonePBR={stonePBR} simSpeed={simSpeed} />)}

      {/* Catastrophe FX */}
      {activeDisasters.map((d) => (
        <DisasterVisualEffect key={d.id} disaster={d} simSpeed={simSpeed} />
      ))}

      {/* A single pooled draw call, animated without React renders. */}
      <InstancedParticleField particles={particlesRef} simSpeed={simSpeed} />

      {/* Map Boundary Colliders */}
      <CuboidCollider position={[0, 10, -HALF_SIZE]} args={[HALF_SIZE, 10, 1]} />
      <CuboidCollider position={[0, 10, HALF_SIZE]} args={[HALF_SIZE, 10, 1]} />
      <CuboidCollider position={[-HALF_SIZE, 10, 0]} args={[1, 10, HALF_SIZE]} />
      <CuboidCollider position={[HALF_SIZE, 10, 0]} args={[1, 10, HALF_SIZE]} />
    </group>
  );
}

export function Game({
  gameState,
  setGameState,
  activePower,
  isMiraclePrimed,
  onGestureSuccess,
  onGestureFail,
  resetSignal,
  worldSeed,
  restoredKingdom,
  checkpointRequest,
  onCheckpoint,
  onSaveRejected,
  onBaseline,
  simSpeed,
  powerForce = Number(getConfig('catastrophePower')) || 1.2,
  interactionMode,
  cameraPreset,
  onPresetApplied,
  onMessage,
  onTelemetry,
  onWorldEvent,
  onGroundStats,
  onInspect,
  onWind,
  trialEnabled = false,
  trialGeneration = 0,
  onTrialView,
  memoryLayer = 'all',
  quality = 'medium',
}: {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  activePower: CatastropheType;
  isMiraclePrimed: boolean;
  onGestureSuccess: (miracle: CatastropheType, confidence: number) => void;
  onGestureFail: () => void;
  resetSignal: number;
  worldSeed: number;
  restoredKingdom?: SavedKingdom | null;
  checkpointRequest: number;
  onCheckpoint?: (state: WorldCheckpoint, sourceEpoch: number) => void;
  onBaseline?: (blocks: StructureBlock[]) => void;
  onSaveRejected?: () => void;
  simSpeed: number;
  powerForce?: number;
  interactionMode: MouseInteractionMode;
  cameraPreset?: string | null;
  onPresetApplied?: () => void;
  onMessage?: (text: string) => void;
  onTelemetry?: (fps: number, drawCalls: number) => void;
  onWorldEvent?: (event: ChronicleEvent) => void;
  onGroundStats?: (stats: GroundStats) => void;
  onInspect?: (description: string) => void;
  onWind?: (wind: Wind) => void;
  trialEnabled?: boolean;
  trialGeneration?: number;
  onTrialView?: (view: TrialView | null) => void;
  memoryLayer?: MemoryLayer;
  quality?: GraphicsQuality;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useInput(containerRef, {enabled: true});

  return (
    <div
      ref={containerRef}
      style={{cursor: interactionMode === 'inspect' || interactionMode === 'forecast' ? 'help' : 'crosshair', width: '100%', height: '100%', position: 'relative', touchAction: 'none', overflow: 'hidden'}}
      className="w-full h-full canvas-wrapper relative select-none overflow-hidden touch-none">
      <Canvas
        shadows={quality !== 'low'}
        dpr={quality === 'low' ? [1, 1] : quality === 'medium' ? [1, 1.45] : [1, 1.8]}
        camera={{
          fov: getConfig('fov'),
          near: 0.1,
          far: 1000,
          position: [getConfig('cameraX'), getConfig('cameraY'), getConfig('cameraZ')],
        }}
        gl={{
          antialias: quality !== 'low',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        scene={{
          background: new THREE.Color(getConfig('backgroundColor')),
        }}>
        <Suspense fallback={null}>
          <Physics gravity={[0, getConfig('gravity'), 0]}
            timeStep={Math.max(1 / 120, Math.min(1 / 30, simSpeed / 60 || 1 / 60))}
            paused={simSpeed <= 0}>
            <Scene
              gameState={gameState}
              setGameState={setGameState}
              inputRef={inputRef}
              activePower={activePower}
              isMiraclePrimed={isMiraclePrimed}
              onGestureSuccess={onGestureSuccess}
              onGestureFail={onGestureFail}
              resetSignal={resetSignal}
              worldSeed={worldSeed}
              restoredKingdom={restoredKingdom}
              checkpointRequest={checkpointRequest}
              onCheckpoint={onCheckpoint}
              onSaveRejected={onSaveRejected}
              onBaseline={onBaseline}
              simSpeed={simSpeed}
              powerForce={powerForce}
              interactionMode={interactionMode}
              cameraPreset={cameraPreset}
              onPresetApplied={onPresetApplied}
              onMessage={onMessage}
              onTelemetry={onTelemetry}
              onWorldEvent={onWorldEvent}
              onGroundStats={onGroundStats}
              onInspect={onInspect}
              onWind={onWind}
              trialEnabled={trialEnabled}
              trialGeneration={trialGeneration}
              onTrialView={onTrialView}
              memoryLayer={memoryLayer}
              quality={quality}
            />
          </Physics>

          {quality !== 'low' && (
            <EffectComposer multisampling={0}>
              {/* ACES tone mapping is already owned by the renderer; no second grading pass. */}
              <Bloom luminanceThreshold={1.15} luminanceSmoothing={0.16}
                intensity={quality === 'high' ? 0.34 : 0.19} mipmapBlur />
              <Vignette eskil={false} offset={0.34} darkness={0.20} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
