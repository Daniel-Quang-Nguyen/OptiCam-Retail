import type { Dori, Person } from '../../types';
import { PERSON_REGIONS } from '../../types';

const DORI_LABEL: Record<Dori, string> = {
  identification: 'Nhận dạng',
  recognition: 'Nhận biết',
  observation: 'Quan sát',
  detection: 'Phát hiện',
  blind: 'Mù'
};

const DORI_CLASS: Record<Dori, string> = {
  identification: 'dori-identification',
  recognition: 'dori-recognition',
  observation: 'dori-observation',
  detection: 'dori-detection',
  blind: 'dori-blind'
};

interface Props {
  person: Person;
  readings: Array<{ key: string; label: string; height: number; ppm: number; dori: Dori }>;
  left: number;
  top: number;
  onClose: () => void;
}

export function PersonInfo({ person, readings, left, top, onClose }: Props) {
  return (
    <section className="person-info" style={{ left, top }} aria-label={`Thông tin ${person.id}`}>
      <header className="person-info-header">
        <div><strong>{person.id}</strong><div className="muted small">({person.x.toFixed(1)}, {person.y.toFixed(1)}) m</div></div>
        <button aria-label="Đóng thông tin người" onClick={onClose}>×</button>
      </header>
      <p className="muted small">DORI tốt nhất từ các camera tại từng điểm trên người</p>
      <table aria-label={`DORI theo khu vực trên ${person.id}`}>
        <thead><tr><th scope="col">Khu vực</th><th scope="col">DORI</th><th scope="col">PPM</th></tr></thead>
        <tbody>
          {PERSON_REGIONS.map((region) => {
            const reading = readings.find((item) => item.key === region.key);
            return (
              <tr key={region.key}>
                <th scope="row">{region.label}</th>
                <td><span className={`dori-badge ${DORI_CLASS[reading?.dori ?? 'blind']}`}>{DORI_LABEL[reading?.dori ?? 'blind']}</span></td>
                <td>{Math.round(reading?.ppm ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted small">Điểm đánh giá theo chiều cao tương ứng: {PERSON_REGIONS.map((region) => `${region.label} ${region.height} m`).join(' · ')}</p>
    </section>
  );
}
