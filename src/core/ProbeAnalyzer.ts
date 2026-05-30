import {
  detectRisingZeroCrossing,
  type FrequencyPoint,
  type Sample,
} from '../utils/frequency';

export class ProbeAnalyzer {
  private samples: Sample[] = [];
  private freqs: FrequencyPoint[] = [];
  private lastSample: Sample | null = null;
  private lastZeroCrossing: number | null = null;

  constructor(private readonly historySeconds = 30) {}

  addSample(t: number, v: number): void {
    const sample: Sample = { t, v };

    if (this.lastSample) {
      const tZero = detectRisingZeroCrossing(this.lastSample, sample);
      if (tZero !== null) {
        if (this.lastZeroCrossing !== null) {
          const period = tZero - this.lastZeroCrossing;
          if (period > 1e-6) {
            this.freqs.push({ t: tZero, f: 1 / period });
          }
        }
        this.lastZeroCrossing = tZero;
      }
    }

    this.samples.push(sample);
    this.lastSample = sample;

    const cutoff = t - this.historySeconds;
    while (this.samples.length > 0 && this.samples[0].t < cutoff) {
      this.samples.shift();
    }
    while (this.freqs.length > 0 && this.freqs[0].t < cutoff) {
      this.freqs.shift();
    }
  }

  getSamples(): readonly Sample[] {
    return this.samples;
  }

  getFrequencies(): readonly FrequencyPoint[] {
    return this.freqs;
  }

  getLatestFrequency(): number | null {
    if (this.freqs.length === 0) return null;
    return this.freqs[this.freqs.length - 1].f;
  }

  reset(): void {
    this.samples = [];
    this.freqs = [];
    this.lastSample = null;
    this.lastZeroCrossing = null;
  }
}
