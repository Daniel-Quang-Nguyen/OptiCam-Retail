import { memo } from 'react';
import { Layer, Shape } from 'react-konva';
import type { Cell } from '../../types';
import { DORI_COLOR, PAD, riskColor, type ViewMode } from './shared';

/** LAYER 2 — Heatmap DORI / Ma trận rủi ro. Một Shape duy nhất; đo thời gian vẽ vào drawMsRef (KPI ≤ 200 ms). */
export const HeatmapLayer = memo(function HeatmapLayer({ cells, cellPx, view, drawMsRef }: { cells: Cell[]; cellPx: number; view: ViewMode; drawMsRef: { current: number } }) {
  return (
    <Layer x={PAD} y={PAD} listening={false} visible={view !== 'off'}>
      <Shape sceneFunc={(ctx) => {
        const t0 = performance.now();
        for (const c of cells) {
          if (c.solid) continue;
          ctx.setAttr('fillStyle', view === 'dori' ? DORI_COLOR[c.dori] : riskColor(c.w));
          ctx.fillRect(c.c * cellPx, c.r * cellPx, cellPx, cellPx);
          if (view === 'risk' && cellPx >= 34) {
            ctx.setAttr('font', `600 ${Math.min(12, cellPx * 0.28)}px "Segoe UI", sans-serif`);
            ctx.setAttr('textAlign', 'center');
            ctx.setAttr('textBaseline', 'middle');
            ctx.setAttr('fillStyle', '#0f172a');
            ctx.fillText(c.w.toFixed(1), (c.c + 0.5) * cellPx, (c.r + 0.5) * cellPx);
          }
        }
        drawMsRef.current = performance.now() - t0;
      }} />
    </Layer>
  );
});
