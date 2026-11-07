export type ObsType = 'shelf' | 'pos' | 'entrance';
export type Weight = number;
export type Dori = 'identification' | 'recognition' | 'observation' | 'detection' | 'blind';
export const PERSON_TARGETS = [
  { height: 1.6, label: 'Mặt' },
  { height: 1.2, label: 'Ngực' },
  { height: 0.9, label: 'Thắt lưng' }
] as const;
export type TargetHeight = typeof PERSON_TARGETS[number]['height'];

/** Toạ độ & kích thước tính bằng MÉT. (x, y) = góc trái-trên của hình chữ nhật CHƯA xoay; angle xoay quanh tâm. */
export interface Obstacle {
  id: string; type: ObsType; label: string;
  x: number; y: number; w: number; h: number;
  elev: number;   // cao độ (m): kệ 1.8, POS 1.1, cửa 2.4
  angle: number;  // độ, bước 15
  riskWmax?: number;
  riskR0?: number;
  riskR?: number;
}

export interface Camera {
  id: string; x: number; y: number;
  pan: number;    // góc xoay ngang, bước Δθ = 15°
  fov: number; res: number; range: number; height: number;
  target?: string; model?: string;
}

export interface Person {
  id: string;
  x: number;
  y: number;
}

export const PERSON_REGIONS = [
  { key: 'face', label: 'Mặt', height: 1.6 },
  { key: 'chest', label: 'Ngực', height: 1.2 },
  { key: 'abdomen', label: 'Bụng', height: 0.9 },
  { key: 'legs', label: 'Chân', height: 0.3 }
] as const;
export type PersonRegion = typeof PERSON_REGIONS[number];

export interface Background { dataUrl: string; widthM: number; opacity: number; visible: boolean }

export interface RiskStroke {
  x: number;
  y: number;
  radius: number;
  weight: Weight;
}

export interface Layout {
  version: string; name: string;
  widthM: number; heightM: number; gridM: number; pixelsPerMeter: number;
  targetHeight: TargetHeight;
  background?: Background;
  obstacles: Obstacle[];
  risk: Record<string, Weight>;   // Legacy per-cell overrides, key "row_col"
  riskStrokes: RiskStroke[];
  cameras: Camera[];
}

export interface Zone { r: number; c: number; cx: number; cy: number; w: Weight; solid: boolean }
export interface Cell extends Zone { ppm: number; dori: Dori }

export interface Score {
  red: number; yellow: number;   // % ô đạt chuẩn DORI của vùng
  redMinPpm: number;
  weighted: number;              // Σ W × Score_DORI
  cams: number; ms: number;
}
