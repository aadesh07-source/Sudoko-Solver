import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSudokuStore } from '../state/store';
import { PALETTE } from './palette';

const TILE_SIZE = 0.92;
const TILE_DEPTH = 0.22;

export function getCellPosition(r: number, c: number): [number, number] {
  const x = (c - 4) * 1.0 + (Math.floor(c / 3) - 1) * 0.18;
  const y = -((r - 4) * 1.0 + (Math.floor(r / 3) - 1) * 0.18);
  return [x, y];
}

export const Tiles: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const { invalidate } = useThree();

  const givens = useSudokuStore((s) => s.givens);
  const grid = useSudokuStore((s) => s.grid);
  const phase = useSudokuStore((s) => s.phase);
  const conflicts = useSudokuStore((s) => s.conflicts);
  const lastStep = useSudokuStore((s) => s.lastStep);
  const setSelected = useSudokuStore((s) => s.setSelected);
  const speed = useSudokuStore((s) => s.speed);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Reusable 3D objects
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const whiteColor = useMemo(() => new THREE.Color(PALETTE.surface), []);
  const inkColor = useMemo(() => new THREE.Color(PALETTE.ink), []);
  const sunColor = useMemo(() => new THREE.Color(PALETTE.sun), []);
  const coralColor = useMemo(() => new THREE.Color(PALETTE.coral), []);
  const leafColor = useMemo(() => new THREE.Color(PALETTE.leaf), []);

  // Animation states for all 81 tiles
  const currentZ = useRef<Float32Array>(new Float32Array(81));
  const targetZ = useRef<Float32Array>(new Float32Array(81));
  const currentR = useRef<Float32Array>(new Float32Array(81).fill(1));
  const currentG = useRef<Float32Array>(new Float32Array(81).fill(1));
  const currentB = useRef<Float32Array>(new Float32Array(81).fill(1));
  const targetR = useRef<Float32Array>(new Float32Array(81).fill(1));
  const targetG = useRef<Float32Array>(new Float32Array(81).fill(1));
  const targetB = useRef<Float32Array>(new Float32Array(81).fill(1));

  // Backtrack flash timer per tile
  const backtrackTimers = useRef<Float32Array>(new Float32Array(81));

  // Ripple state
  const rippleStartTime = useRef<number | null>(null);

  // Track conflict set for O(1) lookup
  const conflictSet = useMemo(() => {
    const s = new Set<string>();
    for (const [r, c] of conflicts) {
      s.add(`${r},${c}`);
    }
    return s;
  }, [conflicts]);

  // When phase becomes done, start ripple animation
  useEffect(() => {
    if (phase === 'done') {
      rippleStartTime.current = performance.now();
    } else {
      rippleStartTime.current = null;
    }
  }, [phase]);

  // Listen for backtrack step
  useEffect(() => {
    if (lastStep && lastStep[2] === 0) {
      const idx = lastStep[0] * 9 + lastStep[1];
      backtrackTimers.current[idx] = 0.25; // 250ms coral flash
    }
  }, [lastStep]);

  // Update target heights and colors based on state
  useEffect(() => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const idx = r * 9 + c;
        const isGiven = givens[r][c] !== 0;
        const val = grid[r][c];
        const isConflict = conflictSet.has(`${r},${c}`);

        let tZ = 0;
        let tCol = whiteColor;

        if (isConflict) {
          tZ = 0.02;
          tCol = coralColor;
        } else if (isGiven) {
          tZ = 0.10;
          tCol = inkColor;
        } else if (val !== 0) {
          tZ = 0.26;
          tCol = sunColor;
        } else {
          tZ = 0.0;
          tCol = whiteColor;
        }

        targetZ.current[idx] = tZ;
        targetR.current[idx] = tCol.r;
        targetG.current[idx] = tCol.g;
        targetB.current[idx] = tCol.b;
      }
    }
    invalidate();
  }, [givens, grid, conflictSet, whiteColor, inkColor, sunColor, coralColor, invalidate]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    let needsUpdate = false;
    const now = performance.now();
    // Faster lerp speed when playback speed is high
    const lerpRate = Math.min(speed > 200 ? 25 : 14, 30);
    const lerpFactor = Math.min(delta * lerpRate, 1.0);

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const idx = r * 9 + c;
        const [posX, posY] = getCellPosition(r, c);

        // Check backtrack coral flash
        if (backtrackTimers.current[idx] > 0) {
          backtrackTimers.current[idx] -= delta;
          targetR.current[idx] = coralColor.r;
          targetG.current[idx] = coralColor.g;
          targetB.current[idx] = coralColor.b;
          needsUpdate = true;
        }

        // Check ripple on completion
        let rippleOffsetZ = 0;
        if (rippleStartTime.current !== null) {
          const elapsed = (now - rippleStartTime.current) / 1000;
          const delay = (r + c) * 0.035; // 35ms per cell
          const rippleTime = elapsed - delay;

          if (rippleTime > 0 && rippleTime < 0.4) {
            // Ripple peak
            const progress = rippleTime / 0.4;
            const wave = Math.sin(progress * Math.PI);
            rippleOffsetZ = wave * 0.15;
            targetR.current[idx] = leafColor.r;
            targetG.current[idx] = leafColor.g;
            targetB.current[idx] = leafColor.b;
            needsUpdate = true;
          } else if (rippleTime >= 0.4 && grid[r][c] !== 0 && givens[r][c] === 0) {
            // Settle back to sun color
            targetR.current[idx] = sunColor.r;
            targetG.current[idx] = sunColor.g;
            targetB.current[idx] = sunColor.b;
          }
        }

        // Ease heights
        const desiredZ = targetZ.current[idx] + rippleOffsetZ;
        const diffZ = desiredZ - currentZ.current[idx];
        if (Math.abs(diffZ) > 0.001) {
          currentZ.current[idx] += diffZ * lerpFactor;
          needsUpdate = true;
        } else {
          currentZ.current[idx] = desiredZ;
        }

        // Ease colors
        const diffR = targetR.current[idx] - currentR.current[idx];
        const diffG = targetG.current[idx] - currentG.current[idx];
        const diffB = targetB.current[idx] - currentB.current[idx];
        if (Math.abs(diffR) > 0.005 || Math.abs(diffG) > 0.005 || Math.abs(diffB) > 0.005) {
          currentR.current[idx] += diffR * lerpFactor;
          currentG.current[idx] += diffG * lerpFactor;
          currentB.current[idx] += diffB * lerpFactor;
          needsUpdate = true;
        } else {
          currentR.current[idx] = targetR.current[idx];
          currentG.current[idx] = targetG.current[idx];
          currentB.current[idx] = targetB.current[idx];
        }

        // Position tile
        const zCenter = TILE_DEPTH / 2 + currentZ.current[idx];
        dummy.position.set(posX, posY, zCenter);

        // Highlight hover with subtle brightness boost
        const isHovered = hoveredIdx === idx;

        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx, dummy.matrix);

        // Apply color
        tempColor.setRGB(currentR.current[idx], currentG.current[idx], currentB.current[idx]);
        if (isHovered) {
          tempColor.offsetHSL(0, 0, 0.08);
        }
        meshRef.current.setColorAt(idx, tempColor);
      }
    }

    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    if (needsUpdate) {
      invalidate();
    }
  });

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (typeof e.instanceId === 'number' && e.instanceId >= 0 && e.instanceId < 81) {
      setHoveredIdx(e.instanceId);
      invalidate();
    }
  };

  const handlePointerOut = () => {
    setHoveredIdx(null);
    invalidate();
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (typeof e.instanceId === 'number' && e.instanceId >= 0 && e.instanceId < 81) {
      const r = Math.floor(e.instanceId / 9);
      const c = e.instanceId % 9;
      setSelected([r, c]);
    }
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 81]}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[TILE_SIZE, TILE_SIZE, TILE_DEPTH]} />
      <meshStandardMaterial roughness={0.35} metalness={0.05} />
    </instancedMesh>
  );
};
