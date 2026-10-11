import {useFrame} from '@react-three/fiber';
import React, {forwardRef, useRef} from 'react';
import * as THREE from 'three';

const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];

export interface HumanoidCharacterProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  state?: 'idle' | 'walk' | 'run' | 'action';
  toolType?: 'none' | 'pickaxe' | 'sword';
  skinColor?: string;
  clothesColor?: string;
  pantsColor?: string;
  castShadow?: boolean;
}

export const HumanoidCharacter = forwardRef<
  THREE.Group,
  HumanoidCharacterProps
>(function HumanoidCharacter(
  {
    position = DEFAULT_POSITION,
    rotation = DEFAULT_ROTATION,
    state = 'idle',
    toolType = 'none',
    skinColor = '#fcd5b5',
    clothesColor = '#3b82f6',
    pantsColor = '#1e3a8a',
    castShadow = true,
  }: HumanoidCharacterProps,
  ref,
) {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const isKnight = toolType === 'sword';

  useFrame(({clock}) => {
    const t = clock.getElapsedTime();
    const speed = state === 'run' ? 14 : 7.5;
    const isAction = state === 'action';
    const intensity = state === 'run' ? 0.75 : state === 'walk' ? 0.4 : 0.05;

    if (
      leftLeg.current &&
      rightLeg.current &&
      leftArm.current &&
      rightArm.current
    ) {
      leftLeg.current.rotation.x = Math.sin(t * speed) * intensity;
      rightLeg.current.rotation.x = Math.sin(t * speed + Math.PI) * intensity;

      if (!isAction) {
        leftArm.current.rotation.x = Math.sin(t * speed + Math.PI) * intensity;
        rightArm.current.rotation.x = Math.sin(t * speed) * intensity;
      } else {
        rightArm.current.rotation.x = -Math.abs(Math.sin(t * 12)) * 1.5;
        leftArm.current.rotation.x = 0;
      }

      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * 1.8) * 0.15;
      }
    }
  });

  return (
    <group ref={ref} position={position} rotation={rotation}>
      {/* Head & Facial Hair/Helmet */}
      <group ref={headRef} position={[0, 1.8, 0]}>
        {/* Head Base */}
        <mesh castShadow={castShadow}>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial
            color={isKnight ? '#94a3b8' : skinColor}
            roughness={isKnight ? 0.3 : 0.65}
            metalness={isKnight ? 0.8 : 0.05}
          />
        </mesh>

        {/* Eyes */}
        {!isKnight && (
          <>
            <mesh position={[-0.07, 0.04, -0.21]}>
              <sphereGeometry args={[0.035, 6, 6]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.07, 0.04, -0.21]}>
              <sphereGeometry args={[0.035, 6, 6]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          </>
        )}

        {/* Knight Helmet Plume / Crest */}
        {isKnight ? (
          <>
            <mesh position={[0, 0.22, 0]} castShadow>
              <boxGeometry args={[0.06, 0.28, 0.4]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.02, -0.22]}>
              <boxGeometry args={[0.22, 0.06, 0.05]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} />
            </mesh>
            {/* Forged nose guard improves knight recognition at near camera distances. */}
            <mesh position={[0, -0.065, -0.237]}>
              <boxGeometry args={[0.055, 0.20, 0.06]}/>
              <meshStandardMaterial color="#77838d" metalness={0.78} roughness={0.34}/>
            </mesh>
          </>
        ) : (
          <>
          {/* Peasant Hat / Cap */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <coneGeometry args={[0.3, 0.22, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.115, 0]} castShadow>
            <cylinderGeometry args={[0.32,0.30,0.045,10]}/>
            <meshStandardMaterial color="#68452e" roughness={.93}/>
          </mesh>
          </>
        )}
      </group>

      {/* Torso & Tunic */}
      <group position={[0, 1.15, 0]}>
        <mesh castShadow={castShadow}>
          <cylinderGeometry args={[0.24, 0.2, 0.72, 8]} />
          <meshStandardMaterial
            color={clothesColor}
            roughness={isKnight ? 0.35 : 0.75}
            metalness={isKnight ? 0.75 : 0.05}
          />
        </mesh>
        {/* Tunic / chainmail hem is part of the body rather than the walk cycle. */}
        <mesh position={[0, -.39, 0]} castShadow={castShadow}>
          <cylinderGeometry args={[.19,.29,.26,8]}/>
          <meshStandardMaterial color={isKnight?'#5f6872':clothesColor}
            roughness={isKnight?.64:.89} metalness={isKnight?.52:.03}/>
        </mesh>
        {/* Belt */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.1, 8]} />
          <meshStandardMaterial color="#451a03" roughness={0.8} />
        </mesh>
        {/* Belt Buckle */}
        <mesh position={[0, -0.2, -0.24]}>
          <boxGeometry args={[0.08, 0.08, 0.04]} />
          <meshStandardMaterial color="#facc15" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Knight Pauldrons */}
        {isKnight && (
          <>
            <mesh position={[-0.32, 0.3, 0]} castShadow>
              <sphereGeometry args={[0.13, 8, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
            </mesh>
            <mesh position={[0.32, 0.3, 0]} castShadow>
              <sphereGeometry args={[0.13, 8, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.3} />
            </mesh>
          </>
        )}
      </group>

      {/* Arms */}
      <group ref={leftArm} position={[-0.34, 1.42, 0]}>
        <Limb
          color={isKnight ? '#64748b' : skinColor}
          isKnight={isKnight}
          castShadow={castShadow}
        />
        {/* Knight Shield */}
        {isKnight && (
          <group position={[-0.08, -0.3, -0.15]} rotation={[0, 0.3, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.36, 0.52, 0.06]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, -0.04]}>
              <boxGeometry args={[0.3, 0.44, 0.02]} />
              <meshStandardMaterial color="#facc15" metalness={0.6} />
            </mesh>
          </group>
        )}
      </group>

      <group ref={rightArm} position={[0.34, 1.42, 0]}>
        <Limb
          color={isKnight ? '#64748b' : skinColor}
          hasTool={toolType !== 'none'}
          toolType={toolType}
          isKnight={isKnight}
          castShadow={castShadow}
        />
      </group>

      {/* Legs */}
      <group ref={leftLeg} position={[-0.14, 0.72, 0]}>
        <Limb color={pantsColor} isLeg castShadow={castShadow} />
      </group>
      <group ref={rightLeg} position={[0.14, 0.72, 0]}>
        <Limb color={pantsColor} isLeg castShadow={castShadow} />
      </group>
    </group>
  );
});

