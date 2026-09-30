import { useEffect, useRef } from 'react';
import { useSudokuStore } from '../state/store';

export function usePlayback() {
  const phase = useSudokuStore((s) => s.phase);
  const speed = useSudokuStore((s) => s.speed);
  const cursor = useSudokuStore((s) => s.cursor);
  const trace = useSudokuStore((s) => s.trace);
  const applyStepsBatch = useSudokuStore((s) => s.applyStepsBatch);

  const lastTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== 'playing') {
      lastTimeRef.current = null;
      accumulatorRef.current = 0;
      return;
    }

    if (cursor >= trace.length) {
      return;
    }

    let rafId: number;

    const tick = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
      }

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1); // cap dt at 100ms
      lastTimeRef.current = now;

      accumulatorRef.current += dt * speed;

      if (accumulatorRef.current >= 1) {
        const stepsToApply = Math.floor(accumulatorRef.current);
        accumulatorRef.current -= stepsToApply;
        applyStepsBatch(stepsToApply);
      }

      // Check current state after applying batch
      const currentCursor = useSudokuStore.getState().cursor;
      const currentTrace = useSudokuStore.getState().trace;
      const currentPhase = useSudokuStore.getState().phase;

      if (currentPhase === 'playing' && currentCursor < currentTrace.length) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [phase, speed, cursor, trace.length, applyStepsBatch]);
}
