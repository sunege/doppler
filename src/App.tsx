import { SimulationCanvas } from './components/SimulationCanvas';
import { Simulation3DCanvas } from './components/Simulation3DCanvas';
import { ControlPanel } from './components/ControlPanel';
import { WaveformPanel } from './components/WaveformPanel';
import { FrequencyPanel } from './components/FrequencyPanel';
import { ExplanationPanel } from './components/ExplanationPanel';
import { useSimulationStore } from './store/useSimulationStore';
import './App.css';

export default function App() {
  const viewMode = useSimulationStore((s) => s.viewMode);
  const comparisonMode = useSimulationStore((s) => s.comparisonMode);
  const showWaveform = useSimulationStore((s) => s.showWaveform);
  const showFrequency = useSimulationStore((s) => s.showFrequency);
  const is3D = viewMode === '3d';
  const showGraphs = !is3D && (showWaveform || showFrequency);

  return (
    <div className="app">
      <header className="app-header">
        <h1>ドップラー効果シミュレーション</h1>
        <p className="app-subtitle">
          {is3D
            ? 'ドラッグで視点回転 / ホイールでズーム'
            : '画面をクリックでプローブ配置 / 右クリックで削除 / ドラッグで移動'}
        </p>
      </header>

      <main className={`main-area${showGraphs ? '' : ' main-area-single'}`}>
        <div className="sim-area">
          {is3D ? (
            <div className="canvas-cell single">
              <Simulation3DCanvas />
            </div>
          ) : (
            <div className="canvas-container">
              {comparisonMode && (
                <div className="canvas-cell" key="static">
                  <SimulationCanvas
                    label="静止波源 (v/c = 0)"
                    vOverCOverride={0}
                  />
                </div>
              )}
              <div className="canvas-cell" key="main">
                <SimulationCanvas
                  label={comparisonMode ? '移動波源' : '波源'}
                  enableProbes
                />
              </div>
            </div>
          )}
          <ExplanationPanel />
        </div>

        {showGraphs ? (
          <div className="graph-area">
            {showWaveform ? <WaveformPanel /> : null}
            {showFrequency ? <FrequencyPanel /> : null}
          </div>
        ) : null}
      </main>

      <footer className="app-footer">
        <ControlPanel />
      </footer>
    </div>
  );
}
