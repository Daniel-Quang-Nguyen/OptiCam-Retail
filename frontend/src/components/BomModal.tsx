import { useEffect, useRef } from 'react';
import type { Layout } from '../types';
import { bomToCsv, buildBom } from '../core/bom';
import { download } from '../core/io';

export function BomModal({ layout, onClose }: { layout: Layout; onClose: () => void }) {
  const b = buildBom(layout);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = closeButton.current?.closest('[role="dialog"]');
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onClose]);

  return (
    <div className="modal" role="presentation" onClick={onClose}>
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bom-title"
        aria-describedby="bom-description"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bom-title">Bảng dự toán vật tư & lắp đặt (BOM)</h2>
        <p id="bom-description" className="muted">{layout.name} · tiêu chuẩn IEC 62676-4 DORI</p>
        <div className="scroll-x">
          <table aria-label="Danh sách thiết bị và thông số lắp đặt">
            <thead><tr><th scope="col">Mã</th><th scope="col">Tọa độ (m)</th><th scope="col">Cao độ</th><th scope="col">Góc xoay</th><th scope="col">FOV</th><th scope="col">Mục tiêu</th><th scope="col">Model</th><th scope="col">Cáp (m)</th></tr></thead>
            <tbody>{b.rows.map((r) => (
              <tr key={r.id}><td>{r.id}</td><td>({r.x.toFixed(1)}, {r.y.toFixed(1)})</td><td>{r.height} m</td><td>{r.pan}°</td><td>{r.fov}°</td><td>{r.target}</td><td>{r.model}</td><td>{r.cableM}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p><b>{b.totalCameras}</b> camera IP PoE · <b>{b.totalCableM} m</b> cáp · dự toán phần cứng <b>~{b.totalCostVnd.toLocaleString('vi-VN')} VNĐ</b></p>
        <div className="row">
          <button onClick={() => download('opticam_bom.csv', bomToCsv(layout), 'text/csv;charset=utf-8')}>Tải CSV</button>
          <button ref={closeButton} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
