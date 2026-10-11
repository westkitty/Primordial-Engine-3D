/** One instanced draw call for enduring ground changes. */
import React, {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {FIELD_CELL, FIELD_COUNT, cellCenter, type FieldChannel, type GroundField} from '../environment';

const HOT = new THREE.Color('#ff6b28');
const WET = new THREE.Color('#3b82b7');
const FROST = new THREE.Color('#d9f7ff');
const ASH = new THREE.Color('#392d32');
const STONE = new THREE.Color('#5e6975');

export type MemoryLayer = 'all' | FieldChannel;
export function EnvironmentalMemory({fieldRef, layer = 'all'}: {
  fieldRef: React.MutableRefObject<GroundField>; layer?: MemoryLayer;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const marker = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const lastRevision = useRef(-1);
  const lastField = useRef<GroundField | null>(null);
  const lastLayer = useRef<MemoryLayer>('all');

  useFrame(() => {
    const mesh = meshRef.current;
    const field = fieldRef.current;
    // Import/regeneration can replace the entire field at the same revision.
    if (!mesh || (lastField.current === field && lastRevision.current === field.revision && lastLayer.current === layer)) return;
    lastField.current = field;
    lastRevision.current = field.revision;
    lastLayer.current = layer;
    for (let i = 0; i < FIELD_COUNT; i++) {
      const heat = layer === 'all' || layer === 'heat' ? field.heat[i] : 0;
      const water = layer === 'all' || layer === 'water' ? field.water[i] : 0;
      const frost = layer === 'all' || layer === 'frost' ? field.frost[i] : 0;
      const ash = layer === 'all' || layer === 'ash' ? field.ash[i] : 0;
      const stone = layer === 'all' || layer === 'stone' ? field.stone[i] : 0;
      const intensity = Math.max(heat, water, frost, ash, stone);
      const {x, z} = cellCenter(i);
      marker.position.set(x, 0.052, z);
      marker.rotation.set(-Math.PI / 2, 0, 0);
      const size = intensity < 0.035 ? 0.0001 : FIELD_CELL * 0.90 * (0.4 + 0.6 * intensity);
      marker.scale.set(size, size, 1);
      marker.updateMatrix();
      mesh.setMatrixAt(i, marker.matrix);
      // Weighted palette: thermal bloom fades into permanent ash / stone.
      const total = heat + water + frost + ash + stone;
      tint.setRGB(0, 0, 0);
      if (total > 0) {
        // Color.addScaledColor does not exist in Three.js. Mix linear RGB
        // channels directly, with no allocations in the 1,024-cell update.
        const invTotal = 1 / total;
        tint.setRGB(
          (HOT.r * heat + WET.r * water + FROST.r * frost + ASH.r * ash + STONE.r * stone) * invTotal,
          (HOT.g * heat + WET.g * water + FROST.g * frost + ASH.g * ash + STONE.g * stone) * invTotal,
          (HOT.b * heat + WET.b * water + FROST.b * frost + ASH.b * ash + STONE.b * stone) * invTotal,
        );
      }
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  });

  return <instancedMesh ref={meshRef} args={[undefined, undefined, FIELD_COUNT]} frustumCulled={false}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial transparent opacity={0.67} depthWrite={false} side={THREE.DoubleSide}
      polygonOffset polygonOffsetFactor={-2} />
  </instancedMesh>;
}

/** One unshadowed local light lets lasting heat remain visible after the VFX ends. */
export function EnvironmentalAfterglow({fieldRef}: {fieldRef: React.MutableRefObject<GroundField>}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const lastRevision = useRef(-1);
  const lastField = useRef<GroundField | null>(null);
  const strength = useRef(0);
  useFrame(({clock}) => {
    const light = lightRef.current;
    if (!light) return;
    const field = fieldRef.current;
    if (lastField.current !== field || field.revision !== lastRevision.current) {
      lastField.current = field;
      lastRevision.current = field.revision;
      let max = 0, hottest = -1;
      for (let i = 0; i < FIELD_COUNT; i++) {
        if (field.heat[i] > max) {max = field.heat[i]; hottest = i;}
      }
      strength.current = max >= 0.2 ? max : 0;
      if (hottest >= 0) {
        const point = cellCenter(hottest);
        light.position.set(point.x, 2.5, point.z);
      }
    }
    light.intensity = strength.current * (2.6 + Math.sin(clock.elapsedTime * 5.1) * 0.12);
  });
  return <pointLight ref={lightRef} color="#ff752e" intensity={0} distance={21} decay={2} />;
}
