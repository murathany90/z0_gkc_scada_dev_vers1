import { DEVICE_MAP } from '../../../data/deviceList.ts';
import type {
  OscillationWindowMetric,
  PmuFider,
  PmuSignalKey,
  RawSignalDisplayMode,
} from '../types/oscillationTypes.ts';

export const NOMINAL_FREQUENCY_HZ = 50;

const FILTERED_SIGNAL_CODES: Record<PmuSignalKey, string> = {
  frequency: 'F',
  voltage: 'V',
  activePower: 'P',
  reactivePower: 'Q',
};

export interface FilteredLineSegment {
  kind: 'base' | 'negativeDamping' | 'positiveDamping';
  color: string;
  data: Array<[number, number | null]>;
  lineStyle: {
    type: 'solid';
    width: number;
  };
  z: number;
}

export interface DampingTooltipPayload {
  pmuName: string;
  modeLabel: string;
  dampingRatioPercent: number | null;
  statusText: string;
  statusColor: string;
  frequencyHz: number | null;
  frequencyText: string;
  timeRangeText: string;
  durationText: string;
  windowText: string;
  stepText: string;
}

const normalizeGridVoltageKv = (voltage: number): number => {
  if (voltage === 380 || voltage === 400) return 400;
  if (voltage === 154) return 154;
  if (voltage === 33) return 33;
  return voltage;
};

const idFromSource = (source: PmuFider | string | null | undefined): string | undefined =>
  typeof source === 'string' ? source : source?.id;

const trimIdSuffix = (name: string, id?: string): string => {
  if (!id) return name.trim();
  return name.replace(new RegExp(`\\s*\\(${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*$`), '').trim();
};

export const formatPmuDisplayName = (source: PmuFider | string | null | undefined): string => {
  const id = idFromSource(source);
  const device = id ? DEVICE_MAP.get(id) : undefined;
  if (device) {
    return `${device.tmAdi}, ${device.fiderAdi}`;
  }

  if (typeof source === 'object' && source) {
    if (source.name) return trimIdSuffix(source.name, source.id);
    return [source.substationName, source.bayName].filter(Boolean).join(', ') || source.id;
  }

  return id ?? '-';
};

export const getNominalVoltageKv = (source: PmuFider | string | null | undefined): number | null => {
  const id = idFromSource(source);
  const device = id ? DEVICE_MAP.get(id) : undefined;
  if (device) return normalizeGridVoltageKv(device.gerilim);

  if (typeof source === 'object' && source?.voltageLevel) {
    const match = source.voltageLevel.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
      return normalizeGridVoltageKv(Number(match[1].replace(',', '.')));
    }
  }

  return null;
};

export const normalizeSmoothingWindowSize = (value: number): number => {
  const rounded = Number.isFinite(value) ? Math.round(value) : 7;
  const clamped = Math.max(1, Math.min(101, rounded));
  if (clamped === 1) return 1;
  if (clamped % 2 === 1) return clamped;
  return clamped >= 101 ? 101 : clamped + 1;
};

export const movingAverageTimeSeries = (
  series: Array<[number, number]>,
  windowSize: number,
): Array<[number, number]> => {
  const safeWindowSize = normalizeSmoothingWindowSize(windowSize);
  if (safeWindowSize <= 1 || series.length <= 1) return series.map(point => [point[0], point[1]]);

  const halfWindow = Math.floor(safeWindowSize / 2);
  return series.map(([timestampMs], index) => {
    const start = Math.max(0, index - halfWindow);
    const end = Math.min(series.length - 1, index + halfWindow);
    let sum = 0;
    let count = 0;
    for (let cursor = start; cursor <= end; cursor += 1) {
      const value = series[cursor][1];
      if (Number.isFinite(value)) {
        sum += value;
        count += 1;
      }
    }
    return [timestampMs, count ? sum / count : series[index][1]];
  });
};

export const convertRawSignalValue = (
  value: number,
  signal: PmuSignalKey,
  displayMode: RawSignalDisplayMode,
  pmu: PmuFider | string | null | undefined,
): number => {
  if (displayMode !== 'pu') return value;
  if (signal === 'frequency') return value / NOMINAL_FREQUENCY_HZ;
  if (signal === 'voltage') {
    const nominalVoltageKv = getNominalVoltageKv(pmu);
    return nominalVoltageKv && nominalVoltageKv > 0 ? value / nominalVoltageKv : value;
  }
  return value;
};

export const getRawSignalUnit = (
  signal: PmuSignalKey,
  displayMode: RawSignalDisplayMode,
  valueUnit: string,
): string => (displayMode === 'pu' && (signal === 'frequency' || signal === 'voltage') ? 'p.u.' : valueUnit);

export const getFilteredLineColor = (themeMode: 'dark' | 'light'): string =>
  themeMode === 'light' ? '#000000' : '#ffffff';

