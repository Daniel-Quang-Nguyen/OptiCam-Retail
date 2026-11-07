/**
 * Bộ thí nghiệm tái lập được cho OptiCam (chạy: npm run experiments).
 *  E1  3 layout mẫu: Manual 4 góc | Greedy không trọng số | Weighted Greedy | Vét cạn (K=2, K=3)
 *  E2  N layout ngẫu nhiên (seed cố định): so sánh + tỉ lệ đạt KPI + khoảng tin cậy bootstrap
 *  E3  Đường cong lợi ích cận biên K = 1..5
 * Vét cạn chạy trên tập ứng viên thu gọn (neo 1.0 m, góc 30°); Greedy được chạy trên CÙNG tập đó
 * để tỉ lệ Greedy/Optimum so sánh công bằng. Greedy tập đầy đủ (neo 0.5 m, góc 15°) báo riêng.
 */
import fs from 'node:fs';
import { normalizeLayout } from '../src/core/io';
import { buildZones, evaluate } from '../src/core/optics';
import { bruteForce, greedyPlace, manualFourCorners } from '../src/core/optimizer';
import { obsPoly, placeObstacle, satCollide, snap } from '../src/core/geometry';
import type { Layout, Obstacle, Score } from '../src/types';

const DATA = process.env.DATA_DIR ?? '../data_samples', OUT = process.env.OUT_DIR ?? '../results';
const N_RANDOM = Number(process.env.N_RANDOM ?? 30), SEED0 = 2026;
const REDUCED = { anchorStep: 1, angleStep: 30 };
fs.mkdirSync(OUT, { recursive: true });

const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const std = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const bootCI = (a: number[], seed = 1) => { const r = rng(seed), ms: number[] = []; for (let i = 0; i < 2000; i++) ms.push(mean(a.map(() => a[Math.floor(r() * a.length)]))); ms.sort((x, y) => x - y); return [ms[50], ms[1949]]; };
const f1 = (v: number) => v.toFixed(1), f2 = (v: number) => v.toFixed(2);

function randomLayout(seed: number): Layout {
  const r = rng(seed), pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  let W: number, H: number;
  do { W = pick([8, 8.5, 9, 10, 11, 12]); H = pick([5, 5.5, 6, 6.5, 7]); } while (W * H < 50 || W * H > 80);
  const obs: Obstacle[] = [];
  const add = (o: Obstacle, margin = 0) => {
    const n = placeObstacle(o, o.x + o.w / 2, o.y + o.h / 2, W, H, 0.5);
    const inflated = { ...n, w: n.w + margin * 2, h: n.h + margin * 2, x: n.x - margin, y: n.y - margin };
    if (obs.some((q) => satCollide(obsPoly(inflated), obsPoly(q)))) return false;
    obs.push(n); return true;
  };
  for (let t = 0; t < 50 && !obs.length; t++) add({ id: 'pos', type: 'pos', label: 'Quầy POS', x: snap(r() * (W - 2), 0.5), y: r() < 0.5 ? 0.5 : H - 1.5, w: 2, h: 1, elev: 1.1, angle: 0 });
  for (let t = 0; t < 50 && obs.length < 2; t++) add({ id: 'door', type: 'entrance', label: 'Cửa', x: r() * W, y: r() * H, w: 1.5, h: 0.2, elev: 2.2, angle: 0 });
  const nShelf = 2 + Math.floor(r() * 3);
  for (let t = 0, n = 0; t < 200 && n < nShelf; t++) {
    const len = pick([3, 4, 4.5]), vert = r() < 0.4;
    const ok = add({ id: `shelf_${n}`, type: 'shelf', label: `Kệ ${n + 1}`, x: snap(1 + r() * (W - len - 2), 0.5), y: snap(1 + r() * (H - 3), 0.5), w: len, h: 0.5, elev: 1.8, angle: vert ? 90 : 0 }, 0.5);
    if (ok) n++;
  }
  return { version: '1.0', name: `random_${seed}`, widthM: W, heightM: H, gridM: 0.5, pixelsPerMeter: 68, obstacles: obs, risk: {}, cameras: [] };
}

