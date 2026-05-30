import { useSimulationStore } from '../store/useSimulationStore';
import { PresetButtons } from './PresetButtons';

export function ControlPanel() {
  const s = useSimulationStore();
  const is3D = s.viewMode === '3d';

  return (
    <div className="control-panel">
      <div className="control-row">
        <div className="mode-switch">
          <button
            className={s.viewMode === '2d' ? 'mode active' : 'mode'}
            onClick={() => s.setViewMode('2d')}
          >
            2D
          </button>
          <button
            className={s.viewMode === '3d' ? 'mode active' : 'mode'}
            onClick={() => s.setViewMode('3d')}
          >
            3D
          </button>
        </div>

        <button onClick={s.togglePlay} className="primary-button">
          {s.playing ? '一時停止' : '再生'}
        </button>
        <button onClick={s.resetSimulation}>リセット</button>
        <PresetButtons />
      </div>

      <div className="control-row">
        <label className="slider-label">
          <span>
            v/c = <strong>{s.vOverC.toFixed(2)}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.01}
            value={s.vOverC}
            onChange={(e) => s.setVOverC(parseFloat(e.target.value))}
          />
        </label>

        <label className="slider-label">
          <span>
            周波数 f = <strong>{s.frequency.toFixed(2)}</strong>
          </span>
          <input
            type="range"
            min={0.2}
            max={3.0}
            step={0.05}
            value={s.frequency}
            onChange={(e) => s.setFrequency(parseFloat(e.target.value))}
          />
        </label>

        {is3D ? (
          <label className="slider-label">
            <span>
              波面寿命 <strong>{s.wavefrontMaxAge.toFixed(0)} s</strong>
            </span>
            <input
              type="range"
              min={4}
              max={40}
              step={1}
              value={s.wavefrontMaxAge}
              onChange={(e) =>
                s.setWavefrontMaxAge(parseFloat(e.target.value))
              }
            />
          </label>
        ) : null}
      </div>

      <div className="control-row toggles">
        {!is3D ? (
          <label>
            <input
              type="checkbox"
              checked={s.comparisonMode}
              onChange={s.toggleComparison}
            />
            比較表示
          </label>
        ) : null}
        <label>
          <input
            type="checkbox"
            checked={s.showWavefronts}
            onChange={s.toggleShowWavefronts}
          />
          波面
        </label>
        {!is3D ? (
          <label>
            <input
              type="checkbox"
              checked={s.showHeatmap}
              onChange={s.toggleShowHeatmap}
            />
            ヒートマップ
          </label>
        ) : null}
        <label>
          <input
            type="checkbox"
            checked={s.showSourceArrow}
            onChange={s.toggleShowSourceArrow}
          />
          移動方向矢印
        </label>
        {!is3D ? (
          <label>
            <input
              type="checkbox"
              checked={s.showGuide}
              onChange={s.toggleShowGuide}
            />
            波長ガイド
          </label>
        ) : null}
        {is3D ? (
          <label>
            <input
              type="checkbox"
              checked={s.showMachCone}
              onChange={s.toggleShowMachCone}
            />
            マッハコーン
          </label>
        ) : null}
        {!is3D ? (
          <>
            <label>
              <input
                type="checkbox"
                checked={s.showWaveform}
                onChange={s.toggleShowWaveform}
              />
              波形
            </label>
            <label>
              <input
                type="checkbox"
                checked={s.showFrequency}
                onChange={s.toggleShowFrequency}
              />
              周波数
            </label>
          </>
        ) : null}
        <label>
          <input
            type="checkbox"
            checked={s.showExplanation}
            onChange={s.toggleShowExplanation}
          />
          解説
        </label>
      </div>
    </div>
  );
}
