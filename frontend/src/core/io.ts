import { PERSON_TARGETS, type Camera, type Layout, type Obstacle, type Score } from '../types';
import { buildBom } from './bom';
import { clamp } from './geometry';

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const TYPES = ['shelf', 'pos', 'entrance'];

/** Chấp nhận nhiều tên khoá (pan | pan_angle | angle) để khớp schema backend. */
export function normalizeCameras(list: any[], widthM: number, heightM: number): Camera[] {
  if (!Array.isArray(list)) throw new Error('Danh sách camera không hợp lệ.');
  return list.map((c: any, i: number): Camera => ({
    id: String(c.id ?? `CAM-0${i + 1}`), x: clamp(num(c.x, 0), 0, widthM), y: clamp(num(c.y, 0), 0, heightM),
    pan: num(c.pan ?? c.pan_angle ?? c.angle, 0), fov: num(c.fov, 85), res: num(c.res, 2560), range: num(c.range, 10), height: num(c.height, 2.4),
    target: c.target, model: c.model
  }));
}

/** Chuẩn hoá & kiểm tra toàn vẹn dữ liệu; chấp nhận cả file xuất cũ của bản Pygame (width/height/pan_angle...). */
export function normalizeLayout(raw: any): Layout {
  const L = raw?.layout ?? raw;
  if (!L || typeof L !== 'object' || !Array.isArray(L.obstacles)) throw new Error('File không đúng định dạng layout OptiCam.');
  const widthM = num(L.widthM ?? L.width, 10), heightM = num(L.heightM ?? L.height, 6);
  if (widthM < 3 || heightM < 3 || widthM > 40 || heightM > 40) throw new Error('Kích thước mặt bằng ngoài khoảng 3–40 m.');
  const obstacles: Obstacle[] = L.obstacles.map((o: any, i: number): Obstacle => {
    if (!TYPES.includes(o.type)) throw new Error(`Vật cản #${i + 1}: loại "${o.type}" không hợp lệ.`);
    return {
      id: String(o.id ?? `obs_${i}`), type: o.type, label: String(o.label ?? o.name ?? o.type),
      x: num(o.x, 0), y: num(o.y, 0), w: num(o.w ?? o.width, 1), h: num(o.h ?? o.height, 1),
      elev: num(o.elev ?? o.elevation, o.type === 'shelf' ? 1.8 : 1.1), angle: num(o.angle, 0)
    };
  });
  const cameras = normalizeCameras(L.cameras ?? [], widthM, heightM);
  const targetHeight = PERSON_TARGETS.find((target) => target.height === L.targetHeight)?.height ?? 1.6;
  return {
    version: String(L.version ?? '1.0'), name: String(L.name ?? 'Layout'), widthM, heightM,
    gridM: num(L.gridM ?? L.grid_size, 0.5), pixelsPerMeter: num(L.pixelsPerMeter, 68), targetHeight,
    background: L.background, obstacles, risk: L.risk ?? {}, cameras
  };
}

export function download(name: string, data: string | Blob, mime = 'application/json') {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Bundle dự án: Layout + Camera + Risk + Score + BOM. */
export const exportBundle = (l: Layout, score: Score) =>
  JSON.stringify({ format: 'opticam-bundle', version: '1.0', exportedAt: new Date().toISOString(), layout: l, score, bom: buildBom(l) }, null, 2);

export const parseBundle = (text: string): Layout => normalizeLayout(JSON.parse(text));
