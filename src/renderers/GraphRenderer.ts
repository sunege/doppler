export type GraphSeries = {
  color: string;
  points: ReadonlyArray<{ t: number; v: number }>;
};

export type GraphDrawOptions = {
  series: GraphSeries[];
  tWindow: number;
  currentTime: number;
  yMin: number;
  yMax: number;
  yLabel?: string;
  yUnit?: string;
  zeroLine?: boolean;
};

export class GraphRenderer {
  private dpr = 1;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
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

  draw(opts: GraphDrawOptions): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const w = this.cssWidth;
    const h = this.cssHeight;
    const padLeft = 44;
    const padRight = 8;
    const padTop = 8;
    const padBottom = 22;
    const plotW = Math.max(1, w - padLeft - padRight);
    const plotH = Math.max(1, h - padTop - padBottom);

    ctx.fillStyle = '#0f1430';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#08081a';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    const tMax = opts.currentTime;
    const tMin = tMax - opts.tWindow;
    const yMin = opts.yMin;
    const yMax = opts.yMax;
    const yRange = Math.max(yMax - yMin, 1e-9);

    const tToX = (t: number) =>
      padLeft + ((t - tMin) / opts.tWindow) * plotW;
    const vToY = (v: number) =>
      padTop + plotH - ((v - yMin) / yRange) * plotH;

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 5; i++) {
      const y = padTop + (i / 5) * plotH;
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
    }
    for (let i = 1; i < 6; i++) {
      const x = padLeft + (i / 6) * plotW;
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
    }
    ctx.stroke();

    if (opts.zeroLine && yMin < 0 && yMax > 0) {
      const y0 = vToY(0);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(padLeft, y0);
      ctx.lineTo(padLeft + plotW, y0);
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    for (const s of opts.series) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;
      for (const p of s.points) {
        if (p.t < tMin - 0.1) continue;
        const px = tToX(p.t);
        const py = vToY(p.v);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText(yMax.toFixed(2), padLeft - 4, padTop + 2);
    ctx.fillText(((yMax + yMin) / 2).toFixed(2), padLeft - 4, padTop + plotH / 2);
    ctx.fillText(yMin.toFixed(2), padLeft - 4, padTop + plotH - 2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `t = ${tMin.toFixed(1)}`,
      padLeft + 20,
      padTop + plotH + 4,
    );
    ctx.fillText(
      `${tMax.toFixed(1)}`,
      padLeft + plotW - 14,
      padTop + plotH + 4,
    );

    if (opts.yLabel) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(
        opts.yUnit ? `${opts.yLabel} [${opts.yUnit}]` : opts.yLabel,
        padLeft + 4,
        padTop + 4,
      );
    }
  }
}