const kpi = (s: Score) => s.red >= 95 && s.yellow >= 80;
function runLayout(l: Layout, K: 2 | 3) {
  const z = buildZones(l), ev = (c: Layout['cameras']) => evaluate({ ...l, cameras: c }, z).score;
  const t = (fn: () => any) => { const t0 = performance.now(); const v = fn(); return [v, performance.now() - t0] as const; };
  const [wFull, tFull] = t(() => greedyPlace(l, z, K, true));
  const [bf, tBf] = t(() => bruteForce(l, z, K, REDUCED));
  return {
    manual: ev(manualFourCorners(l)), unweighted: ev(greedyPlace(l, z, K, false)),
    optimumFull: K === 2 ? ev(bruteForce(l, z, K).cameras) : null,
    weighted: ev(wFull), weightedReduced: ev(greedyPlace(l, z, K, true, REDUCED)), optimum: ev(bf.cameras),
    tGreedyMs: tFull, tBruteMs: tBf, nEval: bf.evaluated
  };
}

// ---------- E1 ----------
const names = ['store_60m2', 'circle_k_75m2', 'ministop_50m2'];
const presets = names.map((n) => normalizeLayout(JSON.parse(fs.readFileSync(`${DATA}/${n}.json`, 'utf8'))));
const e1: string[] = ['layout,K,method,red_pct,yellow_pct,weighted,cams,kpi_pass,greedy_ms,bruteforce_ms,bf_evaluations'];
const md: string[] = ['# Kết quả thực nghiệm (sinh tự động bởi `npm run experiments`)', '', '## E1 — 3 layout mẫu', '', '| Layout | K | Phương pháp | Vùng Đỏ % | Hành lang % | Tổng điểm | Đạt KPI | Greedy/Optimum |', '|---|---|---|---|---|---|---|---|'];
for (const l of presets) for (const K of [2, 3] as const) {
  const r = runLayout(l, K);
  const rows: [string, Score][] = [[`Manual 4 góc (4 cam)`, r.manual], ['Greedy không trọng số', r.unweighted], ['Weighted Greedy', r.weighted], ['Weighted Greedy (tập thu gọn)', r.weightedReduced], ['Vét cạn (tập thu gọn)', r.optimum], ...(r.optimumFull ? [['Vét cạn (tập đầy đủ 0.5 m / 15°)', r.optimumFull] as [string, Score]] : [])];
  for (const [m, s] of rows) {
    e1.push(`${l.name.replace(/,/g, ' ')},${K},${m},${s.red},${s.yellow},${s.weighted},${s.cams},${kpi(s)},${f1(r.tGreedyMs)},${f1(r.tBruteMs)},${r.nEval}`);
    md.push(`| ${l.name} | ${K} | ${m} | ${s.red} | ${s.yellow} | ${s.weighted} | ${kpi(s) ? '✔' : '✘'} | ${m.startsWith('Weighted Greedy (') ? f1((r.weightedReduced.weighted / r.optimum.weighted) * 100) + '%' : ''} |`);
  }
  console.log(l.name, K, 'greedy/opt =', f1((r.weightedReduced.weighted / r.optimum.weighted) * 100) + '%', `greedy ${f1(r.tGreedyMs)}ms brute ${f1(r.tBruteMs)}ms`);
}
fs.writeFileSync(`${OUT}/e1_presets.csv`, e1.join('\n'));

