import { PRESETS, useSimulationStore } from '../store/useSimulationStore';

export function PresetButtons() {
  const vOverC = useSimulationStore((s) => s.vOverC);
  const applyPreset = useSimulationStore((s) => s.applyPreset);

  return (
    <div className="preset-buttons">
      <span className="preset-label">プリセット:</span>
      {PRESETS.map((p) => {
        const active = Math.abs(p.vOverC - vOverC) < 1e-3;
        return (
          <button
            key={p.name}
            className={active ? 'preset active' : 'preset'}
            onClick={() => applyPreset(p)}
            title={p.description}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
