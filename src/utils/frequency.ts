export type Sample = { t: number; v: number };
export type FrequencyPoint = { t: number; f: number };

export function interpolateZeroCrossing(a: Sample, b: Sample): number {
  const denom = b.v - a.v;
  if (Math.abs(denom) < 1e-12) return b.t;
  const frac = -a.v / denom;
  return a.t + frac * (b.t - a.t);
}

export function detectRisingZeroCrossing(
  prev: Sample,
  curr: Sample,
): number | null {
  if (prev.v < 0 && curr.v >= 0) {
    return interpolateZeroCrossing(prev, curr);
  }
  return null;
}
