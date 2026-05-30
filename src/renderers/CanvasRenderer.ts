import type { SimulationCore } from '../core/SimulationCore';
import type { Probe } from '../store/useSimulationStore';

export type RenderOptions = {
  showWavefronts: boolean;
  showSourceArrow: boolean;
  showHeatmap: boolean;
  showGuide: boolean;
  probes: Probe[];
  highlightedProbeId?: string | null;
  label?: string;
  waveSpeed: number;
  vOverC: number;
  frequency: number;
};

const SIM_VIEW_WIDTH = 60;
const HEATMAP_GRID = 220;

export class CanvasRenderer {
  private dpr = 1;
  private cssWidth = 0;
  private cssHeight = 0;
  private heatmapCanvas: HTMLCanvasElement;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.heatmapCanvas = document.createElement('canvas');
    this.heatmapCanvas.width = HEATMAP_GRID;
    this.heatmapCanvas.height = HEATMAP_GRID;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  }

  screenToSim(px: number, py: number): { x: number; y: number } {
    const scale = this.cssWidth / SIM_VIEW_WIDTH;
    const cx = this.cssWidth / 2;
    const cy = this.cssHeight / 2;
    return { x: (px - cx) / scale, y: (py - cy) / scale };
  }

  simToScreen(x: number, y: number): { px: number; py: number } {
    const scale = this.cssWidth / SIM_VIEW_WIDTH;
    return {
      px: this.cssWidth / 2 + x * scale,
      py: this.cssHeight / 2 + y * scale,
    };
  }

  draw(core: SimulationCore, opts: RenderOptions): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    const scale = this.cssWidth / SIM_VIEW_WIDTH;
    const cx = this.cssWidth / 2;
    const cy = this.cssHeight / 2;
    const toScreenX = (x: number) => cx + x * scale;
    const toScreenY = (y: number) => cy + y * scale;

    if (opts.showHeatmap) {
      this.drawHeatmap(ctx, core);
    }

    this.drawGrid(ctx, scale, cx, cy);

    if (opts.showWavefronts) {
      ctx.strokeStyle = 'rgba(120, 200, 255, 0.75)';
      ctx.lineWidth = 1;
      for (const w of core.getWavefronts()) {
        const r = w.radius * scale;
        if (r <= 0) continue;
        ctx.beginPath();
        ctx.arc(toScreenX(w.x), toScreenY(w.y), r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const pos = core.getSourcePosition();
    const psx = toScreenX(pos.x);
    const psy = toScreenY(pos.y);

    if (opts.showSourceArrow) {
      const vel = core.getSourceVelocity();
      const speed = Math.hypot(vel.x, vel.y);
      if (speed > 1e-4) {
        const arrowLen = 40;
        const ux = vel.x / speed;
        const uy = vel.y / speed;
        const tipX = psx + ux * arrowLen;
        const tipY = psy + uy * arrowLen;
        ctx.strokeStyle = '#ffcc55';
        ctx.fillStyle = '#ffcc55';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        const headSize = 8;
        const leftX = tipX - ux * headSize - uy * headSize * 0.5;
        const leftY = tipY - uy * headSize + ux * headSize * 0.5;
        const rightX = tipX - ux * headSize + uy * headSize * 0.5;
        const rightY = tipY - uy * headSize - ux * headSize * 0.5;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(rightX, rightY);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (opts.showGuide) {
      this.drawWavelengthGuide(ctx, opts, psx, psy, scale);
    }

    ctx.fillStyle = '#ff5577';
    ctx.beginPath();
    ctx.arc(psx, psy, 5, 0, Math.PI * 2);
    ctx.fill();

    this.drawProbes(ctx, opts.probes, opts.highlightedProbeId, scale, cx, cy);

    if (opts.label) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(opts.label, 12, 10);
    }
  }

  private drawHeatmap(
    ctx: CanvasRenderingContext2D,
    core: SimulationCore,
  ): void {
    const hctx = this.heatmapCanvas.getContext('2d');
    if (!hctx) return;

    const viewHeight =
      (SIM_VIEW_WIDTH * this.cssHeight) / Math.max(this.cssWidth, 1);
    const halfW = SIM_VIEW_WIDTH / 2;
    const halfH = viewHeight / 2;

    const img = hctx.createImageData(HEATMAP_GRID, HEATMAP_GRID);
    const data = img.data;

    for (let yi = 0; yi < HEATMAP_GRID; yi++) {
      const sy =
        -halfH + ((yi + 0.5) / HEATMAP_GRID) * viewHeight;
      for (let xi = 0; xi < HEATMAP_GRID; xi++) {
        const sx =
          -halfW + ((xi + 0.5) / HEATMAP_GRID) * SIM_VIEW_WIDTH;
        const v = core.getWaveAt(sx, sy);
        const idx = (yi * HEATMAP_GRID + xi) * 4;
        const clamped = Math.max(-1, Math.min(1, v));
        const [r, g, b] = valueToColor(clamped);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 190;
      }
    }
    hctx.putImageData(img, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.heatmapCanvas, 0, 0, this.cssWidth, this.cssHeight);
  }

  private drawWavelengthGuide(
    ctx: CanvasRenderingContext2D,
    opts: RenderOptions,
    psx: number,
    psy: number,
    scale: number,
  ): void {
    const v = opts.vOverC * opts.waveSpeed;
    const c = opts.waveSpeed;
    const f = opts.frequency;
    if (f <= 0) return;

    const lambdaFront = (c - v) / f;
    const lambdaBack = (c + v) / f;

    ctx.font = '12px system-ui, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';

    if (v < c && lambdaFront > 0) {
      const xEnd = psx + lambdaFront * scale;
      ctx.strokeStyle = '#ff9866';
      ctx.lineWidth = 1.5;
      this.drawBracket(ctx, psx, psy - 18, xEnd, psy - 18, 6);
      ctx.fillStyle = '#ff9866';
      ctx.fillText(
        `λ前 = ${lambdaFront.toFixed(2)}`,
        (psx + xEnd) / 2,
        psy - 22,
      );
    }

    const xBackEnd = psx - lambdaBack * scale;
    ctx.strokeStyle = '#66d4ff';
    ctx.lineWidth = 1.5;
    this.drawBracket(ctx, psx, psy + 18, xBackEnd, psy + 18, -6);
    ctx.fillStyle = '#66d4ff';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `λ後 = ${lambdaBack.toFixed(2)}`,
      (psx + xBackEnd) / 2,
      psy + 22,
    );

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  private drawBracket(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    tickLen: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x1, y1 - tickLen);
    ctx.lineTo(x1, y1 + tickLen);
    ctx.moveTo(x2, y2 - tickLen);
    ctx.lineTo(x2, y2 + tickLen);
    ctx.stroke();
  }

  private drawProbes(
    ctx: CanvasRenderingContext2D,
    probes: Probe[],
    highlightedId: string | null | undefined,
    scale: number,
    cx: number,
    cy: number,
  ): void {
    probes.forEach((p, i) => {
      const px = cx + p.x * scale;
      const py = cy + p.y * scale;
      const isHighlighted = highlightedId === p.id;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = isHighlighted ? '#ffffff' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(px, py, isHighlighted ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0b1020';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, px, py + 0.5);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    });
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    scale: number,
    cx: number,
    cy: number,
  ): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const step = scale * 5;
    if (step < 8) return;

    ctx.beginPath();
    for (let x = cx % step; x < this.cssWidth; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.cssHeight);
    }
    for (let y = cy % step; y < this.cssHeight; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.cssWidth, y);
    }
    ctx.stroke();
  }
}

function valueToColor(v: number): [number, number, number] {
  const t = (v + 1) * 0.5;
  if (t < 0.5) {
    const k = t * 2;
    return [
      Math.round(20 + 50 * k),
      Math.round(60 + 110 * k),
      Math.round(180 + 75 * k),
    ];
  }
  const k = (t - 0.5) * 2;
  return [
    Math.round(70 + 185 * k),
    Math.round(170 - 60 * k),
    Math.round(255 - 200 * k),
  ];
}
