import { memo } from 'react';
import { Circle, Group, Line } from 'react-konva';
import type { Obstacle, Person } from '../../types';
import { round2 } from '../../core/geometry';
import { canPlacePerson } from '../../core/person';
import { useRef } from 'react';
import { PAD, type Selection } from './shared';

interface Props {
  person: Person;
  ppm: number;
  selected: boolean;
  onSelect: (selection: Selection) => void;
  roomW: number;
  roomH: number;
  obstacles: Obstacle[];
  onMove: (person: Person) => void;
}

export const PersonNode = memo(function PersonNode({ person, ppm, selected, roomW, roomH, obstacles, onSelect, onMove }: Props) {
  const x = person.x * ppm, y = person.y * ppm, color = selected ? '#f97316' : '#7c3aed';
  const lastValid = useRef({ x, y });
  return (
    <Group
      name="person-node"
      x={x}
      y={y}
      draggable
      onMouseDown={() => onSelect({ kind: 'person', id: person.id })}
      onDragStart={() => { lastValid.current = { x: x + PAD, y: y + PAD }; }}
      dragBoundFunc={(pos) => {
        const nextX = (pos.x - PAD) / ppm, nextY = (pos.y - PAD) / ppm;
        if (canPlacePerson(nextX, nextY, roomW, roomH, obstacles)) {
          lastValid.current = pos;
          return pos;
        }
        return lastValid.current;
      }}
      onDragEnd={(event) => {
        const next = {
          ...person,
          x: round2(Math.max(0, Math.min(event.target.x() / ppm, roomW))),
          y: round2(Math.max(0, Math.min(event.target.y() / ppm, roomH)))
        };
        onMove(next);
      }}
    >
      <Circle radius={19} fill="rgba(255,255,255,0.01)" />
      <Circle y={-9} radius={4} fill={color} stroke="#fff" strokeWidth={1.5} />
      <Line points={[0, -4, 0, 5, -6, 14, 0, 5, 6, 14]} stroke={color} strokeWidth={3} lineCap="round" lineJoin="round" />
      <Line points={[0, -2, -7, 4, 7, 4]} stroke={color} strokeWidth={3} lineCap="round" lineJoin="round" />
      <Circle y={-9} radius={7} stroke={selected ? '#f97316' : 'transparent'} strokeWidth={2} listening={false} />
    </Group>
  );
});
