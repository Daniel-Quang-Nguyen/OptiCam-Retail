export const CAMERA_QUALITY_PRESETS = [
  { id: '2mp', label: '2 MP · 1920 × 1080', resolution: 1920, model: 'OptiCam IP 2MP 1080p' },
  { id: '4mp', label: '4 MP · 2560 × 1440', resolution: 2560, model: 'OptiCam IP 4MP 1440p' },
  { id: '8mp', label: '8 MP · 3840 × 2160', resolution: 3840, model: 'OptiCam IP 8MP 4K' }
] as const;

export type CameraQualityId = (typeof CAMERA_QUALITY_PRESETS)[number]['id'] | 'custom';

export const cameraQualityForResolution = (resolution: number): CameraQualityId =>
  CAMERA_QUALITY_PRESETS.find((preset) => preset.resolution === resolution)?.id ?? 'custom';
