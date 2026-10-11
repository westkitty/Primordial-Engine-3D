import {useFrame} from '@react-three/fiber';
import React, {forwardRef, useRef} from 'react';
import * as THREE from 'three';

const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];

export interface ProceduralAnimalProps {
  type?: 'dog' | 'cat' | 'horse' | 't-rex' | 'chicken';
  color?: string;
  state?: 'idle' | 'walk' | 'run';
  size?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
}

export const AnimalCharacter = forwardRef<THREE.Group, ProceduralAnimalProps>(
  function AnimalCharacter(
    {
      type = 'horse',
      color = '#8b5a2b',
      state = 'idle',
      size = 1,
      position = DEFAULT_POSITION,
      rotation = DEFAULT_ROTATION,
      castShadow = true,
    }: ProceduralAnimalProps,
    ref,
  ) {
    const frontLeftLeg = useRef<THREE.Group>(null);
    const frontRightLeg = useRef<THREE.Group>(null);
    const backLeftLeg = useRef<THREE.Group>(null);
    const backRightLeg = useRef<THREE.Group>(null);
    const headGroup = useRef<THREE.Group>(null);
    const tailGroup = useRef<THREE.Group>(null);

    const isBiped = type === 't-rex' || type === 'chicken';
    const isHorse = type === 'horse';
    const isChicken = type === 'chicken';

    useFrame(({clock}) => {
      const t = clock.getElapsedTime();
      const speed = state === 'run' ? 16 : 8;
      const intensity = state === 'idle' ? 0.04 : state === 'run' ? 0.6 : 0.35;

      const backLeft = backLeftLeg.current;
      const backRight = backRightLeg.current;
      if (!backLeft || !backRight) return;

      const swing = Math.sin(t * speed) * intensity;
      if (isBiped) {
        backLeft.rotation.x = swing;
        backRight.rotation.x = -swing;
      } else {
        backRight.rotation.x = swing;
        backLeft.rotation.x = -swing;
        if (frontLeftLeg.current) frontLeftLeg.current.rotation.x = swing;
        if (frontRightLeg.current) frontRightLeg.current.rotation.x = -swing;
      }

      if (headGroup.current) {
        headGroup.current.rotation.x = Math.sin(t * (speed * 0.5)) * 0.08;
      }
      if (tailGroup.current) {
        tailGroup.current.rotation.y = Math.sin(t * 6) * 0.3;
      }
    });

    if (isChicken) {
      return (
        <group
          ref={ref}
          position={position}
          rotation={rotation}
          scale={[size, size, size]}>
          {/* Chicken Body */}
          <mesh position={[0, 0.45, 0]} castShadow={castShadow}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          {/* Chicken Head & Beak & Comb */}
          <group ref={headGroup} position={[0, 0.68, -0.2]}>
            <mesh castShadow={castShadow}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            {/* Beak */}
            <mesh position={[0, -0.02, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.06, 0.14, 4]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.4} />
            </mesh>
            {/* Red Comb */}
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[0.04, 0.12, 0.16]} />
              <meshStandardMaterial color="#dc2626" roughness={0.5} />
            </mesh>
          </group>
          {/* Chicken Legs */}
          <group ref={backLeftLeg} position={[-0.1, 0.3, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 4]} />
              <meshStandardMaterial color="#d97706" />
            </mesh>
          </group>
          <group ref={backRightLeg} position={[0.1, 0.3, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow={castShadow}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 4]} />
              <meshStandardMaterial color="#d97706" />
            </mesh>
          </group>
        </group>
      );
    }

    // Horse Model
    return (
      <group
        ref={ref}
        position={position}
        rotation={rotation}
        scale={[size, size, size]}>
        {/* Horse torso follows the length of the animal rather than standing upright. */}
        <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={castShadow}>
          <capsuleGeometry args={[0.35, 0.9, 4, 8]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>

        {/* Saddle */}
        <mesh position={[0, 1.64, 0]} castShadow={castShadow}>
          <boxGeometry args={[0.72, 0.12, 0.55]} />
          <meshStandardMaterial color="#451a03" roughness={0.8} />
        </mesh>

        {/* Neck & Head */}
        <group ref={headGroup} position={[0, 1.4, -0.55]}>
          {/* Neck */}
          <mesh position={[0, 0.45, -0.15]} rotation={[-0.55, 0, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.2, 0.28, 0.85, 6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.85, -0.42]} rotation={[-0.3, 0, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.26, 0.3, 0.55]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Mane */}
          <mesh position={[0, 0.65, 0.05]} rotation={[-0.55, 0, 0]}>
            <boxGeometry args={[0.08, 0.7, 0.16]} />
            <meshStandardMaterial color="#292524" roughness={0.9} />
          </mesh>
          {/* Muzzle Snout */}
          <mesh position={[0, 0.76, -0.68]}>
            <boxGeometry args={[0.22, 0.22, 0.18]} />
            <meshStandardMaterial color="#1c1917" roughness={0.8} />
          </mesh>
          {/* Ears */}
          <mesh position={[-0.09, 1.05, -0.28]} rotation={[0.2, 0, -0.2]}>
            <coneGeometry args={[0.05, 0.16, 4]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.09, 1.05, -0.28]} rotation={[0.2, 0, 0.2]}>
            <coneGeometry args={[0.05, 0.16, 4]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>

        {/* Tail */}
        <group ref={tailGroup} position={[0, 1.35, 0.65]}>
          <mesh position={[0, -0.35, 0.15]} rotation={[0.4, 0, 0]} castShadow={castShadow}>
            <cylinderGeometry args={[0.08, 0.03, 0.8, 6]} />
            <meshStandardMaterial color="#1c1917" roughness={0.9} />
          </mesh>
        </group>

        {/* 4 Articulated Legs */}
        <group ref={frontLeftLeg} position={[-0.24, 1.05, -0.4]}>
          <Leg length={0.95} color={color} castShadow={castShadow} />
        </group>
        <group ref={frontRightLeg} position={[0.24, 1.05, -0.4]}>
          <Leg length={0.95} color={color} castShadow={castShadow} />
        </group>
        <group ref={backLeftLeg} position={[-0.24, 1.05, 0.4]}>
          <Leg length={0.95} color={color} castShadow={castShadow} />
        </group>
        <group ref={backRightLeg} position={[0.24, 1.05, 0.4]}>
          <Leg length={0.95} color={color} castShadow={castShadow} />
        </group>
      </group>
    );
  },
);

function Leg({
  length,
  color,
  castShadow,
}: {
  length: number;
  color: string;
  castShadow: boolean;
}) {
  return (
    <group>
      {/* Upper Leg */}
      <mesh position={[0, -length * 0.3, 0]} castShadow={castShadow}>
        <cylinderGeometry args={[0.09, 0.07, length * 0.55, 6]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      {/* Lower Leg */}
      <mesh position={[0, -length * 0.72, 0]} castShadow={castShadow}>
        <cylinderGeometry args={[0.065, 0.05, length * 0.5, 6]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      {/* Hoof */}
      <mesh position={[0, -length + 0.04, -0.02]} castShadow={castShadow}>
        <boxGeometry args={[0.13, 0.08, 0.16]} />
        <meshStandardMaterial color="#1c1917" roughness={0.9} />
      </mesh>
    </group>
  );
}
