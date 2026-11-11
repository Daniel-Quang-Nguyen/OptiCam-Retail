import { PERSON_REGIONS, type Camera, type Cell, type Dori, type Layout, type Obstacle, type PersonRegion, type Score, type ShelfRiskCategory, type Weight, type Zone } from '../types';
import { deg, distToObs, norm360, rad, segmentRectInterval, type Pt } from './geometry';

/** Ngưỡng DORI theo IEC 62676-4 (PPM) */
export const DORI_MIN = { identification: 250, recognition: 125, observation: 62, detection: 25 } as const;
export const DORI_FACTOR: Record<Dori, number> = { identification: 1, recognition: 0.75, observation: 0.4, detection: 0.2, blind: 0 };
export const RISK_RED_THRESHOLD = 4;
export const RISK_YELLOW_THRESHOLD = 2;
export const REQUIRED_PPM = { red: 250, yellow: 125, green: 62 } as const;
export const FACE_Z = 1.6;            // mặt phẳng khuôn mặt (m)
export const RISK_DEFAULTS = {
  pos: { wmax: 5, r0: 1, radius: 2.5 },
  entrance: { wmax: 5, r0: 1, radius: 2.5 },
  shelf: { wmax: 3, r0: 1, radius: 2 }
} as const;
export const SHELF_RISK_PROFILES: Record<ShelfRiskCategory, { wmax: number; label: string }> = {
  high: { wmax: 4.5, label: 'CRAVED cao' },
  standard: { wmax: 3, label: 'Hàng thông thường' },
  bulky: { wmax: 1.8, label: 'Hàng cồng kềnh' },
  custom: { wmax: 3, label: 'Tùy chỉnh' }
};

export const obstacleRiskWmax = (obstacle: Obstacle): number =>
  obstacle.riskWmax ?? (obstacle.type === 'shelf'
    ? SHELF_RISK_PROFILES[obstacle.riskCategory ?? 'standard'].wmax
    : RISK_DEFAULTS[obstacle.type].wmax);

export const riskBand = (weight: number): 'red' | 'yellow' | 'green' =>
  weight >= RISK_RED_THRESHOLD ? 'red' : weight >= RISK_YELLOW_THRESHOLD ? 'yellow' : 'green';

export const riskWeightAt = (distance: number, wmax: number, r0: number, radius: number): number => {
  if (radius <= r0 || distance <= r0) return wmax;
  if (distance >= radius) return 1;
  const t = (distance - r0) / (radius - r0);
  return 1 + (wmax - 1) * (1 - t);
};

export const doriOf = (ppm: number): Dori =>
  ppm >= DORI_MIN.identification ? 'identification' : ppm >= DORI_MIN.recognition ? 'recognition'
  : ppm >= DORI_MIN.observation ? 'observation' : ppm >= DORI_MIN.detection ? 'detection' : 'blind';

/** All solid obstacles can block a target when the 3D sightline intersects their height. */
export const blockerObstacles = (l: Layout): Obstacle[] => l.obstacles.filter((o) => o.type !== 'entrance');

/** PPM uses the selected person height and blocks sightlines intersecting an obstacle volume. */
export function ppmAt(cam: Camera, x: number, y: number, obstacles: Obstacle[], targetHeight = FACE_Z): number {
  const dx = x - cam.x, dy = y - cam.y, d = Math.hypot(dx, dy);
  if (d < 0.2 || d > cam.range) return 0;
  let diff = Math.abs(norm360(deg(Math.atan2(dy, dx))) - cam.pan);
  if (diff > 180) diff = 360 - diff;
  if (diff > cam.fov / 2) return 0;
  const start: Pt = [cam.x, cam.y], end: Pt = [x, y];
  if (obstacles.some((o) => {
    if (o.elev <= 0) return false;
    const interval = segmentRectInterval(start, end, o);
    if (!interval) return false;
    const heightAt = (t: number) => cam.height + (targetHeight - cam.height) * t;
    return Math.min(heightAt(interval[0]), heightAt(interval[1])) <= o.elev + 1e-9;
  })) return 0;
  const r = Math.hypot(d, Math.abs(cam.height - targetHeight));
  return cam.res / (2 * r * Math.tan(rad(cam.fov / 2)));
}

