import type { Camera, Layout, Weight, Zone } from '../types';
import { snapAngle, wallAnchors } from './geometry';
import { blockerObstacles, DORI_FACTOR, doriOf, ppmAt } from './optics';

export const makeCamera = (id: string, x: number, y: number, pan: number): Camera =>
  ({ id, x, y, pan: snapAngle(pan), fov: 85, res: 2560, range: 10, height: 2.4, model: 'Dome IP 4MP (2560px, ống kính 2.8mm)' });

/** Baseline 1: 4 camera ở 4 góc tường theo thói quen thợ lắp đặt. */
export const manualFourCorners = (l: Layout): Camera[] => [
  makeCamera('CAM-01', 0, 0, 45), makeCamera('CAM-02', l.widthM, 0, 135),
  makeCamera('CAM-03', l.widthM, l.heightM, 225), makeCamera('CAM-04', 0, l.heightM, 315)
].map((c) => ({ ...c, target: 'Góc tường (đặt thủ công)' }));

const TARGET: Record<Weight, string> = { 5: 'POS & Cửa chính (Vùng Đỏ)', 3: 'Hành lang kệ (Vùng Vàng)', 1: 'Lối đi chung (Vùng Xanh)' };
const F = (p: number) => DORI_FACTOR[doriOf(p)];

export interface Candidate { cam: Camera; ppm: Float32Array }
export interface CandOpts {
  anchorStep?: number;
  angleStep?: number;
  cameraProfile?: Pick<Camera, 'fov' | 'res' | 'range' | 'height' | 'model'>;
  cameraProfiles?: Array<Pick<Camera, 'fov' | 'res' | 'range' | 'height' | 'model'>>;
}

/** Tập ứng viên (điểm neo tường × góc xoay) và PPM của từng ứng viên trên các ô sàn trống — tính 1 lần. */
export function buildCandidates(l: Layout, free: Zone[], { anchorStep = l.gridM, angleStep = 15, cameraProfile }: CandOpts = {}): Candidate[] {
  const obstacles = blockerObstacles(l), out: Candidate[] = [];
  for (const [ax, ay] of wallAnchors(l.widthM, l.heightM, anchorStep)) {
    for (let pan = 0; pan < 360; pan += angleStep) {
      const cam = { ...makeCamera('', ax, ay, pan), ...cameraProfile }, ppm = new Float32Array(free.length);
      let any = false;
      free.forEach((z, j) => { const p = ppmAt(cam, z.cx, z.cy, obstacles, l.targetHeight); if (p > 0) { ppm[j] = p; any = true; } });
      if (any) out.push({ cam, ppm });
    }
  }
  return out;
}

/**
 * Greedy chọn K camera: mỗi bước lấy ứng viên có ΔScore = Σ W·(Gain_DORI) lớn nhất.
 * weighted=false → Baseline 2 (mọi ô W=1). Số hạng 0.001 chỉ để phá hoà (vẫn dưới-mô-đun).
 */
export function greedyPlace(l: Layout, zones: Zone[], K = 3, weighted = true, opts?: CandOpts): Camera[] {
  const free = zones.filter((z) => !z.solid), wt = free.map((z) => (weighted ? z.w : 1));
  const candidateSets = new Map<string, Candidate[]>();
  const candsByCamera = Array.from({ length: K }, (_, index) => {
    const cameraProfile = opts?.cameraProfiles?.[index] ?? opts?.cameraProfile;
    const key = JSON.stringify([opts?.anchorStep ?? l.gridM, opts?.angleStep ?? 15, cameraProfile ?? null]);
    if (!candidateSets.has(key)) candidateSets.set(key, buildCandidates(l, free, { ...opts, cameraProfile }));
    return candidateSets.get(key)!;
  });
  const cur = new Float32Array(free.length), out: Camera[] = [];
  const gainOf = (arr: Float32Array, byW?: Record<number, number>) => {
    let g = 0;
    for (let j = 0; j < arr.length; j++) if (arr[j] > cur[j]) {
      const d = wt[j] * (F(arr[j]) - F(cur[j]) + 0.001 * (Math.min(arr[j], 250) - Math.min(cur[j], 250)) / 250);
      g += d; if (byW) byW[free[j].w] = (byW[free[j].w] ?? 0) + d;
    }
    return g;
  };
  for (let k = 1; k <= K; k++) {
    let best = -1, bestGain = -1;
    const cands = candsByCamera[k - 1];
    cands.forEach((c, i) => { const g = gainOf(c.ppm); if (g > bestGain) { bestGain = g; best = i; } });
    if (best < 0) break;
    const byW: Record<number, number> = {};
    gainOf(cands[best].ppm, byW);
    const top = Number(Object.entries(byW).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 1) as Weight;
    const { cam, ppm } = cands[best];
    out.push({ ...cam, id: `CAM-0${k}`, target: TARGET[top] });
    for (let j = 0; j < ppm.length; j++) cur[j] = Math.max(cur[j], ppm[j]);
  }
  return out;
}

/**
 * Vét cạn (nghiệm tối ưu chính xác TRONG tập ứng viên cho trước) cho K ≤ 3.
 * Hàm mục tiêu: Σ W·F(max PPM) trên ô sàn trống — đúng như evaluate().weighted.
 */
export function bruteForce(l: Layout, zones: Zone[], K: 1 | 2 | 3, opts?: CandOpts): { cameras: Camera[]; objective: number; evaluated: number } {
  const free = zones.filter((z) => !z.solid), w = Float32Array.from(free.map((z) => z.w));
  const cands = buildCandidates(l, free, opts), n = cands.length, m = free.length;
  const fa = cands.map((c) => Float32Array.from(c.ppm, (p) => F(p)));
  let best = -1, bi: number[] = [], evaluated = 0;
  const sum = (a: Float32Array) => { let s = 0; for (let j = 0; j < m; j++) s += w[j] * a[j]; return s; };
  const tmp2 = new Float32Array(m);
  for (let i = 0; i < n; i++) {
    if (K === 1) { evaluated++; const s = sum(fa[i]); if (s > best) { best = s; bi = [i]; } continue; }
    for (let j = i + 1; j < n; j++) {
      for (let t = 0; t < m; t++) tmp2[t] = Math.max(fa[i][t], fa[j][t]);
      if (K === 2) { evaluated++; const s = sum(tmp2); if (s > best) { best = s; bi = [i, j]; } continue; }
      for (let k = j + 1; k < n; k++) {
        evaluated++; const f = fa[k]; let s = 0;
        for (let t = 0; t < m; t++) s += w[t] * (tmp2[t] > f[t] ? tmp2[t] : f[t]);
        if (s > best) { best = s; bi = [i, j, k]; }
      }
    }
  }
  return { cameras: bi.map((c, q) => ({ ...cands[c].cam, id: `CAM-0${q + 1}` })), objective: best, evaluated };
}
