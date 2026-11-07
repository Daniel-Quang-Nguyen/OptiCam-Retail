import type { Camera, Layout, Obstacle, ObsType } from '../types';
import { clamp, obsPoly, placeObstacle, round2, satCollide, snap, snapToWall } from './geometry';

export const TEMPLATES: Record<ObsType, Omit<Obstacle, 'id' | 'x' | 'y'>> = {
  shelf: { type: 'shelf', label: 'Kệ hàng', w: 4, h: 0.5, elev: 1.8, angle: 0 },
  pos: { type: 'pos', label: 'Quầy POS', w: 2, h: 1, elev: 1.1, angle: 0 },
  entrance: { type: 'entrance', label: 'Cửa chính', w: 1.5, h: 0.2, elev: 2.2, angle: 0 }
};
export const AREA_MIN = 50, AREA_MAX = 80;

const hits = (l: Layout, o: Obstacle, margin = 0, ignore?: string) => {
  const inflated = { ...o, x: o.x - margin, y: o.y - margin, w: o.w + 2 * margin, h: o.h + 2 * margin };
  return l.obstacles.some((q) => q.id !== ignore && satCollide(obsPoly(inflated), obsPoly(q)));
};

/** Thêm khối chuẩn vào chỗ trống đầu tiên (kệ chừa lối đi ≥ 0.5 m nếu còn chỗ). Trả null nếu hết chỗ. */
export function addObstacle(l: Layout, type: ObsType): Layout | null {
  let i = l.obstacles.length + 1;
  while (l.obstacles.some((o) => o.id === `${type}_${i}`)) i++;
  const base: Obstacle = { ...TEMPLATES[type], id: `${type}_${i}`, x: 0, y: 0 };
  const { widthM: W, heightM: H, gridM: g } = l;
  const pts: [number, number][] = [];
  for (let cy = g; cy < H; cy += g) for (let cx = g; cx < W; cx += g) pts.push([cx, cy]);
  if (type === 'entrance') { pts.length = 0; for (let t = g; t < W; t += g) pts.push([t, 0], [t, H]); for (let t = g; t < H; t += g) pts.push([0, t], [W, t]); }
  const wall = (p: [number, number]) => Math.min(p[0], W - p[0], p[1], H - p[1]);
  const key = (p: [number, number]) => type === 'pos' ? wall(p) : Math.hypot(p[0] - W / 2, p[1] - H / 2) + (type === 'shelf' && wall(p) < 1 ? 1000 : 0);
  pts.sort((a, b) => key(a) - key(b));
  for (const margin of type === 'shelf' ? [0.5, 0] : [0]) for (const [cx, cy] of pts) {
    const n = placeObstacle(base, cx, cy, W, H, g);
    if (!hits(l, n, margin)) return { ...l, obstacles: [...l.obstacles, n] };
  }
  return null;
}

export const removeObstacle = (l: Layout, id: string): Layout => ({ ...l, obstacles: l.obstacles.filter((o) => o.id !== id) });

/** Đổi kích thước quanh tâm; từ chối (trả layout cũ) nếu gây chồng lấn. */
export function resizeObstacle(l: Layout, id: string, w: number, h: number): Layout {
  const o = l.obstacles.find((x) => x.id === id); if (!o) return l;
  const n = placeObstacle({ ...o, w: clamp(w, 0.2, l.widthM), h: clamp(h, 0.2, l.heightM) }, o.x + o.w / 2, o.y + o.h / 2, l.widthM, l.heightM, l.gridM);
  return hits(l, n, 0, id) ? l : { ...l, obstacles: l.obstacles.map((x) => (x.id === id ? n : x)) };
}

/** Đổi kích thước tường bao: kẹp lại vật cản, khoá lại cửa vào tường, snap lại camera, xoá cọ tô (lưới đổi). */
export function resizeRoom(l: Layout, W: number, H: number): Layout {
  const w = round2(clamp(snap(W, l.gridM), 3, 40)), h = round2(clamp(snap(H, l.gridM), 3, 40));
  const obstacles = l.obstacles.map((o) => placeObstacle(o, o.x + o.w / 2, o.y + o.h / 2, w, h, l.gridM));
  const cameras: Camera[] = l.cameras.map((c) => { const [x, y] = snapToWall(c.x, c.y, w, h, l.gridM); return { ...c, x, y }; });
  return { ...l, widthM: w, heightM: h, obstacles, cameras, risk: {} };
}
