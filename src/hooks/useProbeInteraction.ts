import { useEffect, useRef, type RefObject } from 'react';
import type { CanvasRenderer } from '../renderers/CanvasRenderer';
import {
  useSimulationStore,
  type Probe,
} from '../store/useSimulationStore';

const HIT_RADIUS_PX = 14;

export function useProbeInteraction(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  rendererRef: RefObject<CanvasRenderer | null>,
  enabled: boolean,
): {
  highlightedProbeId: string | null;
} {
  const draggingIdRef = useRef<string | null>(null);
  const highlightedRef = useRef<string | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const findHit = (probes: Probe[], px: number, py: number): Probe | null => {
      const renderer = rendererRef.current;
      if (!renderer) return null;
      for (const probe of probes) {
        const { px: ppx, py: ppy } = renderer.simToScreen(probe.x, probe.y);
        if (Math.hypot(px - ppx, py - ppy) <= HIT_RADIUS_PX) return probe;
      }
      return null;
    };

    const screenPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { px: e.clientX - rect.left, py: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const { px, py } = screenPos(e);
      const { probes, addProbe } = useSimulationStore.getState();

      if (e.button === 2) {
        const hit = findHit(probes, px, py);
        if (hit) useSimulationStore.getState().removeProbe(hit.id);
        return;
      }

      if (e.button !== 0) return;

      const hit = findHit(probes, px, py);
      if (hit) {
        draggingIdRef.current = hit.id;
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      const sim = renderer.screenToSim(px, py);
      const id = addProbe(sim.x, sim.y);
      if (id) {
        draggingIdRef.current = id;
        canvas.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const { px, py } = screenPos(e);

      const draggingId = draggingIdRef.current;
      if (draggingId) {
        const sim = renderer.screenToSim(px, py);
        useSimulationStore.getState().moveProbe(draggingId, sim.x, sim.y);
        highlightedRef.current = draggingId;
        return;
      }

      const probes = useSimulationStore.getState().probes;
      const hit = findHit(probes, px, py);
      highlightedRef.current = hit?.id ?? null;
      canvas.style.cursor = hit ? 'grab' : 'crosshair';
    };

    const onPointerUp = (e: PointerEvent) => {
      if (draggingIdRef.current) {
        canvas.releasePointerCapture(e.pointerId);
        draggingIdRef.current = null;
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.style.cursor = 'crosshair';

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.style.cursor = '';
    };
  }, [enabled, canvasRef, rendererRef]);

  return {
    get highlightedProbeId() {
      return highlightedRef.current;
    },
  };
}
