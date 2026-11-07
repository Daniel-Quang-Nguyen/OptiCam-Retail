export type ViewMode = 'dori' | 'risk' | 'off';
export type Tool = 'select' | 'measure' | 'person';
export type Selection = { kind: 'cam' | 'obs' | 'person'; id: string } | null;
export type Segment = { a: [number, number]; b: [number, number] } | null; // mét

export const PAD = 24;      // lề Stage (px)
export const HANDLE = 40;   // khoảng cách tay cầm xoay (px)
export const DORI_COLOR: Record<string, string> = {
  identification: 'rgba(22,163,74,.55)', recognition: 'rgba(132,204,22,.5)', observation: 'rgba(250,204,21,.45)',
  detection: 'rgba(249,115,22,.45)', blind: 'rgba(220,38,38,.38)'
};
export const RISK_COLOR = { red: 'rgba(239,68,68,.5)', yellow: 'rgba(245,158,11,.45)', green: 'rgba(59,130,246,.16)' } as const;
const RISK_STOPS = [
  { weight: 1, color: [37, 99, 235, 0.42] },
  { weight: 2, color: [20, 184, 166, 0.52] },
  { weight: 3, color: [250, 204, 21, 0.62] },
  { weight: 4, color: [249, 115, 22, 0.68] },
  { weight: 5, color: [220, 38, 38, 0.74] }
] as const;

export function riskColor(weight: number): string {
  const w = Math.max(1, Math.min(5, weight));
  const upperIndex = RISK_STOPS.findIndex((stop) => stop.weight >= w);
  const upper = RISK_STOPS[Math.max(1, upperIndex)];
  const lower = RISK_STOPS[Math.max(0, upperIndex - 1)];
  const t = (w - lower.weight) / (upper.weight - lower.weight);
  const channels = lower.color.map((channel, index) => channel + (upper.color[index] - channel) * t);
  const [red, green, blue, alpha] = channels;
  return `rgba(${Math.round(red)},${Math.round(green)},${Math.round(blue)},${alpha.toFixed(3)})`;
}
export const OBS_FILL = { pos: '#dc2626', entrance: '#2563eb', shelf: '#475569' } as const;

/** Gộp cập nhật state theo requestAnimationFrame khi kéo thả (giữ 60 FPS khi nhiều camera). */
let raf = 0;
export const scheduleFrame = (fn: () => void) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fn); };
