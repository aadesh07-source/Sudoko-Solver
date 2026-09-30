import React, { Component, useState, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { BoardScene } from '../three/BoardScene';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('3D Stage ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

const StageFallback: React.FC = () => (
  <div className="stage-fallback">
    <p style={{ fontWeight: 600, marginBottom: '8px' }}>3D view unavailable.</p>
    <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
      Your browser or environment does not support WebGL. The 2D grid on the left remains fully functional.
    </p>
  </div>
);

export const Stage: React.FC = () => {
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());
  }, []);

  if (!hasWebGL) {
    return (
      <div className="stage-panel" aria-hidden="true">
        <StageFallback />
      </div>
    );
  }

  return (
    <section className="stage-panel" aria-hidden="true">
      <ErrorBoundary fallback={<StageFallback />}>
        <div className="stage-canvas-container">
          <Canvas
            frameloop="demand"
            dpr={[1, 2]}
            shadows
            camera={{ position: [0, -11, 13], fov: 32 }}
            gl={{ antialias: true, alpha: true }}
          >
            <BoardScene />
          </Canvas>
        </div>
        <div className="stage-overlay-hint">Drag to rotate · Scroll to zoom</div>
      </ErrorBoundary>
    </section>
  );
};

export default Stage;
