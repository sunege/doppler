import { useEffect, useRef } from 'react';
import { SimulationCore } from '../core/SimulationCore';
import { ThreeRenderer } from '../renderers/ThreeRenderer';
import { useAnimationLoop } from '../hooks/useAnimationLoop';
import {
  useSimulationStore,
  WAVE_SPEED,
} from '../store/useSimulationStore';

type Props = {
  initialX?: number;
};

export function Simulation3DCanvas({ initialX = -15 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coreRef = useRef<SimulationCore | null>(null);
  const rendererRef = useRef<ThreeRenderer | null>(null);

  const playing = useSimulationStore((s) => s.playing);
  const showWavefronts = useSimulationStore((s) => s.showWavefronts);
  const showSourceArrow = useSimulationStore((s) => s.showSourceArrow);
  const showMachCone = useSimulationStore((s) => s.showMachCone);
  const wavefrontMaxAge = useSimulationStore((s) => s.wavefrontMaxAge);
  const vOverC = useSimulationStore((s) => s.vOverC);
  const resetToken = useSimulationStore((s) => s.resetToken);

  if (coreRef.current === null) {
    coreRef.current = new SimulationCore(
      {
        c: WAVE_SPEED,
        getVelocity: () => {
          const store = useSimulationStore.getState();
          return { x: store.vOverC * WAVE_SPEED, y: 0 };
        },
        getFrequency: () => useSimulationStore.getState().frequency,
      },
      { initialPosition: { x: initialX, y: 0 }, maxRadius: 55 },
    );
  }

  const drawOpts = () => ({
    showWavefronts,
    showSourceArrow,
    showMachCone,
    waveSpeed: WAVE_SPEED,
    vOverC,
    wavefrontMaxAge,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new ThreeRenderer(canvas);
    rendererRef.current = renderer;

    const observer = new ResizeObserver(() => {
      renderer.resize();
      const core = coreRef.current;
      if (core) renderer.draw(core, drawOpts());
    });
    observer.observe(canvas);

    renderer.draw(coreRef.current!, drawOpts());

    return () => {
      observer.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    coreRef.current?.reset({ x: initialX, y: 0 });
    const core = coreRef.current;
    const renderer = rendererRef.current;
    if (core && renderer) renderer.draw(core, drawOpts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, initialX]);

  useAnimationLoop((dt) => {
    const core = coreRef.current;
    const renderer = rendererRef.current;
    if (!core || !renderer) return;
    if (playing) core.update(dt);
    renderer.draw(core, drawOpts());
  }, true);

  const handleResetView = () => rendererRef.current?.resetView();

  return (
    <div className="three-wrapper">
      <canvas ref={canvasRef} className="three-canvas" />
      <button className="reset-view-button" onClick={handleResetView}>
        視点リセット
      </button>
      <div className="three-hint">
        ドラッグで回転 / 右ドラッグで平行移動 / ホイールでズーム
      </div>
    </div>
  );
}
