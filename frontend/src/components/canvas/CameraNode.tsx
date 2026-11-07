import { memo } from 'react';
import { Circle, Group, Line, Text } from 'react-konva';
import type { Camera } from '../../types';
import { deg, round2, snapAngle, snapToWall } from '../../core/geometry';
import { FovCone } from './FovCone';
import { HANDLE, PAD, scheduleFrame, type Selection } from './shared';

interface Props {
  cam: Camera; ppm: number; roomW: number; roomH: number; grid: number; selected: boolean;
  onSelect: (s: Selection) => void; onCamera: (c: Camera) => void;
}

/** Camera: thân kéo thả bắt dính tường (Snap-to-Wall) + tay cầm xoay Δθ = 15° + hình nón FOV. */
export const CameraNode = memo(function CameraNode({ cam, ppm, roomW, roomH, grid, selected, onSelect, onCamera }: Props) {
  const cx = cam.x * ppm, cy = cam.y * ppm, a = (cam.pan * Math.PI) / 180;
  const hx = cx + HANDLE * Math.cos(a), hy = cy + HANDLE * Math.sin(a);
  return (
    <Group>
      <FovCone x={cx} y={cy} pan={cam.pan} fov={cam.fov} radiusPx={cam.range * ppm} selected={selected} />
      <Line points={[cx, cy, hx, hy]} stroke="#0284c7" strokeWidth={2} listening={false} />
      <Circle x={cx} y={cy} radius={9} fill={selected ? '#0284c7' : '#0f172a'} stroke="#fff" strokeWidth={2} draggable
        dragBoundFunc={(pos) => { const [x, y] = snapToWall((pos.x - PAD) / ppm, (pos.y - PAD) / ppm, roomW, roomH, grid); return { x: PAD + x * ppm, y: PAD + y * ppm }; }}
        onMouseDown={() => onSelect({ kind: 'cam', id: cam.id })}
        onDragMove={(e) => { const x = round2(e.target.x() / ppm), y = round2(e.target.y() / ppm); scheduleFrame(() => onCamera({ ...cam, x, y })); }} />
      <Circle x={hx} y={hy} radius={6} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} draggable
        dragBoundFunc={(pos) => { const t = (snapAngle(deg(Math.atan2(pos.y - PAD - cy, pos.x - PAD - cx)), 15) * Math.PI) / 180; return { x: PAD + cx + HANDLE * Math.cos(t), y: PAD + cy + HANDLE * Math.sin(t) }; }}
        onMouseDown={() => onSelect({ kind: 'cam', id: cam.id })}
        onDragMove={(e) => { const pan = snapAngle(deg(Math.atan2(e.target.y() - cy, e.target.x() - cx)), 15); scheduleFrame(() => onCamera({ ...cam, pan })); }} />
      <Text x={cx + 12} y={cy - 6} text={`${cam.id} (${cam.pan}°)`} fontSize={11} fontStyle="bold" fill="#0f172a" listening={false} />
    </Group>
  );
});
