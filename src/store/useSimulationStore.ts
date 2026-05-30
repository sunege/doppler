import { create } from 'zustand';

export const WAVE_SPEED = 1.0;
export const MAX_PROBES = 4;

const PROBE_COLORS = ['#ffd66e', '#84e7c4', '#f08aa6', '#c39cff'];

export type Probe = {
  id: string;
  x: number;
  y: number;
  color: string;
};

export type Preset = {
  name: string;
  vOverC: number;
  description: string;
};

export const PRESETS: Preset[] = [
  { name: '静止', vOverC: 0, description: 'v/c = 0' },
  { name: '低速', vOverC: 0.3, description: 'v/c = 0.3' },
  { name: '音速近傍', vOverC: 0.9, description: 'v/c = 0.9' },
  { name: '超音速', vOverC: 1.2, description: 'v/c = 1.2' },
];

export type ViewMode = '2d' | '3d';

export type SimulationState = {
  viewMode: ViewMode;
  playing: boolean;
  vOverC: number;
  frequency: number;
  comparisonMode: boolean;
  showWavefronts: boolean;
  showSourceArrow: boolean;
  showHeatmap: boolean;
  showGuide: boolean;
  showExplanation: boolean;
  showWaveform: boolean;
  showFrequency: boolean;
  showMachCone: boolean;
  wavefrontMaxAge: number;
  probes: Probe[];
  resetToken: number;

  setViewMode: (m: ViewMode) => void;
  togglePlay: () => void;
  setVOverC: (v: number) => void;
  setFrequency: (f: number) => void;
  toggleComparison: () => void;
  toggleShowWavefronts: () => void;
  toggleShowSourceArrow: () => void;
  toggleShowHeatmap: () => void;
  toggleShowGuide: () => void;
  toggleShowExplanation: () => void;
  toggleShowWaveform: () => void;
  toggleShowFrequency: () => void;
  toggleShowMachCone: () => void;
  setWavefrontMaxAge: (v: number) => void;
  addProbe: (x: number, y: number) => string | null;
  removeProbe: (id: string) => void;
  moveProbe: (id: string, x: number, y: number) => void;
  applyPreset: (preset: Preset) => void;
  resetSimulation: () => void;
};

let probeCounter = 0;

export const useSimulationStore = create<SimulationState>((set, get) => ({
  viewMode: '2d',
  playing: true,
  vOverC: 0.3,
  frequency: 1.0,
  comparisonMode: false,
  showWavefronts: true,
  showSourceArrow: true,
  showHeatmap: false,
  showGuide: true,
  showExplanation: true,
  showWaveform: true,
  showFrequency: true,
  showMachCone: true,
  wavefrontMaxAge: 18,
  probes: [],
  resetToken: 0,

  setViewMode: (m) => set({ viewMode: m }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setVOverC: (v) => set({ vOverC: clamp(v, 0, 1.5) }),
  setFrequency: (f) => set({ frequency: clamp(f, 0.2, 3.0) }),
  toggleComparison: () => set((s) => ({ comparisonMode: !s.comparisonMode })),
  toggleShowWavefronts: () =>
    set((s) => ({ showWavefronts: !s.showWavefronts })),
  toggleShowSourceArrow: () =>
    set((s) => ({ showSourceArrow: !s.showSourceArrow })),
  toggleShowHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  toggleShowGuide: () => set((s) => ({ showGuide: !s.showGuide })),
  toggleShowExplanation: () =>
    set((s) => ({ showExplanation: !s.showExplanation })),
  toggleShowWaveform: () => set((s) => ({ showWaveform: !s.showWaveform })),
  toggleShowFrequency: () => set((s) => ({ showFrequency: !s.showFrequency })),
  toggleShowMachCone: () => set((s) => ({ showMachCone: !s.showMachCone })),
  setWavefrontMaxAge: (v) => set({ wavefrontMaxAge: clamp(v, 3, 50) }),

  addProbe: (x, y) => {
    const { probes } = get();
    if (probes.length >= MAX_PROBES) return null;
    const used = new Set(probes.map((p) => p.color));
    const color =
      PROBE_COLORS.find((c) => !used.has(c)) ??
      PROBE_COLORS[probes.length % PROBE_COLORS.length];
    const id = `probe-${++probeCounter}`;
    set({ probes: [...probes, { id, x, y, color }] });
    return id;
  },
  removeProbe: (id) =>
    set((s) => ({ probes: s.probes.filter((p) => p.id !== id) })),
  moveProbe: (id, x, y) =>
    set((s) => ({
      probes: s.probes.map((p) => (p.id === id ? { ...p, x, y } : p)),
    })),
  applyPreset: (preset) => set({ vOverC: preset.vOverC }),
  resetSimulation: () => set((s) => ({ resetToken: s.resetToken + 1 })),
}));

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
