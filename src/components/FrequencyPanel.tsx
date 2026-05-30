import { useEffect, useRef } from 'react';
import { GraphRenderer, type GraphSeries } from '../renderers/GraphRenderer';
import { useAnimationLoop } from '../hooks/useAnimationLoop';
import { getOrCreateAnalyzer } from '../core/probeRegistry';
import { useSimulationStore } from '../store/useSimulationStore';

const TIME_WINDOW = 10;

export function FrequencyPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const lastTimeRef = useRef(0);

  const playing = useSimulationStore((s) => s.playing);
  const probes = useSimulationStore((s) => s.probes);
  const frequency = useSimulationStore((s) => s.frequency);
  const resetToken = useSimulationStore((s) => s.resetToken);

  const buildOpts = () => {
    const yMax = Math.max(frequency * 3, 1.5);
    return {
      series: probes.map<GraphSeries>((p) => ({
        color: p.color,
        points: getOrCreateAnalyzer(p.id)
          .getFrequencies()
          .map((fp) => ({ t: fp.t, v: fp.f })),
      })),
      tWindow: TIME_WINDOW,
      currentTime: lastTimeRef.current,
      yMin: 0,
      yMax,
      yLabel: '推定周波数',
      yUnit: 'Hz',
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new GraphRenderer(canvas);
    rendererRef.current = renderer;
    const observer = new ResizeObserver(() => {
      renderer.resize();
      renderer.draw(buildOpts());
    });
    observer.observe(canvas);
    renderer.draw(buildOpts());
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAnimationLoop(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    let maxT = lastTimeRef.current;
    for (const p of probes) {
      const samples = getOrCreateAnalyzer(p.id).getSamples();
      if (samples.length > 0) {
        const last = samples[samples.length - 1].t;
        if (last > maxT) maxT = last;
      }
    }
    lastTimeRef.current = maxT;
    renderer.draw(buildOpts());
  }, playing);

  useEffect(() => {
    if (playing) return;
    rendererRef.current?.draw(buildOpts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, probes, frequency, resetToken]);

  useEffect(() => {
    lastTimeRef.current = 0;
  }, [resetToken]);

  const latest = probes.map((p) => ({
    probe: p,
    f: getOrCreateAnalyzer(p.id).getLatestFrequency(),
  }));

  return (
    <div className="panel">
      <div className="panel-header">周波数（ゼロクロス推定）</div>
      <div className="panel-canvas-wrap">
        <canvas ref={canvasRef} className="panel-canvas" />
      </div>
      <div className="freq-readout">
        <span className="freq-readout-source">
          発信 f<sub>0</sub> = {frequency.toFixed(2)}
        </span>
        {latest.map(({ probe, f }, i) => (
          <span key={probe.id} style={{ color: probe.color }}>
            ⬤ P{i + 1}: {f !== null ? f.toFixed(2) : '—'}
          </span>
        ))}
      </div>
    </div>
  );
}