function Limb({
  color,
  hasTool,
  toolType,
  isLeg,
  isKnight,
  castShadow,
}: {
  color: string;
  hasTool?: boolean;
  toolType?: string;
  isLeg?: boolean;
  isKnight?: boolean;
  castShadow: boolean;
}) {
  return (
    <group>
      <mesh position={[0, -0.35, 0]} castShadow={castShadow}>
        <cylinderGeometry args={[0.075, 0.065, 0.7, 6]} />
        <meshStandardMaterial
          color={color}
          roughness={isKnight ? 0.35 : 0.7}
          metalness={isKnight ? 0.75 : 0.05}
        />
      </mesh>
      {isLeg && (
        <mesh position={[0, -0.68, -0.08]} castShadow={castShadow}>
          <boxGeometry args={[0.16, 0.12, 0.3]} />
          <meshStandardMaterial color="#1c1917" roughness={0.8} />
        </mesh>
      )}
      {hasTool && toolType === 'sword' && (
        <group position={[0, -0.7, -0.25]} rotation={[Math.PI / 2.3, 0, 0]}>
          {/* Blade */}
          <mesh castShadow={castShadow}>
            <boxGeometry args={[0.05, 0.85, 0.02]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Crossguard */}
          <mesh position={[0, -0.32, 0]}>
            <boxGeometry args={[0.22, 0.05, 0.05]} />
            <meshStandardMaterial color="#facc15" metalness={0.8} />
          </mesh>
          {/* Pommel */}
          <mesh position={[0, -0.48, 0]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial color="#facc15" metalness={0.8} />
          </mesh>
        </group>
      )}
      {hasTool && toolType === 'pickaxe' && (
        <group position={[0, -0.7, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow={castShadow}>
            <cylinderGeometry args={[0.025, 0.025, 0.8, 6]} />
            <meshStandardMaterial color="#8B5A2B" roughness={0.9} />
          </mesh>
          <mesh
            position={[0, 0.3, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow={castShadow}>
            <boxGeometry args={[0.06, 0.5, 0.06]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
}
