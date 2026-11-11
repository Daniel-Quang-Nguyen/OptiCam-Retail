import { describe, expect, it } from 'vitest';
import { PRESETS, withManualCams } from '../data/presets';
import { addObstacle, removeObstacle, resizeObstacle, resizeRoom } from './editor';
import { fromApiResponse, toApiPayload } from './api';
import { normalizeLayout } from './io';
import { riskColor } from '../components/canvas/shared';
import { obsPoly, satCollide } from './geometry';
import { buildZones, SHELF_RISK_PROFILES } from './optics';
import { canPlacePerson } from './person';
import { cameraQualityForResolution, CAMERA_QUALITY_PRESETS } from './camera';

const noOverlap = (l: ReturnType<typeof withManualCams>) =>
  l.obstacles.every((a, i) => l.obstacles.every((b, j) => i >= j || !satCollide(obsPoly(a), obsPoly(b))));

describe('Editor', () => {
  it('chỉ cho đặt người bên trong phòng và không chồng lên vật cản', () => {
    const layout = withManualCams(PRESETS[0]);
    expect(canPlacePerson(3, 3, layout.widthM, layout.heightM, layout.obstacles)).toBe(true);
    expect(canPlacePerson(0.1, 2, layout.widthM, layout.heightM, layout.obstacles)).toBe(false);
    const obstacle = layout.obstacles.find((item) => item.type !== 'entrance')!;
    expect(canPlacePerson(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, layout.widthM, layout.heightM, layout.obstacles)).toBe(false);
  });
  it('thêm kệ/POS/cửa không chồng lấn; xoá được', () => {
    let l = withManualCams(PRESETS[2]);
    for (const t of ['shelf', 'pos', 'entrance', 'shelf'] as const) { const r = addObstacle(l, t); expect(r).not.toBeNull(); l = r!; }
    expect(noOverlap(l)).toBe(true);
    const last = l.obstacles[l.obstacles.length - 1];
    expect(removeObstacle(l, last.id).obstacles).toHaveLength(l.obstacles.length - 1);
  });
  it('đổi kích thước bị từ chối nếu chồng lấn', () => {
    const l = withManualCams(PRESETS[0]), id = l.obstacles.find((o) => o.type === 'shelf')!.id;
    expect(noOverlap(resizeObstacle(l, id, 4.5, 4))).toBe(true);
  });
  it('đổi tường bao: vật cản nằm trong phòng, camera bám tường, cửa còn sát tường', () => {
    const r = resizeRoom(withManualCams(PRESETS[0]), 9, 5.5);
    expect(r.widthM).toBe(9); expect(r.heightM).toBe(5.5);
    expect(r.cameras.every((c) => c.x === 0 || c.x === 9 || c.y === 0 || c.y === 5.5)).toBe(true);
    expect(r.obstacles.every((o) => o.x >= -1e-9 && o.y >= -1e-9)).toBe(true);
  });
});
describe('API adapter', () => {
  it('normalizes shelf CRAVED categories, defaults new profiles, and preserves custom Wmax', () => {
    const layout = normalizeLayout({
      widthM: 14, heightM: 4, gridM: 0.5, cameras: [], obstacles: [
        { type: 'shelf', x: 1, y: 1, w: 0.5, h: 0.5 },
        { type: 'shelf', x: 6, y: 1, w: 0.5, h: 0.5, riskCategory: 'high' },
        { type: 'shelf', x: 11, y: 1, w: 0.5, h: 0.5, riskWmax: 4.8 }
      ]
    });
    expect(layout.obstacles.map(({ riskCategory, riskWmax }) => [riskCategory, riskWmax])).toEqual([
      ['standard', SHELF_RISK_PROFILES.standard.wmax],
      ['high', SHELF_RISK_PROFILES.high.wmax],
      ['custom', 4.8]
    ]);
    const zones = buildZones(layout);
    for (const [x, weight] of [[1.75, 3], [6.75, 4.5], [11.75, 4.8]] as const) {
      expect(zones.find((zone) => Math.abs(zone.cx - x) < 1e-9 && Math.abs(zone.cy - 1.25) < 1e-9)?.w).toBe(weight);
    }
  });

  it('payload có ma trận rủi ro đúng kích thước', () => {
    const l = withManualCams(PRESETS[0]), p = toApiPayload(l, buildZones(l), 3);
    expect(p.riskMatrix).toHaveLength(12); expect(p.riskMatrix[0]).toHaveLength(20);
    expect(p.riskMatrix.flat().every((w) => Number.isFinite(w) && w >= 1 && w <= 5)).toBe(true);
    expect(p.riskMatrix.flat().some((w) => !Number.isInteger(w))).toBe(true);
    expect(p.layout.targetHeight).toBe(1.6);
  });

  describe('risk heatmap colors', () => {
    it('uses visibly different continuous colors for fractional risk weights', () => {
      expect(riskColor(1)).toBe('rgba(37,99,235,0.420)');
      expect(riskColor(2.5)).not.toBe(riskColor(2));
      expect(riskColor(3)).not.toBe(riskColor(2));
      expect(riskColor(4.5)).not.toBe(riskColor(4));
      expect(riskColor(0)).toBe(riskColor(1));
      expect(riskColor(6)).toBe(riskColor(5));
    });
  });
  it('response chấp nhận pan_angle và data.cameras', () => {
    const l = withManualCams(PRESETS[0]);
    expect(fromApiResponse({ data: { cameras: [{ x: 0, y: 3, pan_angle: 45 }] } }, l)[0].pan).toBe(45);
    expect(() => fromApiResponse({ cameras: [] }, l)).toThrow();
  });
  it('migrates legacy cell overrides to metric strokes and keeps them after grid changes', () => {
    const layout = normalizeLayout({
      widthM: 4, heightM: 3, gridM: 1, obstacles: [], cameras: [], risk: { '1_2': 4 }
    });
    expect(layout.risk).toEqual({});
    expect(layout.riskStrokes[0]).toMatchObject({ x: 2.5, y: 1.5, weight: 4 });
    const fineZones = buildZones({ ...layout, gridM: 0.25 });
    expect(fineZones.some((zone) => zone.w === 4 && Math.hypot(zone.cx - 2.5, zone.cy - 1.5) < 0.7)).toBe(true);
  });
});
describe('Camera quality settings', () => {
  it('maps 2MP, 4MP and 8MP profiles to the sensor resolutions used by PPM', () => {
    expect(CAMERA_QUALITY_PRESETS.map((profile) => profile.resolution)).toEqual([1920, 2560, 3840]);
    expect(cameraQualityForResolution(2560)).toBe('4mp');
    expect(cameraQualityForResolution(2048)).toBe('custom');
  });
});
