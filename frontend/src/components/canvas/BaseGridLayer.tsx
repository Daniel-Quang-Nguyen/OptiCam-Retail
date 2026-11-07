import { useEffect, useState } from 'react';
import { Circle, Image as KImage, Layer, Rect, Shape } from 'react-konva';
import type { Layout } from '../../types';
import type { Pt } from '../../core/geometry';
import { PAD } from './shared';

function useImg(src?: string) {
  const [img, set] = useState<HTMLImageElement>();
  useEffect(() => { if (!src) { set(undefined); return; } const i = new Image(); i.onload = () => set(i); i.src = src; }, [src]);
  return img;
}

/** LAYER 1 — nền tĩnh (listening=false): ảnh nền theo mét, lưới 0.5 m, tường bao, điểm neo. */
export function BaseGridLayer({ layout: L, showGrid, showAnchors, anchors }: { layout: Layout; showGrid: boolean; showAnchors: boolean; anchors: Pt[] }) {
  const ppm = L.pixelsPerMeter, px = (m: number) => m * ppm, W = px(L.widthM), H = px(L.heightM);
  const bg = useImg(L.background?.dataUrl), g = px(L.gridM);
  return (
    <Layer x={PAD} y={PAD} listening={false}>
      <Rect width={W} height={H} fill="#f8fafc" />
      {bg && L.background?.visible && <KImage image={bg} width={px(L.background.widthM)} height={(px(L.background.widthM) * bg.height) / bg.width} opacity={L.background.opacity} />}
      {showGrid && <Shape sceneFunc={(ctx) => {
        ctx.beginPath();
        for (let i = 0; i <= Math.round(L.widthM / L.gridM); i++) { ctx.moveTo(i * g, 0); ctx.lineTo(i * g, H); }
        for (let j = 0; j <= Math.round(L.heightM / L.gridM); j++) { ctx.moveTo(0, j * g); ctx.lineTo(W, j * g); }
        ctx.setAttr('strokeStyle', '#cbd5e1'); ctx.setAttr('lineWidth', 0.6); ctx.stroke();
      }} />}
      <Rect width={W} height={H} stroke="#0f172a" strokeWidth={4} />
      {showAnchors && anchors.map(([x, y]) => <Circle key={`${x}_${y}`} x={px(x)} y={px(y)} radius={3} fill="#fff" stroke="#2563eb" strokeWidth={1} />)}
    </Layer>
  );
}
