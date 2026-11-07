import { memo } from 'react';
import { Layer, Shape } from 'react-konva';
import type { Cell } from '../../types';
import { DORI_COLOR, PAD, RISK_COLOR, type ViewMode } from './shared';

/** LAYER 2 — Heatmap DORI / Ma trận rủi ro. Một Shape duy nhất; đo thời gian vẽ vào drawMsRef (KPI ≤ 200 ms). */
export const HeatmapLayer = memo(function HeatmapLayer({ cells, cellPx, view, drawMsRef }: { cells: Cell[]; cellPx: number; view: ViewMode; drawMsRef: { current: number } }) {
  return (
    <Layer x={PAD} y={PAD} listening={false} visible={view !== 'off'}>
      <Shape sceneFunc={(ctx) => {
        const t0 = performance.now();
        for (const c of cells) {
          if (c.solid) continue;
          ctx.setAttr('fillStyle', view === 'dori' ? DORI_COLOR[c.dori] : RISK_COLOR[c.w]);
          ctx.fillRect(c.c * cellPx, c.r * cellPx, cellPx, cellPx);
        }
        drawMsRef.current = performance.now() - t0;
      }} />
    </Layer>
  );
});
