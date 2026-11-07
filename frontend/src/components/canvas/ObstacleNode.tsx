import { memo, useRef, useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { Obstacle } from '../../types';
import { obsPoly, placeObstacle, satCollide } from '../../core/geometry';
import { OBS_FILL, type Selection } from './shared';

interface Props {
  obs: Obstacle; all: Obstacle[]; ppm: number; roomW: number; roomH: number; grid: number; selected: boolean;
  onSelect: (s: Selection) => void; onObstacle: (o: Obstacle) => void;
}

/** Vật cản kéo thả: snap lưới 0.5 m, SAT chống chồng lấn (tự hoàn tác), cửa tự khoá vào tường. */
export const ObstacleNode = memo(function ObstacleNode({ obs: o, all, ppm, roomW, roomH, grid, selected, onSelect, onObstacle }: Props) {
  const [conflict, setConflict] = useState(false);
  const origin = useRef({ x: 0, y: 0 });
  const test = (cx: number, cy: number) => {
    const n = placeObstacle(o, cx, cy, roomW, roomH, grid);
    return { n, hit: all.some((q) => q.id !== o.id && satCollide(obsPoly(n), obsPoly(q))) };
  };
  const wPx = o.w * ppm, hPx = o.h * ppm;
  return (
    <Group x={(o.x + o.w / 2) * ppm} y={(o.y + o.h / 2) * ppm} offsetX={wPx / 2} offsetY={hPx / 2} rotation={o.angle} draggable
      onMouseDown={() => onSelect({ kind: 'obs', id: o.id })}
      onDragStart={(e) => { origin.current = { x: e.target.x(), y: e.target.y() }; }}
      onDragMove={(e) => setConflict(test(e.target.x() / ppm, e.target.y() / ppm).hit)}
      onDragEnd={(e) => {
        const { n, hit } = test(e.target.x() / ppm, e.target.y() / ppm);
        setConflict(false);
        if (hit) { e.target.position(origin.current); return; }
        onObstacle(n); e.target.position({ x: (n.x + n.w / 2) * ppm, y: (n.y + n.h / 2) * ppm }); e.target.rotation(n.angle);
      }}>
      <Rect width={wPx} height={hPx} fill={OBS_FILL[o.type]} cornerRadius={3} stroke={selected ? (conflict ? '#ef4444' : '#eab308') : '#0f172a'} strokeWidth={selected ? 3 : 1} />
      {(wPx >= 60 && hPx >= 22) || wPx >= 90 ? <Text text={`${o.label}\n${o.elev}m`} width={wPx} height={hPx} align="center" verticalAlign="middle" fill="#fff" fontSize={10} listening={false} /> : null}
    </Group>
  );
});
