import type { Camera, Layout, Zone } from '../types';
import { normalizeCameras } from './io';
import { greedyPlace } from './optimizer';

/**
 * ĐIỂM DUY NHẤT cần sửa khi chốt schema với Gia Bảo (xem docs/API_CONTRACT.md):
 *   toApiPayload()     — Canvas → Backend (toạ độ vật cản + ma trận rủi ro)
 *   fromApiResponse()  — Backend → Canvas (danh sách camera gợi ý)
 */
export function toApiPayload(l: Layout, zones: Zone[], cameraBudgetK: number, cameraProfiles?: Camera[]) {
  const cols = Math.round(l.widthM / l.gridM), rows = Math.round(l.heightM / l.gridM);
  const riskMatrix = Array.from({ length: rows }, (_, r) => zones.slice(r * cols, (r + 1) * cols).map((z) => z.w));
  const blockedMatrix = Array.from({ length: rows }, (_, r) => zones.slice(r * cols, (r + 1) * cols).map((z) => (z.solid ? 1 : 0)));
  return {
    cameraBudgetK,
    cameraProfiles: cameraProfiles?.map(({ fov, res, range, height, model }) => ({ fov, res, range, height, model })),
    layout: { version: l.version, name: l.name, widthM: l.widthM, heightM: l.heightM, gridM: l.gridM, targetHeight: l.targetHeight, obstacles: l.obstacles },
    grid: { rows, cols, cellSizeM: l.gridM },
    riskMatrix,      // [row][col] ∈ [1, 5], continuous weights including manual strokes
    blockedMatrix    // [row][col] ∈ {0, 1}     (1 = ô bị kệ/POS chiếm)
  };
}

export function fromApiResponse(json: any, l: Layout): Camera[] {
  const list = json?.cameras ?? json?.data?.cameras;
  const cams = normalizeCameras(list, l.widthM, l.heightM);
  if (!cams.length) throw new Error('Backend không trả về camera nào.');
  return cams;
}

/** POST /api/v1/optimize; quá 1.5 s hoặc lỗi → Greedy phía client. */
export async function requestOptimize(l: Layout, zones: Zone[], K = 3, cameraProfiles?: Camera[]): Promise<{ cameras: Camera[]; source: 'api' | 'client' }> {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 1500);
  try {
    const res = await fetch('/api/v1/optimize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify(toApiPayload(l, zones, K, cameraProfiles))
    });
    if (res.ok) return { cameras: fromApiResponse(await res.json(), l), source: 'api' };
  } catch { /* backend chưa bật / sai schema → fallback */ } finally { clearTimeout(timer); }
  return { cameras: greedyPlace(l, zones, K, true, { cameraProfiles: cameraProfiles?.map((camera) => ({
    fov: camera.fov, res: camera.res, range: camera.range, height: camera.height, model: camera.model
  })) }), source: 'client' };
}
