import React, { Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { BoardEditor } from './components/BoardEditor';
import { Controls } from './components/Controls';
import { StatusLine } from './components/StatusLine';
import { MetricsPanel } from './components/MetricsPanel';
import { Footer } from './components/Footer';
import { usePlayback } from './playback/usePlayback';

const Stage = lazy(() => import('./components/Stage'));

export const App: React.FC = () => {
  // Drives requestAnimationFrame playback when phase is 'playing'
  usePlayback();

  return (
    <div className="app-container">
      <Header />

      <main className="workspace-grid">
        <div className="editor-panel">
          <BoardEditor />
          <Controls />
          <StatusLine />
        </div>

        <Suspense
          fallback={
            <div className="stage-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontWeight: 600, opacity: 0.6 }}>Loading 3D Canvas...</span>
            </div>
          }
        >
          <Stage />
        </Suspense>
      </main>

      <MetricsPanel />

      <Footer />
    </div>
  );
};

export default App;
