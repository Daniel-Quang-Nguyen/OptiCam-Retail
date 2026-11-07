import type { Score } from '../types';

export interface Compare { manual: Score; live: Score; unweighted: Score | null; solveMs: number; renderMs: number; heatMs: number }
const ok = (v: number, t: number) => (v >= t ? 'pass' : 'fail');

export function Scorecard({ d }: { d: Compare }) {
  const cols: [string, Score | null][] = [['Thủ công 4 góc', d.manual], ['Hiện tại (live)', d.live], ['Greedy không trọng số', d.unweighted]];
  const row = (label: string, f: (s: Score) => string, cls?: (s: Score) => string) => (
    <tr><th>{label}</th>{cols.map(([k, s]) => <td key={k} className={s && cls ? cls(s) : ''}>{s ? f(s) : '—'}</td>)}</tr>
  );
  return (
    <div className="panel">
      <h3>Bảng đối chứng (Live Scorecard)</h3>
      <table>
        <thead><tr><th></th>{cols.map(([k]) => <th key={k}>{k}</th>)}</tr></thead>
        <tbody>
          {row('Vùng Đỏ ≥ 250 PPM (KPI ≥ 95%)', (s) => `${s.red}%`, (s) => ok(s.red, 95))}
          {row('Hành lang ≥ 125 PPM (KPI ≥ 80%)', (s) => `${s.yellow}%`, (s) => ok(s.yellow, 80))}
          {row('Tổng điểm Σ W × DORI', (s) => String(s.weighted))}
          {row('Số camera', (s) => String(s.cams))}
        </tbody>
      </table>
      <p className="muted">Giải + vẽ lại heatmap: <b className={d.solveMs && d.solveMs + d.renderMs < 2000 ? 'pass' : ''}>{d.solveMs ? `${(d.solveMs + d.renderMs).toFixed(0)} ms` : '—'}</b> (KPI &lt; 2000 ms) · tính lưới: {d.live.ms} ms</p>
      <p className="muted">Vẽ heatmap (lần cuối): <b className={d.heatMs && d.heatMs <= 200 ? 'pass' : ''}>{d.heatMs ? `${d.heatMs.toFixed(1)} ms` : '—'}</b> (KPI ≤ 200 ms)</p>
    </div>
  );
}
