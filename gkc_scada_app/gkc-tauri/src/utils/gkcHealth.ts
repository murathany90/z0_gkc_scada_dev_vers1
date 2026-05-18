export type GkcHealthStatusValue = 'ok' | 'fail' | 'scanning' | 'idle';

export interface GkcHealthVisual {
  status: GkcHealthStatusValue;
  emoji: string;
  bullet: string;
  color: string;
  label: string;
  title: string;
}

export interface GkcHealthWindow {
  start: Date;
  end: Date;
  startYtbs: string;
  endYtbs: string;
}

export interface GkcQueryMeta {
  deviceId: string;
  measurementType: string;
  startTime: string;
  endTime: string;
  gerilim: string;
  fazId: string;
}

export interface GkcFilterSnapshot {
  cihaz: string;
  olcumTipi: string;
  startTime: string;
  endTime: string;
  gerilim: string;
  faz: string;
}

const HEALTH_WINDOW_DELAY_MINUTES = 15;
const HEALTH_WINDOW_DURATION_MINUTES = 5;

const pad = (value: number) => String(value).padStart(2, '0');

export const formatGkcYtbsDateTime = (date: Date): string =>
  `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const buildGkcHealthWindow = (now = new Date()): GkcHealthWindow => {
  const end = new Date(now.getTime() - HEALTH_WINDOW_DELAY_MINUTES * 60_000);
  const start = new Date(end.getTime() - HEALTH_WINDOW_DURATION_MINUTES * 60_000);
  return {
    start,
    end,
    startYtbs: formatGkcYtbsDateTime(start),
    endYtbs: formatGkcYtbsDateTime(end),
  };
};

const normalizeHealthStatus = (status: unknown): GkcHealthStatusValue =>
  status === 'ok' || status === 'fail' || status === 'scanning' || status === 'idle'
    ? status
    : 'idle';

export const getGkcHealthVisual = (status: unknown): GkcHealthVisual => {
  const normalized = normalizeHealthStatus(status);
  if (normalized === 'ok') {
    return {
      status: 'ok',
      emoji: '🟢',
      bullet: '●',
      color: '#22c55e',
      label: 'Sağlıklı',
      title: 'GKÇ sağlık kontrolü başarılı',
    };
  }
  if (normalized === 'fail') {
    return {
      status: 'fail',
      emoji: '🔴',
      bullet: '●',
      color: '#ef4444',
      label: 'Veri yok',
      title: 'GKÇ sağlık kontrolü başarısız',
    };
  }
  if (normalized === 'scanning') {
    return {
      status: 'scanning',
      emoji: '🔵',
      bullet: '●',
      color: '#3b82f6',
      label: 'Sorgulanıyor',
      title: 'GKÇ sağlık kontrolü sürüyor',
    };
  }
  return {
    status: 'idle',
    emoji: '⚪',
    bullet: '●',
    color: '#94a3b8',
    label: 'Kontrol edilmedi',
    title: 'GKÇ sağlık kontrolü yapılmadı',
  };
};

export const formatGkcHealthLabel = (label: string, status: unknown): string =>
  `${getGkcHealthVisual(status).emoji} ${label}`;

export const normalizeGkcMeasurementType = (measurementType: string): string =>
  measurementType.trim().toUpperCase() === 'PMU' ? 'PMU' : 'PQ';

export const toGkcQueryFazId = (faz: string): string =>
  faz === '1' || faz === 'Tek Faz' ? '1' : '';

export const buildGkcQueryMeta = ({
  deviceId,
  measurementType,
  startTime,
  endTime,
  gerilim,
  fazId,
}: GkcQueryMeta): GkcQueryMeta => ({
  deviceId,
  measurementType: normalizeGkcMeasurementType(measurementType),
  startTime,
  endTime,
  gerilim,
  fazId,
});

export const isGkcQueryMetaCurrent = (
  meta: GkcQueryMeta | null | undefined,
  filters: GkcFilterSnapshot,
): boolean => {
  if (!meta) return false;
  return meta.deviceId === filters.cihaz
    && normalizeGkcMeasurementType(meta.measurementType) === normalizeGkcMeasurementType(filters.olcumTipi)
    && meta.startTime === filters.startTime
    && meta.endTime === filters.endTime
    && meta.gerilim === filters.gerilim
    && meta.fazId === toGkcQueryFazId(filters.faz);
};
