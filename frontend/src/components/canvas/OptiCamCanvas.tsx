import { useMemo, useRef, useState } from 'react';
import { Layer, Line, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import type { Camera, Cell, Layout, Obstacle, Person, RiskStroke, Weight } from '../../types';
import { round2, wallAnchors } from '../../core/geometry';
import { assessPersonAt } from '../../core/optics';
import { canPlacePerson } from '../../core/person';
import { BaseGridLayer } from './BaseGridLayer';
import { CameraNode } from './CameraNode';
import { HeatmapLayer } from './HeatmapLayer';
import { ObstacleNode } from './ObstacleNode';
import { PersonNode } from './PersonNode';
import { PersonInfo } from './PersonInfo';
import { PAD, type Segment, type Selection, type Tool, type ViewMode } from './shared';

export interface CanvasProps {
  layout: Layout; cells: Cell[]; view: ViewMode; tool: Tool; brush: Weight | null; selected: Selection;
  showGrid: boolean; showAnchors: boolean; measure: Segment; stageRef: React.RefObject<Konva.Stage>; drawMsRef: { current: number };
  onCamera: (c: Camera) => void; onObstacle: (o: Obstacle) => void; onPaint: (strokes: RiskStroke[]) => void;
  people: Person[]; onAddPerson: (x: number, y: number) => void; onPerson: (person: Person) => void; onInvalidPerson: () => void;
  onSelect: (s: Selection) => void; onRotate: (dir: 1 | -1) => void; onMeasure: (s: Segment) => void;
}

/** Ghép 4 Konva Layer + công cụ cọ rủi ro, đo khoảng cách, tooltip PPM. */
export function OptiCamCanvas(p: CanvasProps) {
  const { layout: L } = p, ppm = L.pixelsPerMeter, cellPx = L.gridM * ppm, cols = Math.round(L.widthM / L.gridM);
  const [hover, setHover] = useState<{ cell: Cell; x: number; y: number } | null>(null);
  const painting = useRef(false), measuring = useRef(false);
  const lastPaintPoint = useRef<[number, number] | null>(null);
  const anchors = useMemo(() => wallAnchors(L.widthM, L.heightM, L.gridM), [L.widthM, L.heightM, L.gridM]);
  const lock = p.tool === 'measure' || p.brush !== null; // khoá kéo thả khi đang cọ/đo

  const meters = (e: Konva.KonvaEventObject<MouseEvent>): [number, number] | null => {
    const pos = e.target.getStage()?.getPointerPosition();
    return pos ? [round2((pos.x - PAD) / ppm), round2((pos.y - PAD) / ppm)] : null;
  };
  const cellAt = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const m = meters(e), pos = e.target.getStage()?.getPointerPosition();
    if (!m || !pos) return null;
    const c = Math.floor(m[0] / L.gridM), r = Math.floor(m[1] / L.gridM);
    return c < 0 || r < 0 || c >= cols || r * cols + c >= p.cells.length ? null : { r, c, pos, cell: p.cells[r * cols + c] };
  };
  const paintAt = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!p.brush) return;
    const point = meters(e);
    if (!point || point[0] < 0 || point[1] < 0 || point[0] > L.widthM || point[1] > L.heightM) return;
    const radius = Math.max(0.05, L.gridM / Math.SQRT2);
    const previous = lastPaintPoint.current;
    const distance = previous ? Math.hypot(point[0] - previous[0], point[1] - previous[1]) : 0;
    const steps = previous ? Math.max(1, Math.ceil(distance / radius)) : 0;
    const strokes: RiskStroke[] = [];
    if (!previous) strokes.push({ x: point[0], y: point[1], radius, weight: p.brush });
    else for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = previous[0] + (point[0] - previous[0]) * t;
      const y = previous[1] + (point[1] - previous[1]) * t;
      if (x >= 0 && y >= 0 && x <= L.widthM && y <= L.heightM) strokes.push({ x, y, radius, weight: p.brush });
    }
    if (strokes.length) p.onPaint(strokes);
    lastPaintPoint.current = point;
  };
  const onDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) p.onSelect(null);
    if (p.tool === 'measure') { const m = meters(e); if (m) { measuring.current = true; p.onMeasure({ a: m, b: m }); } return; }
    if (p.brush) { painting.current = true; lastPaintPoint.current = null; paintAt(e); }
  };
  const onClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (p.tool !== 'person' || e.target.findAncestor('.person-node', true)) return;
    const point = meters(e);
    if (!point || point[0] < 0 || point[1] < 0 || point[0] > L.widthM || point[1] > L.heightM) return;
    if (canPlacePerson(point[0], point[1], L.widthM, L.heightM, L.obstacles)) p.onAddPerson(point[0], point[1]);
    else p.onInvalidPerson();
  };
  const onMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const h = cellAt(e);
    setHover(h && { cell: h.cell, x: h.pos.x, y: h.pos.y });
    if (measuring.current && p.measure) { const m = meters(e); if (m) p.onMeasure({ a: p.measure.a, b: m }); }
    if (painting.current && p.brush) paintAt(e);
  };
  const m = p.measure, mLen = m ? Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]) : 0;

  return (
    <div className="stage-wrap" style={{ cursor: p.tool === 'measure' || p.tool === 'person' ? 'crosshair' : p.brush ? 'cell' : 'default' }}>
      <Stage ref={p.stageRef} width={L.widthM * ppm + PAD * 2} height={L.heightM * ppm + PAD * 2}
        onMouseDown={onDown} onMouseMove={onMove} onClick={onClick}
        onMouseUp={() => { painting.current = false; measuring.current = false; lastPaintPoint.current = null; }}
        onMouseLeave={() => { painting.current = false; measuring.current = false; lastPaintPoint.current = null; setHover(null); }}
        onWheel={(e) => { e.evt.preventDefault(); p.onRotate(e.evt.deltaY < 0 ? 1 : -1); }}>
        <BaseGridLayer layout={L} showGrid={p.showGrid} showAnchors={p.showAnchors} anchors={anchors} />
        <HeatmapLayer cells={p.cells} cellPx={cellPx} view={p.view} drawMsRef={p.drawMsRef} />
        <Layer x={PAD} y={PAD} listening={!lock && p.tool === 'select'}>
          {L.obstacles.map((o) => (
            <ObstacleNode key={o.id} obs={o} all={L.obstacles} ppm={ppm} roomW={L.widthM} roomH={L.heightM} grid={L.gridM}
              selected={p.selected?.kind === 'obs' && p.selected.id === o.id} onSelect={p.onSelect} onObstacle={p.onObstacle} />
          ))}
        </Layer>
        <Layer x={PAD} y={PAD} listening={!lock && p.tool === 'select'}>
          {L.cameras.map((c) => (
            <CameraNode key={c.id} cam={c} ppm={ppm} roomW={L.widthM} roomH={L.heightM} grid={L.gridM}
              selected={p.selected?.kind === 'cam' && p.selected.id === c.id} onSelect={p.onSelect} onCamera={p.onCamera} />
          ))}
          {m && <>
            <Line points={[m.a[0] * ppm, m.a[1] * ppm, m.b[0] * ppm, m.b[1] * ppm]} stroke="#9333ea" strokeWidth={2} dash={[6, 4]} listening={false} />
            <Text x={((m.a[0] + m.b[0]) / 2) * ppm + 6} y={((m.a[1] + m.b[1]) / 2) * ppm - 14} text={`${mLen.toFixed(2)} m`} fontSize={13} fontStyle="bold" fill="#9333ea" listening={false} />
          </>}
        </Layer>
        <Layer x={PAD} y={PAD} listening={!lock}>
          {p.people.map((person) => (
            <PersonNode key={person.id} person={person} ppm={ppm} roomW={L.widthM} roomH={L.heightM} obstacles={L.obstacles}
              selected={p.selected?.kind === 'person' && p.selected.id === person.id}
              onSelect={p.onSelect} onMove={p.onPerson} />
          ))}
        </Layer>
      </Stage>
      {hover && !hover.cell.solid && p.tool === 'select' && (
        <div className="tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <b>{Math.round(hover.cell.ppm)} PPM</b> · {hover.cell.dori}<br />Ô ({hover.cell.r}, {hover.cell.c}) · W = {hover.cell.w.toFixed(1)}
        </div>
      )}
      {p.selected?.kind === 'person' && (() => {
        const person = p.people.find((item) => item.id === p.selected?.id);
        if (!person) return null;
        const stageW = L.widthM * ppm + PAD * 2, stageH = L.heightM * ppm + PAD * 2;
        const popupWidth = 258, gap = 20, personX = person.x * ppm + PAD;
        const right = personX + 19 + gap, left = personX - 19 - gap - popupWidth;
        const leftFits = left >= 8, rightFits = right + popupWidth <= stageW - 8;
        const roomOnLeft = left - 8, roomOnRight = stageW - right - popupWidth;
        const popupLeft = rightFits ? right : leftFits ? left : roomOnRight >= roomOnLeft ? right : left;
        const top = Math.max(8, Math.min(person.y * ppm + PAD - 145, stageH - 290));
        return <PersonInfo person={person} readings={assessPersonAt(L, person.x, person.y)} left={popupLeft} top={top} onClose={() => p.onSelect(null)} />;
      })()}
    </div>
  );
}
