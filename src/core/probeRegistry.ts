import { ProbeAnalyzer } from './ProbeAnalyzer';

const analyzers = new Map<string, ProbeAnalyzer>();

export function getOrCreateAnalyzer(id: string): ProbeAnalyzer {
  let a = analyzers.get(id);
  if (!a) {
    a = new ProbeAnalyzer();
    analyzers.set(id, a);
  }
  return a;
}

export function removeAnalyzer(id: string): void {
  analyzers.delete(id);
}

export function resetAllAnalyzers(): void {
  for (const a of analyzers.values()) a.reset();
}

export function getAnalyzers(): ReadonlyMap<string, ProbeAnalyzer> {
  return analyzers;
}
