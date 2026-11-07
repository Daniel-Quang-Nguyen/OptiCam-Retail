import { describe, expect, it } from 'vitest';
import { PRESETS, withManualCams } from '../data/presets';
import { snapAngle, snapToWall } from './geometry';
import { assessPersonAt, buildZones, evaluate, ppmAt, riskBand, riskWeightAt } from './optics';
import { bruteForce, buildCandidates, greedyPlace, minimumCamerasForTargets } from './optimizer';

const cam = { id: 'c', x: 0, y: 3, pan: 0, fov: 90, res: 1920, range: 20, height: 1.6 };

describe('PPM / DORI', () => {
  it('PPM = Res / (2 r tan(FOV/2))', () => expect(ppmAt(cam, 5, 3, [])).toBeCloseTo(192, 1));
  it('camera độ phân giải cao hơn và FOV hẹp hơn cho PPM cao hơn', () => {
    const baseline = ppmAt(cam, 5, 3, []);
    expect(ppmAt({ ...cam, res: 3840 }, 5, 3, [])).toBeGreaterThan(baseline);
    expect(ppmAt({ ...cam, fov: 60 }, 5, 3, [])).toBeGreaterThan(baseline);
  });
  it('tầm xa trên 6.5 m vẫn được áp dụng trong tính toán vùng phủ', () => {
    const longRange = { ...cam, range: 8 };
    expect(ppmAt(longRange, 7, 3, [])).toBeGreaterThan(0);
    expect(ppmAt(longRange, 8.5, 3, [])).toBe(0);
  });
  it('ngoài FOV → 0', () => expect(ppmAt(cam, 0, 9, [])).toBe(0));
  it('độ cao camera làm thay đổi che khuất theo giao tuyến 3D', () => {
    const shelf = { id: 's', type: 'shelf' as const, label: 'Kệ', x: 2, y: 2, w: 1, h: 2, elev: 1.8, angle: 0 };
    expect(ppmAt({ ...cam, height: 1.8 }, 5, 3, [shelf])).toBe(0);
    expect(ppmAt({ ...cam, height: 3.5 }, 5, 3, [shelf])).toBeGreaterThan(0);
  });
  it('mức đánh giá thắt lưng có thể bị POS/kệ thấp che dù mặt vẫn nhìn thấy', () => {
    const pos = { id: 'p', type: 'pos' as const, label: 'POS', x: 4, y: 2, w: 1, h: 2, elev: 1.1, angle: 0 };
    expect(ppmAt({ ...cam, height: 2.4 }, 5, 3, [pos], 1.6)).toBeGreaterThan(0);
    expect(ppmAt({ ...cam, height: 2.4 }, 5, 3, [pos], 0.9)).toBe(0);
  });
  it('đánh giá đủ DORI và PPM cho mặt, ngực, bụng và chân', () => {
    const layout = {
      ...withManualCams(PRESETS[0]),
      cameras: [cam],
      obstacles: [],
      targetHeight: 1.6 as const
    };
    const readings = assessPersonAt(layout, 5, 3);
    expect(readings.map(({ key }) => key)).toEqual(['face', 'chest', 'abdomen', 'legs']);
    expect(readings.every(({ ppm }) => ppm > 0)).toBe(true);
    expect(readings[0].ppm).toBeGreaterThan(readings[3].ppm);
  });
});
describe('Trọng số rủi ro liên tục', () => {
  it('nội suy tuyến tính giữa lõi rủi ro và bán kính ngoài', () => {
    expect(riskWeightAt(1, 5, 1, 2.5)).toBe(5);
    expect(riskWeightAt(1.75, 5, 1, 2.5)).toBe(3);
    expect(riskWeightAt(2.5, 5, 1, 2.5)).toBe(1);
  });
  it('gom màu theo ngưỡng và cho cọ mới nhất ghi đè bằng tọa độ mét', () => {
    expect(riskBand(4)).toBe('red');
    expect(riskBand(3.99)).toBe('yellow');
    expect(riskBand(2)).toBe('yellow');
    expect(riskBand(1.99)).toBe('green');
    const base = withManualCams(PRESETS[0]);
    const layout = {
      ...base,
      obstacles: [{ ...base.obstacles[0], x: 2, y: 2, w: 1, h: 1, angle: 0, riskWmax: 5, riskR0: 1, riskR: 2.5 }],
      riskStrokes: [{ x: 3.25, y: 2.25, radius: 0.3, weight: 1 }, { x: 3.25, y: 2.25, radius: 0.3, weight: 4.25 }]
    };
    const containsBrush = (zone: { cx: number; cy: number }) => Math.hypot(zone.cx - 3.25, zone.cy - 2.25) <= 0.3;
    expect(buildZones(layout).find(containsBrush)?.w).toBe(4.25);
    expect(buildZones({ ...layout, gridM: 0.25 }).find(containsBrush)?.w).toBe(4.25);
  });
  it('scorecard reports minimum PPM in the continuous red band', () => {
    const layout = withManualCams(PRESETS[0]);
    const zones = [
      { r: 0, c: 0, cx: 2, cy: 2, w: 4.5, solid: false },
      { r: 0, c: 1, cx: 4, cy: 2, w: 4, solid: false },
      { r: 0, c: 2, cx: 3, cy: 2, w: 3.5, solid: false }
    ];
    const score = evaluate({ ...layout, obstacles: [], cameras: [{ ...cam, x: 0, y: 2 }] }, zones).score;
    expect(score.red).toBe(50);
    expect(score.yellow).toBe(100);
    expect(score.redMinPpm).toBe(240);
  });
});
describe('Hình học', () => {
  it('góc bước 15°', () => { expect(snapAngle(22)).toBe(15); expect(snapAngle(23)).toBe(30); expect(snapAngle(-10)).toBe(345); });
  it('snap-to-wall', () => expect(snapToWall(0.4, 3.1, 10, 6, 0.5)).toEqual([0, 3]));
});
describe('Solver', () => {
  it('uses each configured profile and defaults missing camera profiles', () => {
    const l = withManualCams(PRESETS[0]), z = buildZones(l);
    const cameraProfiles = [
      { fov: 70, res: 3840, range: 8, height: 3, model: 'Custom camera' },
      { fov: 60, res: 1920, range: 14, height: 2, model: 'Long-range camera' }
    ];
    const optimized = greedyPlace(l, z, 3, true, { cameraProfiles });
    expect(optimized).toHaveLength(3);
    expect(optimized[0]).toMatchObject(cameraProfiles[0]);
    expect(optimized[1]).toMatchObject(cameraProfiles[1]);
    expect(optimized[2]).toMatchObject({ fov: 85, res: 2560, range: 10, height: 2.4 });
  });
  it('finds the shortest camera prefix meeting KPI and preserves configured camera profiles', () => {
    const l = withManualCams(PRESETS[0]), z = buildZones(l);
    const profiles = [
      { ...l.cameras[0], fov: 70, res: 3840, range: 8, height: 3, model: 'Custom 8MP' },
      { ...l.cameras[1], fov: 60, res: 1920, range: 14, height: 2, model: 'Custom long range' }
    ];
    const result = minimumCamerasForTargets(l, z, profiles, 0, 0);
    expect(result.metTargets).toBe(true);
    expect(result.cameras).toHaveLength(1);
    expect(result.cameras[0]).toMatchObject({ fov: 70, res: 3840, range: 8, height: 3, model: 'Custom 8MP' });
  });
  it('keeps all available optimized cameras and reports when KPI is unattainable', () => {
    const l = withManualCams(PRESETS[0]), z = buildZones(l);
    const profiles = l.cameras.slice(0, 2);
    const result = minimumCamerasForTargets(l, z, profiles, 101, 101);
    expect(result.metTargets).toBe(false);
    expect(result.cameras).toHaveLength(2);
    expect(result.cameras[0]).toMatchObject({ fov: profiles[0].fov, res: profiles[0].res, range: profiles[0].range, height: profiles[0].height, model: profiles[0].model });
    expect(result.cameras[1]).toMatchObject({ fov: profiles[1].fov, res: profiles[1].res, range: profiles[1].range, height: profiles[1].height, model: profiles[1].model });
  });

  it('Greedy 3 cam < 2s, không kém 4 góc tường về điểm rủi ro', () => {
    const l = withManualCams(PRESETS[0]), z = buildZones(l);
    const t = performance.now(), cams = greedyPlace(l, z, 3);
    expect(performance.now() - t).toBeLessThan(2000);
    expect(cams).toHaveLength(3);
    expect(evaluate({ ...l, cameras: cams }, z).score.weighted).toBeGreaterThanOrEqual(evaluate(l, z).score.weighted);
  });
  it('Vét cạn ≥ Greedy trên cùng tập ứng viên, và Greedy ≥ (1 − 1/e) · Optimum', () => {
    const l = withManualCams(PRESETS[2]), z = buildZones(l), o = { anchorStep: 1, angleStep: 30 };
    const g = evaluate({ ...l, cameras: greedyPlace(l, z, 2, true, o) }, z).score.weighted;
    const b = evaluate({ ...l, cameras: bruteForce(l, z, 2, o).cameras }, z).score.weighted;
    expect(b).toBeGreaterThanOrEqual(g);
    expect(g).toBeGreaterThanOrEqual(0.632 * b);
  });
  it('Hàm mục tiêu đơn điệu: thêm camera không làm giảm điểm', () => {
    const l = withManualCams(PRESETS[0]), z = buildZones(l);
    const s = (n: number) => evaluate({ ...l, cameras: l.cameras.slice(0, n) }, z).score.weighted;
    for (let n = 1; n < 4; n++) expect(s(n + 1)).toBeGreaterThanOrEqual(s(n));
  });
});
