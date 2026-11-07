import type { Obstacle } from '../types';

export type Pt = [number, number];
export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const snap = (v: number, s: number) => Math.round(v / s) * s;
export const norm360 = (a: number) => ((a % 360) + 360) % 360;
/** Khoá góc xoay ngang theo bước rời rạc Δθ = 15° */
export const snapAngle = (a: number, step = 15) => norm360(Math.round(a / step) * step);
export const round2 = (v: number) => Math.round(v * 100) / 100;

export const center = (o: Obstacle): Pt => [o.x + o.w / 2, o.y + o.h / 2];

export function rectPoly(cx: number, cy: number, w: number, h: number, angDeg: number): Pt[] {
  const c = Math.cos(rad(angDeg)), s = Math.sin(rad(angDeg));
  return ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as Pt[]).map(
    ([dx, dy]) => [cx + dx * c - dy * s, cy + dx * s + dy * c] as Pt
  );
}
export const obsPoly = (o: Obstacle): Pt[] => rectPoly(...center(o), o.w, o.h, o.angle);

/** Separating Axis Theorem — chỉ coi là va chạm khi chồng lấn thật (chạm cạnh vẫn hợp lệ). */
export function satCollide(a: Pt[], b: Pt[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const len = Math.hypot(q[1] - p[1], q[0] - p[0]);
      if (len === 0) continue;
      const ax = -(q[1] - p[1]) / len, ay = (q[0] - p[0]) / len;
      const pa = a.map((v) => v[0] * ax + v[1] * ay), pb = b.map((v) => v[0] * ax + v[1] * ay);
      if (Math.max(...pa) <= Math.min(...pb) + 1e-9 || Math.max(...pb) <= Math.min(...pa) + 1e-9) return false;
    }
  }
  return true;
}

/** Khoảng cách từ điểm tới hình chữ nhật xoay (0 nếu nằm trong). */
export function distToObs(px: number, py: number, o: Obstacle): number {
  const [cx, cy] = center(o);
  const r = rad(-o.angle), dx = px - cx, dy = py - cy;
  const lx = dx * Math.cos(r) - dy * Math.sin(r), ly = dx * Math.sin(r) + dy * Math.cos(r);
  return Math.hypot(Math.max(0, Math.abs(lx) - o.w / 2), Math.max(0, Math.abs(ly) - o.h / 2));
}

/** Returns the segment interval that crosses a rotated obstacle rectangle. */
export function segmentRectInterval(a: Pt, b: Pt, o: Obstacle): [number, number] | null {
  const [cx, cy] = center(o), r = rad(-o.angle);
  const local = ([x, y]: Pt): Pt => {
    const dx = x - cx, dy = y - cy;
    return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
  };
  const [x0, y0] = local(a), [x1, y1] = local(b);
  let enter = 0, exit = 1;
  for (const [origin, delta, halfSize] of [
    [x0, x1 - x0, o.w / 2],
    [y0, y1 - y0, o.h / 2]
  ]) {
    if (Math.abs(delta) < 1e-12) {
      if (origin < -halfSize || origin > halfSize) return null;
      continue;
    }
    const near = (-halfSize - origin) / delta, far = (halfSize - origin) / delta;
    enter = Math.max(enter, Math.min(near, far));
    exit = Math.min(exit, Math.max(near, far));
    if (enter > exit) return null;
  }
  return [enter, exit];
}

const cross = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export function segHit(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  return cross(c, d, a) * cross(c, d, b) < 0 && cross(a, b, c) * cross(a, b, d) < 0;
}
/** 2D Ray-Casting: đoạn nhìn a→b có cắt cạnh của vật cản nào không. */
export const rayBlocked = (a: Pt, b: Pt, polys: Pt[][]) =>
  polys.some((p) => p.some((v, i) => segHit(a, b, v, p[(i + 1) % p.length])));

/** Điểm neo ứng viên dọc tường bao, bước = gridM. */
export function wallAnchors(W: number, H: number, step: number): Pt[] {
  const set = new Map<string, Pt>();
  const add = (x: number, y: number) => set.set(`${x.toFixed(2)}_${y.toFixed(2)}`, [round2(x), round2(y)]);
  for (let i = 0; i <= Math.round(W / step); i++) { add(i * step, 0); add(i * step, H); }
  for (let j = 0; j <= Math.round(H / step); j++) { add(0, j * step); add(W, j * step); }
  return [...set.values()];
}

/** Snap-to-Wall: ép vị trí về điểm neo gần nhất trên 4 cạnh tường. */
export function snapToWall(x: number, y: number, W: number, H: number, step: number): Pt {
  const cx = clamp(x, 0, W), cy = clamp(y, 0, H);
  const d = [cx, W - cx, cy, H - cy], m = Math.min(...d);
  if (m === d[0]) return [0, clamp(snap(cy, step), 0, H)];
  if (m === d[1]) return [W, clamp(snap(cy, step), 0, H)];
  if (m === d[2]) return [clamp(snap(cx, step), 0, W), 0];
  return [clamp(snap(cx, step), 0, W), H];
}

/** Đặt vật cản quanh tâm (cx, cy): snap lưới 0.5m, kẹp trong phòng; Cửa tự khoá vào mép tường (xoay 0°/90°). */
export function placeObstacle(o: Obstacle, cx: number, cy: number, W: number, H: number, g: number): Obstacle {
  if (o.type === 'entrance') {
    const len = Math.max(o.w, o.h), th = Math.min(o.w, o.h);
    const dT = cy, dB = H - cy, dL = cx, dR = W - cx, m = Math.min(dT, dB, dL, dR);
    const horiz = m === dT || m === dB;
    const along = (v: number, size: number, max: number) => clamp(snap(clamp(v, size / 2, max - size / 2), g), size / 2, max - size / 2);
    const ncx = horiz ? along(cx, len, W) : m === dL ? th / 2 : W - th / 2;
    const ncy = horiz ? (m === dT ? th / 2 : H - th / 2) : along(cy, len, H);
    return { ...o, w: len, h: th, angle: horiz ? 0 : 90, x: round2(ncx - len / 2), y: round2(ncy - th / 2) };
  }
  const r = rad(o.angle);
  const ex = (o.w / 2) * Math.abs(Math.cos(r)) + (o.h / 2) * Math.abs(Math.sin(r));
  const ey = (o.w / 2) * Math.abs(Math.sin(r)) + (o.h / 2) * Math.abs(Math.cos(r));
  const ncx = clamp(snap(clamp(cx, ex, W - ex), g), ex, W - ex);
  const ncy = clamp(snap(clamp(cy, ey, H - ey), g), ey, H - ey);
  return { ...o, x: round2(ncx - o.w / 2), y: round2(ncy - o.h / 2) };
}
