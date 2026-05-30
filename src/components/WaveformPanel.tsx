import { useEffect, useRef } from 'react';
import { GraphRenderer, type GraphSeries } from '../renderers/GraphRenderer';
import { useAnimationLoop } from '../hooks/useAnimationLoop';
import { getOrCreateAnalyzer } from '../core/probeRegistry';
import { useSimulationStore } from '../store/useSimulationStore';

const TIME_WINDOW = 10;

export function WaveformPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const lastTimeRef = useRef(0);

  const playing = useSimulationStore((s) => s.playing);
  const probes = useSimulationStore((s) => s.probes);
  const resetToken = useSimulationStore((s) => s.resetToken);

  const buildOpts = () => ({
    series: probes.map<GraphSeries>((p) => ({
      color: p.color,
      points: getOrCreateAnalyzer(p.id).getSamples(),
    })),
    tWindow: TIME_WINDOW,
    currentTime: lastTimeRef.current,
    yMin: -1.2,
    yMax: 1.2,
    yLabel: '振幅',
    zeroLine: true,
  });

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
  }, [playing, probes, resetToken]);

  useEffect(() => {
    lastTimeRef.current = 0;
  }, [resetToken]);

  return (
    <div className="panel">
      <div className="panel-header">波形（プローブ観測）</div>
      <div className="panel-canvas-wrap">
        <canvas ref={canvasRef} className="panel-canvas" />
      </div>
      {probes.length === 0 ? (
        <div className="panel-hint">
          シミュレーション画面をクリックしてプローブを配置
        </div>
      ) : null}
    </div>
  );
}
