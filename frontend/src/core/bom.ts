import type { Layout } from '../types';
import { center } from './geometry';

export const CAMERA_UNIT_COST = 1_250_000;  // VNĐ / camera IP PoE
export const INFRA_COST = 1_500_000;        // switch PoE + NVR + phụ kiện
const DROP = 2.4, SLACK = 3, MARGIN = 1.1;  // thả dây xuống NVR, dư dây, hệ số hao hụt

export interface BomRow { id: string; x: number; y: number; height: number; pan: number; fov: number; target: string; model: string; cableM: number }

/** NVR đặt tại quầy POS; chiều dài cáp = Manhattan(camera→NVR) + thả dây + dư, ×1.1. */
export function buildBom(l: Layout) {
  const pos = l.obstacles.find((o) => o.type === 'pos');
  const [nx, ny] = pos ? center(pos) : [0, 0];
  const rows: BomRow[] = l.cameras.map((c) => ({
    id: c.id, x: c.x, y: c.y, height: c.height, pan: c.pan, fov: c.fov,
    target: c.target ?? 'Giám sát bổ sung', model: c.model ?? 'Dome IP 2MP',
    cableM: Math.ceil((Math.abs(c.x - nx) + Math.abs(c.y - ny) + DROP + SLACK) * MARGIN)
  }));
  const cable = rows.reduce((s, r) => s + r.cableM, 0);
  return { rows, totalCameras: rows.length, totalCableM: cable, totalCostVnd: rows.length * CAMERA_UNIT_COST + INFRA_COST, poePorts: rows.length };
}

export function bomToCsv(l: Layout): string {
  const b = buildBom(l);
  const head = ['Ma cam', 'X (m)', 'Y (m)', 'Cao do (m)', 'Goc xoay (deg)', 'FOV (deg)', 'Muc tieu', 'Model', 'Cap du kien (m)'];
  const lines = b.rows.map((r) => [r.id, r.x, r.y, r.height, r.pan, r.fov, r.target, r.model, r.cableM].map((v) => `"${v}"`).join(','));
  return '\uFEFF' + [head.join(','), ...lines, `"TONG",,,,,,,"${b.totalCameras} camera + ${b.totalCableM}m cap",${b.totalCostVnd}`].join('\r\n');
}
