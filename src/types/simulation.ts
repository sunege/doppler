export type Vec2 = { x: number; y: number };

export type Wavefront = {
  emitX: number;
  emitY: number;
  emitTime: number;
};

export type SourceState = {
  position: Vec2;
  velocity: Vec2;
};

export type SimulationParams = {
  c: number;
  getVelocity: () => Vec2;
  getFrequency: () => number;
};

export type RenderedWavefront = {
  x: number;
  y: number;
  radius: number;
};