const statusForMetric = (metric: OscillationWindowMetric | undefined): 'negativeDamping' | 'positiveDamping' | null => {
  if (!metric || metric.mode <= 0 || metric.dampingRatioPercent === null) return null;
  return metric.dampingRatioPercent < 0 ? 'negativeDamping' : 'positiveDamping';
};

const pad = (value: number, size = 2): string => String(value).padStart(size, '0');

const formatClock = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatDurationSeconds = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)} sn`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes} dk ${rest} sn` : `${minutes} dk`;
};

const metricStartMs = (metric: OscillationWindowMetric): number =>
  Number.isFinite(metric.windowStartMs) ? metric.windowStartMs : metric.timestampMs;

const metricEndMs = (metric: OscillationWindowMetric): number =>
  Number.isFinite(metric.windowEndMs) ? metric.windowEndMs : metric.timestampMs;

export const buildFilteredLineSegments = (
  series: Array<[number, number]>,
  metrics: OscillationWindowMetric[] | undefined,
  signal: PmuSignalKey,
  pmuId: string,
  themeMode: 'dark' | 'light',
): FilteredLineSegment[] => {
  const filteredMetrics = (metrics ?? [])
    .filter(metric => metric.pmuId === pmuId && metric.signal === signal)
    .sort((left, right) => metricStartMs(left) - metricStartMs(right));
  const statuses: Array<'negativeDamping' | 'positiveDamping' | null> = [];
  let metricIndex = 0;

  series.forEach(([timestampMs]) => {
    while (
      metricIndex < filteredMetrics.length
      && metricEndMs(filteredMetrics[metricIndex]) < timestampMs
    ) {
      metricIndex += 1;
    }
    const metric = filteredMetrics[metricIndex];
    const inWindow = metric
      && metricStartMs(metric) <= timestampMs
      && metricEndMs(metric) >= timestampMs;
    statuses.push(inWindow ? statusForMetric(metric) : null);
  });

  const makeSegments = (kind: 'negativeDamping' | 'positiveDamping'): FilteredLineSegment[] => {
    const segments: FilteredLineSegment[] = [];
    let run: Array<[number, number | null]> = [];

    series.forEach(([timestampMs, value], index) => {
      if (statuses[index] === kind) {
        run.push([timestampMs, value]);
        return;
      }

      if (run.length) {
        segments.push({
          kind,
          color: kind === 'negativeDamping' ? '#ef4444' : '#22c55e',
          data: run,
          lineStyle: { type: 'solid', width: 2.2 },
          z: 4,
        });
        run = [];
      }
    });

    if (run.length) {
      segments.push({
        kind,
        color: kind === 'negativeDamping' ? '#ef4444' : '#22c55e',
        data: run,
        lineStyle: { type: 'solid', width: 2.2 },
        z: 4,
      });
    }

    return segments;
  };

  return [
    {
      kind: 'base',
      color: getFilteredLineColor(themeMode),
      data: series.map(([timestampMs, value]) => [timestampMs, value]),
      lineStyle: { type: 'solid', width: 1.65 },
      z: 1,
    },
    ...makeSegments('negativeDamping'),
    ...makeSegments('positiveDamping'),
  ];
};

export const buildDampingTooltipPayload = ({
  metric,
  pmuName,
  modeLabel,
  windowSeconds,
  stepSeconds,
}: {
  metric: OscillationWindowMetric;
  pmuName: string;
  modeLabel: string;
  windowSeconds?: number;
  stepSeconds?: number;
}): DampingTooltipPayload => {
  const dampingRatioPercent = metric.dampingRatioPercent;
  const isNegative = dampingRatioPercent !== null && dampingRatioPercent < 0;
  const frequencyHz = Number.isFinite(metric.dominantFrequencyHz) ? metric.dominantFrequencyHz : null;
  const startMs = metricStartMs(metric);
  const endMs = metricEndMs(metric);
  const durationSeconds = Number.isFinite(metric.durationSeconds)
    ? metric.durationSeconds
    : Math.max(0, (endMs - startMs) / 1000);
  return {
    pmuName,
    modeLabel,
    dampingRatioPercent,
    statusText: isNegative ? 'Büyüyen salınım' : 'Sönümlenen salınım',
    statusColor: isNegative ? '#ef4444' : '#22c55e',
    frequencyHz,
    frequencyText: frequencyHz === null
      ? 'Salınım frekansı: -'
      : `Salınım frekansı: ${frequencyHz.toLocaleString('tr-TR', { maximumFractionDigits: 3 })} Hz`,
    timeRangeText: `Salınım zamanı: ${formatClock(startMs)} - ${formatClock(endMs)}`,
    durationText: `Salınım süresi: ${formatDurationSeconds(durationSeconds)}`,
    windowText: `Pencere: ${Number.isFinite(windowSeconds) ? `${windowSeconds} sn` : '-'}`,
    stepText: `Adım: ${Number.isFinite(stepSeconds) ? `${stepSeconds} sn` : '-'}`,
  };
};

export const getFilteredSignalName = (signal: PmuSignalKey): string =>
  `Filtrelenmiş ${FILTERED_SIGNAL_CODES[signal]}`;
