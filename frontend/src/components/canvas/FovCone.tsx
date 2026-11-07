import { memo } from 'react';
import { Wedge } from 'react-konva';

/** Hình nón góc mở FOV của camera. */
export const FovCone = memo(function FovCone({ x, y, pan, fov, radiusPx, selected }: { x: number; y: number; pan: number; fov: number; radiusPx: number; selected: boolean }) {
  return <Wedge x={x} y={y} radius={radiusPx} angle={fov} rotation={pan - fov / 2}
    fill={selected ? 'rgba(14,165,233,.2)' : 'rgba(100,116,139,.1)'} stroke={selected ? '#0284c7' : '#64748b'} strokeWidth={1} dash={[4, 4]} listening={false} />;
});
