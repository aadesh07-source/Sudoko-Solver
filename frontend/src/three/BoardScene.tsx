import React from 'react';
import * as THREE from 'three';
import { ContactShadows } from '@react-three/drei';
import { Tiles, getCellPosition } from './Tiles';
import { Digits } from './Digits';
import { CameraRig } from './CameraRig';
import { PALETTE } from './palette';
import { useSudokuStore } from '../state/store';

const TILE_DEPTH = 0.22;

const SelectionIndicator: React.FC = () => {
  const selected = useSudokuStore((s) => s.selected);
  const givens = useSudokuStore((s) => s.givens);
  const grid = useSudokuStore((s) => s.grid);

  if (!selected) return null;
  const [r, c] = selected;
  const [posX, posY] = getCellPosition(r, c);
  const isGiven = givens[r][c] !== 0;
  const hasVal = grid[r][c] !== 0;
  const targetZ = isGiven ? 0.10 : hasVal ? 0.26 : 0;
  const z = TILE_DEPTH + targetZ + 0.005;

  return (
    <group position={[posX, posY, z]}>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.95, 0.95, 0.01)]} />
        <lineBasicMaterial color={PALETTE.sun} linewidth={2} />
      </lineSegments>
    </group>
  );
};

export const BoardScene: React.FC = () => {
  return (
    <>
      <CameraRig />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[-6, -8, 12]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />

      {/* Group centered at origin */}
      <group position={[0, 0, 0]}>
        {/* Base Slab */}
        <mesh position={[0, 0, -0.1]} receiveShadow>
          <boxGeometry args={[10.0, 10.0, 0.2]} />
          <meshStandardMaterial color={PALETTE.baseSlab} roughness={0.7} />
        </mesh>

        {/* 81 Instanced Tiles */}
        <Tiles />

        {/* 3D Digits */}
        <Digits />

        {/* Selection Indicator */}
        <SelectionIndicator />

        {/* Contact Shadow under the board */}
        <ContactShadows
          position={[0, 0, -0.21]}
          opacity={0.45}
          scale={13}
          blur={1.8}
          far={5}
        />
      </group>
    </>
  );
};
