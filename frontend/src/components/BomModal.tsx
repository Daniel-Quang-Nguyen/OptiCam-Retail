import type { Layout } from '../types';
import { bomToCsv, buildBom } from '../core/bom';
import { download } from '../core/io';

export function BomModal({ layout, onClose }: { layout: Layout; onClose: () => void }) {
  const b = buildBom(layout);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Bảng dự toán vật tư & lắp đặt (BOM)</h3>
        <p className="muted">{layout.name} · tiêu chuẩn IEC 62676-4 DORI</p>
        <div className="scroll-x">
          <table>
            <thead><tr><th>Mã</th><th>Tọa độ (m)</th><th>Cao độ</th><th>Góc xoay</th><th>FOV</th><th>Mục tiêu</th><th>Model</th><th>Cáp (m)</th></tr></thead>
            <tbody>{b.rows.map((r) => (
              <tr key={r.id}><td>{r.id}</td><td>({r.x.toFixed(1)}, {r.y.toFixed(1)})</td><td>{r.height} m</td><td>{r.pan}°</td><td>{r.fov}°</td><td>{r.target}</td><td>{r.model}</td><td>{r.cableM}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p><b>{b.totalCameras}</b> camera IP PoE · <b>{b.totalCableM} m</b> cáp · dự toán phần cứng <b>~{b.totalCostVnd.toLocaleString('vi-VN')} VNĐ</b></p>
        <div className="row">
          <button onClick={() => download('opticam_bom.csv', bomToCsv(layout), 'text/csv;charset=utf-8')}>Tải CSV</button>
          <button onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
