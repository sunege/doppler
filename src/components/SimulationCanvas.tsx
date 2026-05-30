import { useEffect, useRef } from 'react';
import { SimulationCore } from '../core/SimulationCore';
import { CanvasRenderer } from '../renderers/CanvasRenderer';
import { useAnimationLoop } from '../hooks/useAnimationLoop';
import { useProbeInteraction } from '../hooks/useProbeInteraction';
import {
  getAnalyzers,
  getOrCreateAnalyzer,
  removeAnalyzer,
  resetAllAnalyzers,
} from '../core/probeRegistry';
import {
  useSimulationStore,
  WAVE_SPEED,
} from '../store/useSimulationStore';

type Props = {
  label: string;
  vOverCOverride?: number;
  enableProbes?: boolean;
  initialX?: number;
};

export function SimulationCanvas({
  label,
  vOverCOverride,
  enableProbes = false,
  initialX = -15,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coreRef = useRef<SimulationCore | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const playing = useSimulationStore((s) => s.playing);
  const showWavefronts = useSimulationStore((s) => s.showWavefronts);
  const showSourceArrow = useSimulationStore((s) => s.showSourceArrow);
  const showHeatmap = useSimulationStore((s) => s.showHeatmap);
  const showGuide = useSimulationStore((s) => s.showGuide);
  const probes = useSimulationStore((s) => s.probes);
  const vOverC = useSimulationStore((s) => s.vOverC);
  const frequency = useSimulationStore((s) => s.frequency);
  const resetToken = useSimulationStore((s) => s.resetToken);

  const probeInteraction = useProbeInteraction(
    canvasRef,
    rendererRef,
    enableProbes,
  );

  if (coreRef.current === null) {
    coreRef.current = new SimulationCore(
      {
        c: WAVE_SPEED,
        getVelocity: () => {
          const store = useSimulationStore.getState();
          const ratio = vOverCOverride ?? store.vOverC;
          return { x: ratio * WAVE_SPEED, y: 0 };
        },
        getFrequency: () => useSimulationStore.getState().frequency,
      },
      { initialPosition: { x: initialX, y: 0 }, maxRadius: 80 },
    );
  }

  const effectiveVOverC = vOverCOverride ?? vOverC;

  const renderOpts = () => ({
    showWavefronts,
    showSourceArrow,
    showHeatmap,
    showGuide,
    probes: enableProbes ? probes : [],
    highlightedProbeId: probeInteraction.highlightedProbeId,
    label,
    waveSpeed: WAVE_SPEED,
    vOverC: effectiveVOverC,
    frequency,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;

    const observer = new ResizeObserver(() => {
      renderer.resize();
      const core = coreRef.current;
      if (core) renderer.draw(core, renderOpts());
    });
    observer.observe(canvas);

    renderer.draw(coreRef.current!, renderOpts());

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    coreRef.current?.reset({ x: initialX, y: 0 });
    if (enableProbes) resetAllAnalyzers();
    const core = coreRef.current;
    const renderer = rendererRef.current;
    if (core && renderer) renderer.draw(core, renderOpts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, initialX, enableProbes]);

  useEffect(() => {
    if (!enableProbes) return;
    const currentIds = new Set(probes.map((p) => p.id));
    for (const id of Array.from(getAnalyzers().keys())) {
      if (!currentIds.has(id)) removeAnalyzer(id);
    }
  }, [probes, enableProbes]);

  useAnimationLoop((dt) => {
    const core = coreRef.current;
    const renderer = rendererRef.current;
    if (!core || !renderer) return;
    core.update(dt);

    if (enableProbes) {
      const t = core.getTime();
      for (const probe of probes) {
        const v = core.getWaveAt(probe.x, probe.y);
        getOrCreateAnalyzer(probe.id).addSample(t, v);
      }
    }

    renderer.draw(core, renderOpts());
  }, playing);

  useEffect(() => {
    if (playing) return;
    const core = coreRef.current;
    const renderer = rendererRef.current;
    if (core && renderer) renderer.draw(core, renderOpts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    playing,
    showWavefronts,
    showSourceArrow,
    showHeatmap,
    showGuide,
    probes,
    effectiveVOverC,
    frequency,
    label,
  ]);

  return <canvas ref={canvasRef} className="sim-canvas" />;
}