export function assessPersonAt(l: Layout, x: number, y: number): Array<PersonRegion & { ppm: number; dori: Dori }> {
  const obstacles = blockerObstacles(l);
  return PERSON_REGIONS.map((region) => {
    const ppm = l.cameras.reduce(
      (best, cam) => Math.max(best, ppmAt(cam, x, y, obstacles, region.height)),
      0
    );
    return { ...region, ppm, dori: doriOf(ppm) };
  });
}

/** Rule-based Semantic Object Mapping + Manual Risk Brush → lưới ô 0.5m × 0.5m. Chỉ phụ thuộc vật cản/cọ tô, không phụ thuộc camera. */
export function buildZones(l: Layout): Zone[] {
  const cols = Math.round(l.widthM / l.gridM), rows = Math.round(l.heightM / l.gridM);
  const zones: Zone[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = (c + 0.5) * l.gridM, cy = (r + 0.5) * l.gridM;
    const solid = l.obstacles.some((o) => o.type !== 'entrance' && distToObs(cx, cy, o) < 1e-9);
    let w: Weight = 1;
    for (const obstacle of l.obstacles) {
      const defaults = RISK_DEFAULTS[obstacle.type];
      const obstacleWeight = riskWeightAt(
        distToObs(cx, cy, obstacle),
        obstacleRiskWmax(obstacle),
        obstacle.riskR0 ?? defaults.r0,
        obstacle.riskR ?? defaults.radius
      );
      w = Math.max(w, obstacleWeight);
    }
    const legacyOverride = l.risk[`${r}_${c}`];
    if (Number.isFinite(legacyOverride)) w = legacyOverride;
    zones.push({ r, c, cx, cy, w, solid });
  }
  for (const stroke of l.riskStrokes) {
    const minCol = Math.max(0, Math.ceil((stroke.x - stroke.radius) / l.gridM - 0.5));
    const maxCol = Math.min(cols - 1, Math.floor((stroke.x + stroke.radius) / l.gridM - 0.5));
    const minRow = Math.max(0, Math.ceil((stroke.y - stroke.radius) / l.gridM - 0.5));
    const maxRow = Math.min(rows - 1, Math.floor((stroke.y + stroke.radius) / l.gridM - 0.5));
    for (let r = minRow; r <= maxRow; r++) for (let c = minCol; c <= maxCol; c++) {
      const zone = zones[r * cols + c];
      if (Math.hypot(zone.cx - stroke.x, zone.cy - stroke.y) <= stroke.radius) zone.w = stroke.weight;
    }
  }
  return zones;
}

export function evaluate(l: Layout, zones: Zone[]): { cells: Cell[]; score: Score } {
  const t0 = performance.now();
  const obstacles = blockerObstacles(l);
  let redN = 0, redOk = 0, yelN = 0, yelOk = 0, weighted = 0, redMinPpm = Number.POSITIVE_INFINITY;
  const cells: Cell[] = zones.map((z) => {
    if (z.solid) return { ...z, ppm: 0, dori: 'blind' as Dori };
    let ppm = 0;
    for (const cam of l.cameras) ppm = Math.max(ppm, ppmAt(cam, z.cx, z.cy, obstacles, l.targetHeight));
    const dori = doriOf(ppm);
    const band = riskBand(z.w);
    if (band === 'red') { redN++; redMinPpm = Math.min(redMinPpm, ppm); if (ppm >= DORI_MIN.identification) redOk++; }
    else if (band === 'yellow') { yelN++; if (ppm >= DORI_MIN.recognition) yelOk++; }
    weighted += z.w * DORI_FACTOR[dori];
    return { ...z, ppm, dori };
  });
  const pct = (a: number, n: number) => (n ? Math.round((a / n) * 1000) / 10 : 100);
  return {
    cells,
    score: { red: pct(redOk, redN), yellow: pct(yelOk, yelN), redMinPpm: Number.isFinite(redMinPpm) ? Math.round(redMinPpm) : 0, weighted: Math.round(weighted * 10) / 10, cams: l.cameras.length, ms: Math.round((performance.now() - t0) * 100) / 100 }
  };
}
