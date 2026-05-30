import type {
  RenderedWavefront,
  SimulationParams,
  SourceState,
  Vec2,
  Wavefront,
} from '../types/simulation';

type VelocitySegment = {
  startTime: number;
  startPos: Vec2;
  v: Vec2;
};

export class SimulationCore {
  t = 0;
  source: SourceState;

  private lastEmitTime = 0;
  private wavefronts: Wavefront[] = [];
  private readonly maxRadius: number;
  private readonly initialPosition: Vec2;
  private velocityHistory: VelocitySegment[] = [];

  private static readonly MAX_HISTORY = 16;

  constructor(
    private readonly params: SimulationParams,
    options: { initialPosition?: Vec2; maxRadius?: number } = {},
  ) {
    this.initialPosition = options.initialPosition ?? { x: 0, y: 0 };
    const initialV = this.params.getVelocity();
    this.source = {
      position: { ...this.initialPosition },
      velocity: { ...initialV },
    };
    this.maxRadius = options.maxRadius ?? 100;
    this.velocityHistory = [
      {
        startTime: 0,
        startPos: { ...this.initialPosition },
        v: { ...initialV },
      },
    ];
    this.emit();
  }

  update(dt: number): void {
    if (dt <= 0) return;

    this.t += dt;

    const newV = this.params.getVelocity();
    const last = this.velocityHistory[this.velocityHistory.length - 1];
    const velDiff = Math.hypot(newV.x - last.v.x, newV.y - last.v.y);
    const timeSinceLast = this.t - last.startTime;

    if (velDiff > 0.05 || (velDiff > 5e-3 && timeSinceLast > 0.1)) {
      this.velocityHistory.push({
        startTime: this.t,
        startPos: { ...this.source.position },
        v: { ...newV },
      });
      while (this.velocityHistory.length > SimulationCore.MAX_HISTORY) {
        this.velocityHistory.shift();
      }
    }

    this.source.velocity = newV;
    this.source.position = {
      x: this.source.position.x + newV.x * dt,
      y: this.source.position.y + newV.y * dt,
    };

    const frequency = Math.max(this.params.getFrequency(), 1e-6);
    const period = 1 / frequency;
    while (this.t - this.lastEmitTime >= period) {
      this.lastEmitTime += period;
      this.emit();
    }

    const c = this.params.c;
    this.wavefronts = this.wavefronts.filter(
      (w) => c * (this.t - w.emitTime) <= this.maxRadius,
    );

    const ageCutoff = this.t - (this.maxRadius / c) * 1.1;
    while (
      this.velocityHistory.length > 1 &&
      this.velocityHistory[1].startTime < ageCutoff
    ) {
      this.velocityHistory.shift();
    }
  }

  getWavefronts(): RenderedWavefront[] {
    const c = this.params.c;
    return this.wavefronts.map((w) => ({
      x: w.emitX,
      y: w.emitY,
      radius: c * (this.t - w.emitTime),
    }));
  }

  getSourcePosition(): Vec2 {
    return { ...this.source.position };
  }

  getSourceVelocity(): Vec2 {
    return { ...this.source.velocity };
  }

  getTime(): number {
    return this.t;
  }

  getWaveAt(x: number, y: number): number {
    const c = this.params.c;
    const f = this.params.getFrequency();
    const twoPiF = 2 * Math.PI * f;
    const t = this.t;
    const c2 = c * c;
    const EPS = 1e-9;

    let sum = 0;
    let count = 0;

    for (let i = this.velocityHistory.length - 1; i >= 0; i--) {
      const seg = this.velocityHistory[i];
      const segEnd =
        i + 1 < this.velocityHistory.length
          ? this.velocityHistory[i + 1].startTime
          : t;

      const tSinceStart = t - seg.startTime;
      const vx = seg.v.x;
      const vy = seg.v.y;
      const ax = x - seg.startPos.x - vx * tSinceStart;
      const ay = y - seg.startPos.y - vy * tSinceStart;

      const v2 = vx * vx + vy * vy;
      const denom = c2 - v2;
      const S = ax * vx + ay * vy;
      const R = ax * ax + ay * ay;

      const tryT = (T: number) => {
        if (T < 0 || T > t) return;
        const tPrime = t - T;
        if (tPrime < seg.startTime - EPS || tPrime > segEnd + EPS) return;
        sum += Math.sin(twoPiF * tPrime);
        count++;
      };

      if (Math.abs(denom) < EPS) {
        if (Math.abs(S) > EPS) tryT(-R / (2 * S));
        continue;
      }

      const discr = S * S + denom * R;
      if (discr < 0) continue;
      const sqrtDiscr = Math.sqrt(discr);

      if (denom > 0) {
        tryT((S + sqrtDiscr) / denom);
      } else {
        tryT((S + sqrtDiscr) / denom);
        tryT((S - sqrtDiscr) / denom);
      }
    }

    return count > 0 ? sum / count : 0;
  }

  reset(initialPosition?: Vec2): void {
    this.t = 0;
    this.lastEmitTime = 0;
    this.wavefronts = [];
    const startPos = { ...(initialPosition ?? this.initialPosition) };
    const initialV = this.params.getVelocity();
    this.source = {
      position: startPos,
      velocity: { ...initialV },
    };
    this.velocityHistory = [
      {
        startTime: 0,
        startPos: { ...startPos },
        v: { ...initialV },
      },
    ];
    this.emit();
  }

  private emit(): void {
    this.wavefronts.push({
      emitX: this.source.position.x,
      emitY: this.source.position.y,
      emitTime: this.lastEmitTime,
    });
  }
}
