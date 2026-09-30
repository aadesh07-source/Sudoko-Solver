import React, { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export const CameraRig: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      minPolarAngle={Math.PI * 0.15} // ~27 degrees
      maxPolarAngle={Math.PI * 0.42} // ~75 degrees
      minDistance={9}
      maxDistance={24}
    />
  );
};
