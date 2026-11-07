import type { Weight } from '../../types';

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
export const RISK_COLOR: Record<Weight, string> = { 5: 'rgba(239,68,68,.5)', 3: 'rgba(245,158,11,.45)', 1: 'rgba(59,130,246,.16)' };
export const OBS_FILL = { pos: '#dc2626', entrance: '#2563eb', shelf: '#475569' } as const;

/** Gộp cập nhật state theo requestAnimationFrame khi kéo thả (giữ 60 FPS khi nhiều camera). */
let raf = 0;
export const scheduleFrame = (fn: () => void) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fn); };
