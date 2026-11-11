import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import { OptiCamCanvas } from './components/canvas/OptiCamCanvas';
import { DORI_COLOR, RISK_COLOR, type Segment, type Selection, type Tool, type ViewMode } from './components/canvas/shared';
import { Inspector } from './components/Inspector';
import { BomModal } from './components/BomModal';
import { Scorecard } from './components/Scorecard';
import { PRESETS, withManualCams } from './data/presets';
import { buildZones, evaluate, RISK_DEFAULTS, SHELF_RISK_PROFILES } from './core/optics';
import { greedyPlace, makeCamera, manualFourCorners, minimumCamerasForTargets } from './core/optimizer';
import { requestOptimize } from './core/api';
import { addObstacle, removeObstacle, resizeObstacle, resizeRoom } from './core/editor';
import { exportBundle, download, parseBundle } from './core/io';
import { placeObstacle, satCollide, obsPoly, snapAngle, wallAnchors } from './core/geometry';
import { canPlacePerson } from './core/person';
import type { Camera, Layout, Obstacle, ObsType, Person, RiskStroke, Score, ShelfRiskCategory, Weight } from './types';

const MAX_CAMS = 20;

export default function App() {
  const [layout, setLayout] = useState<Layout>(() => withManualCams(PRESETS[0]));
  const [view, setView] = useState<ViewMode>('dori');
  const [brush, setBrush] = useState<Weight | null>(null);
  const [sel, setSel] = useState<Selection>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [grid, setGrid] = useState(true), [anchors, setAnchors] = useState(false), [bom, setBom] = useState(false);
  const [solveMs, setSolveMs] = useState(0), [renderMs, setRenderMs] = useState(0), [unweighted, setUnweighted] = useState<Score | null>(null);
  const [msg, setMsg] = useState(''), [fps, setFps] = useState(0);
  const [tool, setTool] = useState<Tool>('select'), [measure, setMeasure] = useState<Segment>(null);
  const stageRef = useRef<Konva.Stage>(null), drawMsRef = useRef(0);

  const zones = useMemo(() => buildZones(layout), [layout.obstacles, layout.risk, layout.riskStrokes, layout.widthM, layout.heightM, layout.gridM]);
  const { cells, score } = useMemo(() => evaluate(layout, zones), [layout.cameras, zones, layout.obstacles, layout.targetHeight]);
  const manual = useMemo(() => evaluate({ ...layout, cameras: manualFourCorners(layout) }, zones).score, [zones, layout.obstacles, layout.targetHeight]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };
  const patch = (p: Partial<Layout>) => setLayout((l) => ({ ...l, ...p }));
  const loadLayout = (l: Layout) => { setLayout(l); setPeople([]); setSel(null); setUnweighted(null); setSolveMs(0); };

  // useCallback([]) để React.memo của CameraNode/ObstacleNode không render lại thừa
  const updateCamera = useCallback((c: Camera) => setLayout((l) => ({ ...l, cameras: l.cameras.map((x) => (x.id === c.id ? c : x)) })), []);
  const updateObstacle = useCallback((o: Obstacle) => setLayout((l) => ({ ...l, obstacles: l.obstacles.map((x) => (x.id === o.id ? o : x)) })), []);
  const updatePerson = useCallback((person: Person) => setPeople((current) => current.map((item) => item.id === person.id ? person : item)), []);
  const paint = useCallback((strokes: RiskStroke[]) => setLayout((l) => ({ ...l, riskStrokes: [...l.riskStrokes, ...strokes] })), []);
  const select = useCallback((s: Selection) => setSel(s), []);

  const addObs = (t: ObsType) => {
    const r = addObstacle(layout, t);
    if (!r) return flash('Không còn chỗ trống cho khối này');
    setLayout(r); setSel({ kind: 'obs', id: r.obstacles[r.obstacles.length - 1].id }); setTool('select');
  };
  const editObstacle = (id: string, pt: Partial<Pick<Obstacle, 'label' | 'elev' | 'w' | 'h' | 'riskCategory' | 'riskWmax' | 'riskR0' | 'riskR'>>) =>
    setLayout((l) => {
      const o = l.obstacles.find((x) => x.id === id); if (!o) return l;
      const { w, h, ...rest } = pt;
      if (pt.riskCategory !== undefined) {
        rest.riskCategory = pt.riskCategory;
        if (pt.riskCategory !== 'custom' && pt.riskWmax === undefined) {
          rest.riskWmax = SHELF_RISK_PROFILES[pt.riskCategory].wmax;
        }
      }
      if (pt.riskWmax !== undefined) {
        rest.riskWmax = Math.max(1, Math.min(5, pt.riskWmax));
        if (o.type === 'shelf' && pt.riskCategory === undefined) rest.riskCategory = 'custom';
      }
      if (pt.riskR0 !== undefined) {
        rest.riskR0 = Math.max(0, pt.riskR0);
        if ((pt.riskR ?? o.riskR ?? RISK_DEFAULTS[o.type].radius) <= rest.riskR0) rest.riskR = rest.riskR0 + 0.1;
      }
      if (pt.riskR !== undefined) rest.riskR = Math.max((pt.riskR0 ?? o.riskR0 ?? RISK_DEFAULTS[o.type].r0) + 0.1, pt.riskR);
      const l2 = { ...l, obstacles: l.obstacles.map((x) => (x.id === id ? { ...x, ...rest } : x)) };
      return w !== undefined || h !== undefined ? resizeObstacle(l2, id, w ?? o.w, h ?? o.h) : l2;
    });
  const editCamera = (id: string, pt: Partial<Pick<Camera, 'fov' | 'res' | 'height' | 'pan' | 'range' | 'model'>>) =>
    setLayout((l) => ({
      ...l,
      cameras: l.cameras.map((c) => (c.id === id
        ? {
          ...c,
          ...pt,
          ...(pt.pan !== undefined ? { pan: snapAngle(pt.pan) } : {}),
          ...(pt.fov !== undefined ? { fov: Math.max(30, Math.min(140, pt.fov)) } : {}),
          ...(pt.res !== undefined ? { res: Math.max(640, Math.min(7680, pt.res)) } : {}),
          ...(pt.range !== undefined ? { range: Math.max(1, Math.min(30, pt.range)) } : {}),
          ...(pt.height !== undefined ? { height: Math.max(1.8, Math.min(4, pt.height)) } : {})
        }
        : c))
    }));
  const setRoom = (w: number, h: number) => { setLayout((l) => resizeRoom(l, w, h)); setUnweighted(null); };
  const calibrate = (real: number) => {
    if (!measure || !layout.background) return;
    const len = Math.hypot(measure.b[0] - measure.a[0], measure.b[1] - measure.a[1]);
    patch({ background: { ...layout.background, widthM: Math.round(((layout.background.widthM * real) / len) * 100) / 100 } });
    setMeasure(null); flash('Đã hiệu chuẩn tỷ lệ ảnh nền');
  };

  const rotate = (dir: 1 | -1) => {
    if (sel?.kind === 'cam') setLayout((l) => ({ ...l, cameras: l.cameras.map((c) => (c.id === sel.id ? { ...c, pan: snapAngle(c.pan + dir * 15) } : c)) }));
    if (sel?.kind === 'obs') setLayout((l) => {
      const o = l.obstacles.find((x) => x.id === sel.id); if (!o || o.type === 'entrance') return l;
      const n = placeObstacle({ ...o, angle: snapAngle(o.angle + dir * 15) }, o.x + o.w / 2, o.y + o.h / 2, l.widthM, l.heightM, l.gridM);
      return l.obstacles.some((q) => q.id !== o.id && satCollide(obsPoly(n), obsPoly(q))) ? l : { ...l, obstacles: l.obstacles.map((x) => (x.id === o.id ? n : x)) };
    });
  };
  const addCamera = () => setLayout((l) => {
    if (l.cameras.length >= MAX_CAMS) return l;
    const used = new Set(l.cameras.map((c) => `${c.x}_${c.y}`));
    const [x, y] = wallAnchors(l.widthM, l.heightM, l.gridM).find(([ax, ay]) => !used.has(`${ax}_${ay}`)) ?? [0, 0];
    const pan = (Math.atan2(l.heightM / 2 - y, l.widthM / 2 - x) * 180) / Math.PI;
    return { ...l, cameras: [...l.cameras, { ...makeCamera(`CAM-${String(l.cameras.length + 1).padStart(2, '0')}`, x, y, pan), target: 'Giám sát bổ sung' }] };
  });
  const addPerson = (x: number, y: number) => {
    if (!canPlacePerson(x, y, layout.widthM, layout.heightM, layout.obstacles)) return flash('Không thể đặt người sát tường hoặc chồng lên vật cản');
    const used = new Set(people.map((person) => person.id));
    let index = 1;
    while (used.has(`PERSON-${String(index).padStart(2, '0')}`)) index++;
    const person = { id: `PERSON-${String(index).padStart(2, '0')}`, x, y };
    setPeople((current) => [...current, person]);
    setSel({ kind: 'person', id: person.id });
    setTool('select');
  };
  const deleteSelected = () => {
    if (sel?.kind === 'cam') setLayout((l) => (l.cameras.length > 1 ? { ...l, cameras: l.cameras.filter((c) => c.id !== sel.id) } : l));
    if (sel?.kind === 'obs') setLayout((l) => removeObstacle(l, sel.id));
    if (sel?.kind === 'person') setPeople((current) => current.filter((person) => person.id !== sel.id));
    setSel(null);
  };

  const cameraProfilesFor = (count: number) => Array.from({ length: count }, (_, index) =>
    layout.cameras[index] ?? makeCamera(`CAM-0${index + 1}`, 0, 0, 0)
  );
  const autoOptimize = async (count = 3) => {
    const t0 = performance.now();
    const cameraProfiles = cameraProfilesFor(count);
    const { cameras, source } = await requestOptimize(layout, zones, count, cameraProfiles);
    const t1 = performance.now();
    setLayout((l) => ({ ...l, cameras })); setSolveMs(t1 - t0);
    requestAnimationFrame(() => requestAnimationFrame(() => { setRenderMs(performance.now() - t1); flash(`Auto-Optimize xong (${cameras.length}/${count} camera · ${source === 'api' ? 'Backend API' : 'Greedy trên trình duyệt'})`); }));
  };
  const minimizeCameras = () => {
    const t0 = performance.now();
    const cameraProfiles = cameraProfilesFor(layout.cameras.length);
    const result = minimumCamerasForTargets(layout, zones, cameraProfiles);
    const t1 = performance.now();
    setLayout((current) => ({ ...current, cameras: result.cameras }));
    setSolveMs(t1 - t0);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setRenderMs(performance.now() - t1);
      const status = result.metTargets ? 'đạt KPI' : 'chưa đạt đủ KPI';
      flash(`${status}: giữ ${result.cameras.length}/${cameraProfiles.length} camera · Đỏ ${result.red}% · Vàng ${result.yellow}%`);
    }));
  };
  const runUnweighted = () => {
    const count = layout.cameras.length;
    const cameraProfiles = cameraProfilesFor(count).map(({ fov, res, range, height, model }) => ({ fov, res, range, height, model }));
    setUnweighted(evaluate({ ...layout, cameras: greedyPlace(layout, zones, count, false, { cameraProfiles }) }, zones).score);
  };
  const stress = () => setLayout((l) => ({ ...l, cameras: Array.from({ length: MAX_CAMS }, (_, i) => { const a = wallAnchors(l.widthM, l.heightM, l.gridM); const [x, y] = a[Math.floor((i * a.length) / MAX_CAMS)]; return makeCamera(`CAM-${String(i + 1).padStart(2, '0')}`, x, y, (Math.atan2(l.heightM / 2 - y, l.widthM / 2 - x) * 180) / Math.PI); }) }));

  const savePng = async () => {
    if (!stageRef.current) return;
    download('opticam_canvas.png', await (await fetch(stageRef.current.toDataURL({ pixelRatio: 2 }))).blob());
  };
  const benchmark = async () => {
    stress(); setBrush(null); setTool('select');
    const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
    await frame(); await frame();
    const dts: number[] = []; let last = await frame();
    for (let f = 0; f < 120; f++) {
      const now = await frame(); dts.push(now - last); last = now;
      setLayout((l) => ({ ...l, cameras: l.cameras.map((c, i) => ({ ...c, pan: snapAngle(c.pan + (f % 3 === i % 3 ? 15 : 0)) })) }));
    }
    const mean = dts.reduce((a, b) => a + b, 0) / dts.length, p95 = [...dts].sort((a, b) => a - b)[Math.floor(dts.length * 0.95)];
    flash(`20 camera × 120 khung: ${(1000 / mean).toFixed(0)} FPS TB · p95 ${p95.toFixed(1)} ms · vẽ heatmap ${drawMsRef.current.toFixed(1)} ms`);
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>, kind: 'json' | 'bg') => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        if (kind === 'json') { loadLayout(parseBundle(String(rd.result))); flash('Đã nạp layout'); }
        else patch({ background: { dataUrl: String(rd.result), widthM: layout.widthM, opacity: 0.5, visible: true } });
      } catch (err) { flash(`Lỗi: ${(err as Error).message}`); }
    };
    kind === 'json' ? rd.readAsText(f) : rd.readAsDataURL(f);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'escape') setBom(false); else if (k === 'b') setBom((v) => !v); else if (k === 'o') autoOptimize();
      else if (k === 'g') setGrid((v) => !v); else if (k === 'a') setAnchors((v) => !v); else if (k === 'c') addCamera();
      else if (k === 'r') rotate(1); else if (k === 'delete' || k === 'backspace') deleteSelected();
      else if (['1', '2', '3'].includes(k)) loadLayout(withManualCams(PRESETS[+k - 1]));
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => { let n = 0, t = performance.now(), id = 0; const loop = () => { n++; const now = performance.now(); if (now - t >= 500) { setFps(Math.round((n * 1000) / (now - t))); n = 0; t = now; } id = requestAnimationFrame(loop); }; id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id); }, []);

  const bg = layout.background;
  return (
    <div className="app">
      <header>
        <div><h1>OptiCam-Retail</h1><span className="muted">{layout.name} · {layout.widthM}×{layout.heightM} m ({layout.widthM * layout.heightM} m²) · lưới {layout.gridM} m · {layout.pixelsPerMeter} px/m</span></div>
        <div className="row">
          {PRESETS.map((p, i) => <button key={p.name} onClick={() => loadLayout(withManualCams(p))} title={p.name}>Layout {i + 1}</button>)}
          <button className="primary" onClick={() => autoOptimize()}>Auto-Optimize (3 Cameras)</button>
          <button onClick={() => autoOptimize(layout.cameras.length)} disabled={layout.cameras.length < 1 || layout.cameras.length > MAX_CAMS} title={layout.cameras.length > MAX_CAMS ? `Tối đa ${MAX_CAMS} camera mỗi lần tối ưu` : undefined}>
            Tối ưu theo số cam hiện có ({layout.cameras.length})
          </button>
          <button onClick={minimizeCameras} disabled={layout.cameras.length < 1 || layout.cameras.length > MAX_CAMS} title="Tìm số camera ít nhất đạt Đỏ ≥95% và Vàng ≥80%; giữ cấu hình camera đã nhập">
            Tìm số cam tối thiểu (Đỏ 95% · Vàng 80%)
          </button>
          <button onClick={() => setLayout((l) => ({ ...l, cameras: manualFourCorners(l) }))}>Manual 4-Corner Setup</button>
        </div>
      </header>

      <div className="toolbar">
        <span>Lớp phủ</span>
        {(['dori', 'risk', 'off'] as ViewMode[]).map((v) => <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{{ dori: 'Heatmap DORI', risk: 'Ma trận rủi ro W', off: 'Tắt' }[v]}</button>)}
        <span>Cọ rủi ro</span>
        <button className={brush === null ? 'on' : ''} onClick={() => { setBrush(null); setTool('select'); }}>Kéo thả</button>
        {([5, 3, 1] as Weight[]).map((w) => <button key={w} className={brush === w ? 'on' : ''} style={{ borderColor: RISK_COLOR[w >= 4 ? 'red' : w >= 2 ? 'yellow' : 'green'].replace(/[\d.]+\)$/, '1)') }} onClick={() => { setBrush(w); setTool('select'); }}>W = {w}.0</button>)}
        <button onClick={() => patch({ risk: {}, riskStrokes: [] })}>Xoá cọ</button>
        <span className="sep" />
        <button className={grid ? 'on' : ''} onClick={() => setGrid(!grid)}>Lưới</button>
        <button className={anchors ? 'on' : ''} onClick={() => setAnchors(!anchors)}>Điểm neo</button>
        <span>Thêm</span>
        <button onClick={() => addObs('shelf')}>+ Kệ 1.8 m</button>
        <button onClick={() => addObs('pos')}>+ POS</button>
        <button onClick={() => addObs('entrance')}>+ Cửa</button>
        <button onClick={addCamera}>+ Camera</button>
        <button className={tool === 'person' ? 'on' : ''} title={tool === 'person' ? 'Bấm vào mặt bằng để đặt người' : 'Đặt người để xem DORI tại mặt, ngực, bụng và chân'} onClick={() => { setTool(tool === 'person' ? 'select' : 'person'); setBrush(null); }}>
          {tool === 'person' ? 'Bấm mặt bằng để đặt người' : '+ Người đánh giá'}
        </button>
        <button className={tool === 'measure' ? 'on' : ''} onClick={() => { setTool(tool === 'measure' ? 'select' : 'measure'); setBrush(null); setMeasure(null); }}>Đo (m)</button>
        <button onClick={deleteSelected} disabled={!sel}>Xoá đã chọn</button>
        <button onClick={() => rotate(1)} disabled={!sel}>Xoay +15°</button>
        <button onClick={benchmark}>Benchmark 20 cam</button>
        <span className="muted">{fps} FPS</span>
      </div>

      <main>
        <div>
          <OptiCamCanvas layout={layout} cells={cells} view={view} tool={tool} brush={brush} selected={sel} people={people} onAddPerson={addPerson} onPerson={updatePerson} onInvalidPerson={() => flash('Không thể đặt người sát tường hoặc chồng lên vật cản')} showGrid={grid} showAnchors={anchors} measure={measure} stageRef={stageRef} drawMsRef={drawMsRef}
            onCamera={updateCamera} onObstacle={updateObstacle} onPaint={paint} onSelect={select} onRotate={rotate} onMeasure={setMeasure} />
          <div className="legend">
            {view === 'dori' && (['identification', 'recognition', 'observation', 'detection', 'blind'] as const).map((k) => <span key={k}><i style={{ background: DORI_COLOR[k] }} />{{ identification: '≥250 PPM', recognition: '≥125', observation: '≥62', detection: '≥25', blind: 'mù / <25' }[k]}</span>)}
            {view === 'risk' && <div className="risk-legend">
              <span className="risk-legend-title">W theo từng ô — số hiển thị khi phóng to</span>
              <div className="risk-gradient" aria-label="Thang màu trọng số từ W bằng 1 đến W bằng 5" />
              <div className="risk-ticks"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
              <div className="risk-bands"><span>Thấp: W&lt;2</span><span>Vừa: 2≤W&lt;4</span><span>Cao: W≥4</span></div>
            </div>}
          </div>
        </div>

        <aside>
          <Inspector layout={layout} sel={sel} measure={measure} onTargetHeight={(targetHeight) => patch({ targetHeight })} onGrid={(gridM) => patch({ gridM: Math.max(0.1, Math.min(2, gridM)), risk: {} })} onObs={editObstacle} onCam={editCamera} onRoom={setRoom} onScale={(v) => patch({ pixelsPerMeter: v })} onCalibrate={calibrate} />
          <Scorecard d={{ manual, live: score, unweighted, solveMs, renderMs, heatMs: drawMsRef.current }} />
          <div className="panel">
            <h3>Dự án</h3>
            <div className="row wrap">
              <button onClick={runUnweighted}>Chạy Greedy không trọng số</button>
              <button onClick={() => setBom(true)}>Bảng BOM</button>
              <button onClick={() => download('opticam_layout.json', exportBundle(layout, score))}>Export JSON</button>
              <label className="btn">Import JSON<input type="file" accept=".json" hidden onChange={(e) => onFile(e, 'json')} /></label>
              <button onClick={savePng}>PNG</button>
            </div>
          </div>
          <div className="panel">
            <h3>Ảnh nền tham chiếu</h3>
            <label className="btn">Nạp ảnh mặt bằng<input type="file" accept="image/*" hidden onChange={(e) => onFile(e, 'bg')} /></label>
            {bg && <div className="col">
              <label>Bề ngang ảnh = {bg.widthM.toFixed(1)} m<input type="range" min={2} max={40} step={0.5} value={bg.widthM} onChange={(e) => patch({ background: { ...bg, widthM: +e.target.value } })} /></label>
              <label>Độ mờ<input type="range" min={0.1} max={1} step={0.1} value={bg.opacity} onChange={(e) => patch({ background: { ...bg, opacity: +e.target.value } })} /></label>
              <div className="row"><button onClick={() => patch({ background: { ...bg, visible: !bg.visible } })}>{bg.visible ? 'Ẩn' : 'Hiện'}</button><button onClick={() => patch({ background: undefined })}>Gỡ</button></div>
            </div>}
          </div>
          <p className="muted small">Phím: O tối ưu · B BOM · G lưới · A điểm neo · C thêm cam · R / cuộn chuột xoay 15° · Del xoá vật đã chọn · 1/2/3 đổi layout</p>
        </aside>
      </main>
      {bom && <BomModal layout={layout} onClose={() => setBom(false)} />}
      {msg && <div className="toast">{msg}</div>}
    </div>
  );
}