// ---------- E2 ----------
const rowsR: any[] = [], e2 = ['seed,area_m2,K,manual_w,unweighted_w,weighted_w,optimum_w,ratio_greedy_opt,manual_red,unw_red,w_red,manual_yel,unw_yel,w_yel,kpi_manual,kpi_unw,kpi_w,kpi_opt'];
for (let i = 0; i < N_RANDOM; i++) {
  const l = randomLayout(SEED0 + i), K = 3;
  const r = runLayout(l, K);
  rowsR.push({ ...r, area: l.widthM * l.heightM });
  e2.push([SEED0 + i, l.widthM * l.heightM, K, r.manual.weighted, r.unweighted.weighted, r.weighted.weighted, r.optimum.weighted, f2(r.weightedReduced.weighted / r.optimum.weighted), r.manual.red, r.unweighted.red, r.weighted.red, r.manual.yellow, r.unweighted.yellow, r.weighted.yellow, kpi(r.manual), kpi(r.unweighted), kpi(r.weighted), kpi(r.optimum)].join(','));
}
fs.writeFileSync(`${OUT}/e2_random.csv`, e2.join('\n'));
const col = (f: (r: any) => number) => rowsR.map(f);
const ratio = col((r) => r.weightedReduced.weighted / r.optimum.weighted), rci = bootCI(ratio);
const diffW = col((r) => r.weighted.weighted - r.unweighted.weighted), dci = bootCI(diffW);
const diffM = col((r) => r.weighted.weighted - r.manual.weighted), mci = bootCI(diffM);
const pass = (f: (r: any) => Score) => rowsR.filter((r) => kpi(f(r))).length;
const wins = rowsR.filter((r) => r.weighted.weighted > r.unweighted.weighted).length, ties = rowsR.filter((r) => r.weighted.weighted === r.unweighted.weighted).length;
md.push('', `## E2 — ${N_RANDOM} layout ngẫu nhiên (seed ${SEED0}…${SEED0 + N_RANDOM - 1}, 50–80 m², K = 3 camera cho Greedy/Vét cạn, Manual = 4 camera)`, '',
  '| Chỉ số | Giá trị |', '|---|---|',
  `| Tỉ lệ Greedy / Optimum (tập thu gọn) | ${f1(mean(ratio) * 100)}% ± ${f1(std(ratio) * 100)} (min ${f1(Math.min(...ratio) * 100)}%, CI95 bootstrap [${f1(rci[0] * 100)}, ${f1(rci[1] * 100)}]) |`,
  `| Tổng điểm: Weighted − Unweighted Greedy | ${f1(mean(diffW))} (CI95 [${f1(dci[0])}, ${f1(dci[1])}]); thắng ${wins}, hoà ${ties}, thua ${N_RANDOM - wins - ties} |`,
  `| Tổng điểm: Weighted Greedy (3 cam) − Manual (4 cam) | ${f1(mean(diffM))} (CI95 [${f1(mci[0])}, ${f1(mci[1])}]) |`,
  `| Vùng Đỏ trung bình (Manual / Unweighted / Weighted) | ${f1(mean(col((r) => r.manual.red)))} / ${f1(mean(col((r) => r.unweighted.red)))} / ${f1(mean(col((r) => r.weighted.red)))} % |`,
  `| Hành lang trung bình (Manual / Unweighted / Weighted) | ${f1(mean(col((r) => r.manual.yellow)))} / ${f1(mean(col((r) => r.unweighted.yellow)))} / ${f1(mean(col((r) => r.weighted.yellow)))} % |`,
  `| Số layout đạt KPI (Đỏ ≥ 95% & Vàng ≥ 80%): Manual / Unweighted / Weighted / Optimum | ${pass((r) => r.manual)} / ${pass((r) => r.unweighted)} / ${pass((r) => r.weighted)} / ${pass((r) => r.optimum)} trên ${N_RANDOM} |`,
  `| Thời gian Greedy (tập đầy đủ) trung bình / lớn nhất | ${f1(mean(col((r) => r.tGreedyMs)))} / ${f1(Math.max(...col((r) => r.tGreedyMs)))} ms |`);

// ---------- E3 ----------
const e3 = ['layout,k,cum_weighted,marginal_gain'];
md.push('', '## E3 — Lợi ích cận biên theo số camera (Weighted Greedy)', '', '| Layout | k=1 | k=2 | k=3 | k=4 | k=5 |', '|---|---|---|---|---|---|');
for (const l of presets) {
  const z = buildZones(l), cams = greedyPlace(l, z, 5, true); let prev = 0; const cells: string[] = [];
  cams.forEach((_, i) => { const s = evaluate({ ...l, cameras: cams.slice(0, i + 1) }, z).score.weighted; e3.push(`${l.name.replace(/,/g, ' ')},${i + 1},${s},${f1(s - prev)}`); cells.push(`${s} (+${f1(s - prev)})`); prev = s; });
  md.push(`| ${l.name} | ${cells.join(' | ')} |`);
}
fs.writeFileSync(`${OUT}/e3_marginal.csv`, e3.join('\n'));
fs.writeFileSync(`${OUT}/summary.md`, md.join('\n') + '\n');
console.log('done →', OUT);
