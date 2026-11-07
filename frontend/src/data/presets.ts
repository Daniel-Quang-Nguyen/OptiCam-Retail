import { normalizeLayout } from '../core/io';
import { manualFourCorners } from '../core/optimizer';
import a from '../../../data_samples/store_60m2.json';
import b from '../../../data_samples/circle_k_75m2.json';
import c from '../../../data_samples/ministop_50m2.json';

export const PRESETS = [a, b, c].map(normalizeLayout);
/** Khởi tạo layout kèm phương án đối chứng 4 góc tường. */
export const withManualCams = (l: ReturnType<typeof normalizeLayout>) => ({ ...structuredClone(l), cameras: manualFourCorners(l) });
