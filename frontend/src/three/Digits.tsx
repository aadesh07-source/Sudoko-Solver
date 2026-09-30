import React from 'react';
import { Text } from '@react-three/drei';
import { useSudokuStore } from '../state/store';
import { getCellPosition } from './Tiles';
import { PALETTE } from './palette';

const TILE_DEPTH = 0.22;
const FONT_URL = '/fonts/jetbrains-mono-700.woff';

export const Digits: React.FC = () => {
  const givens = useSudokuStore((s) => s.givens);
  const grid = useSudokuStore((s) => s.grid);

  const activeDigits: Array<{
    key: string;
    digit: number;
    posX: number;
    posY: number;
    posZ: number;
    color: string;
  }> = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (val === 0) continue;

      const isGiven = givens[r][c] !== 0;
      const [posX, posY] = getCellPosition(r, c);
      const targetZ = isGiven ? 0.10 : 0.26;
      const posZ = TILE_DEPTH + targetZ + 0.02;
      const color = isGiven ? PALETTE.paper : PALETTE.ink;

      activeDigits.push({
        key: `${r}-${c}-${val}-${isGiven}`,
        digit: val,
        posX,
        posY,
        posZ,
        color,
      });
    }
  }

  return (
    <group>
      {activeDigits.map((d) => (
        <Text
          key={d.key}
          position={[d.posX, d.posY, d.posZ]}
          fontSize={0.52}
          font={FONT_URL}
          color={d.color}
          anchorX="center"
          anchorY="middle"
          renderOrder={10}
          depthOffset={-6}
        >
          {d.digit.toString()}
        </Text>
      ))}
    </group>
  );
};
