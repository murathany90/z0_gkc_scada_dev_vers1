import * as echarts from 'echarts';
import type { EChartsType } from 'echarts';
import type { OscillationWindowMetric, PmuSample, PmuSignalKey, SignalBandMetric } from '../types/oscillationTypes.ts';
import { getSignalValue } from '../utils/pmuSamples.ts';
export {
  buildDampingTooltipPayload,
  buildFilteredLineSegments,
  convertRawSignalValue,
  formatPmuDisplayName,
  getFilteredLineColor,
  getFilteredSignalName,
  getNominalVoltageKv,
  getRawSignalUnit,
  movingAverageTimeSeries,
  normalizeSmoothingWindowSize,
} from '../utils/visualization.ts';

export type OscillationThemeMode = 'dark' | 'light';

export const paletteFor = (themeMode: OscillationThemeMode) => themeMode === 'light'
  ? {
    text: '#0f172a',
    muted: '#475569',
    axis: '#64748b',
    grid: 'rgba(148, 163, 184, 0.3)',
    axisLine: '#cbd5e1',
    splitLine: 'rgba(148, 163, 184, 0.3)',
    filteredLine: '#000000',
    danger: '#ef4444',
    success: '#22c55e',
    tooltipBg: 'rgba(255,255,255,0.98)',
    tooltipBorder: '#cbd5e1',
  }
  : {
    text: '#f8fafc',
    muted: '#94a3b8',
    axis: '#94a3b8',
    grid: 'rgba(148, 163, 184, 0.18)',
    axisLine: '#334155',
    splitLine: 'rgba(148, 163, 184, 0.18)',
    filteredLine: '#ffffff',
    danger: '#ef4444',
    success: '#22c55e',
    tooltipBg: 'rgba(15, 23, 42, 0.96)',
    tooltipBorder: '#334155',
  };

export const SIGNAL_LABELS: Record<PmuSignalKey, string> = {
  frequency: 'Frekans',
  voltage: 'Gerilim',
  activePower: 'Aktif Güç',
  reactivePower: 'Reaktif Güç',
};

export const SIGNAL_UNITS: Record<PmuSignalKey, string> = {
  frequency: 'Hz',
  voltage: 'kV',
  activePower: 'MW',
  reactivePower: 'MVAr',
};

export const SIGNAL_COLORS: Record<PmuSignalKey, string> = {
  frequency: '#22c55e',
  voltage: '#38bdf8',
  activePower: '#f97316',
  reactivePower: '#a78bfa',
};

export const PMU_COLORS = ['#22c55e', '#38bdf8', '#f97316', '#a78bfa', '#f43f5e', '#14b8a6'];
export const OSCILLATION_TIME_CHART_GROUP = 'oscillation-time-axis-lock';

const connectedGroups = new Set<string>();

export const connectOscillationTimeChart = (
  chart: EChartsType,
  groupId = OSCILLATION_TIME_CHART_GROUP,
): void => {
  chart.group = groupId;
  if (!connectedGroups.has(groupId)) {
    echarts.connect(groupId);
    connectedGroups.add(groupId);
  }
};

export const formatMetricNumber = (value: number | null | undefined, digits = 3): string =>
  Number.isFinite(value) ? Number(value).toLocaleString('tr-TR', { maximumFractionDigits: digits }) : '-';

const pad = (value: number, size = 2) => String(value).padStart(size, '0');
const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const formatPmuTooltipTime = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

export const formatPmuAxisTime = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  const milliseconds = date.getMilliseconds();
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return milliseconds === 0 ? base : `${base}.${pad(milliseconds, 3)}`;
};

export const calculatePmuDataZoomStart = (samples: PmuSample[], initialWindowMinutes = 15): number => {
  if (samples.length < 2) return 0;
  let first = Number.POSITIVE_INFINITY;
  let last = Number.NEGATIVE_INFINITY;
  samples.forEach(sample => {
    if (Number.isFinite(sample.timestampMs)) {
      first = Math.min(first, sample.timestampMs);
      last = Math.max(last, sample.timestampMs);
    }
  });
  const durationMs = last - first;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;

  const windowMs = initialWindowMinutes * 60_000;
  if (durationMs <= windowMs) return 0;
  return Math.max(0, Math.min(100, ((durationMs - windowMs) / durationMs) * 100));
};

export const buildDampingScatterData = (
  metrics: OscillationWindowMetric[],
  colors: { negative: string; nonNegative: string },
) =>
  metrics
    .filter(metric => metric.dampingRatioPercent !== null && Number.isFinite(metric.dampingRatioPercent))
    .map(metric => {
      const damping = metric.dampingRatioPercent as number;
      return {
        value: [metric.timestampMs, damping] as [number, number],
        symbol: 'circle' as const,
        symbolSize: 7,
        itemStyle: { color: damping < 0 ? colors.negative : colors.nonNegative },
        metric,
      };
    });

export const toTimeSeries = (
  samples: PmuSample[],
  signal: PmuSignalKey,
): Array<[number, number]> =>
  samples
    .map(sample => {
      const value = getSignalValue(sample, signal);
      return Number.isFinite(value) ? [sample.timestampMs, value as number] as [number, number] : null;
    })
    .filter((point): point is [number, number] => point !== null);

export const chartBase = (themeMode: OscillationThemeMode) => {
  const palette = paletteFor(themeMode);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: palette.tooltipBg,
      borderColor: palette.tooltipBorder,
      textStyle: { color: palette.text, fontSize: 11 },
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        const first = items[0] as { value?: [number, number] } | undefined;
        if (!first?.value) return '';
        const rows = [`<div style="margin-bottom:6px;font-weight:700;color:${palette.muted};">${formatPmuTooltipTime(first.value[0])}</div>`];
        items.forEach(item => {
          const point = item as { marker?: string; seriesName?: string; value?: [number, number] };
          const value = point.value?.[1];
          rows.push(`<div style="display:flex;justify-content:space-between;gap:16px;">
            <span>${point.marker ?? ''}${escapeHtml(point.seriesName)}</span>
            <strong>${Number.isFinite(value) ? Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 4 }) : '-'}</strong>
          </div>`);
        });
        return rows.join('');
      },
    },
    grid: { top: 34, left: 42, right: 18, bottom: 48 },
    legend: {
      textStyle: { color: palette.muted, fontSize: 10 },
    },
    toolbox: {
      right: 4,
      top: 0,
      feature: { saveAsImage: { title: 'PNG' } },
      iconStyle: { borderColor: palette.axis },
      emphasis: { iconStyle: { borderColor: palette.text } },
    },
    dataZoom: [
      { type: 'inside', filterMode: 'none' },
      { type: 'slider', filterMode: 'none', bottom: 8, height: 18, borderColor: palette.tooltipBorder, textStyle: { color: palette.muted } },
    ],
  };
};

export const dominantMetric = (metrics: SignalBandMetric[]): SignalBandMetric | undefined =>
  [...metrics]
    .filter(metric => metric.spectralEnergy !== null)
    .sort((left, right) => (right.spectralEnergy ?? 0) - (left.spectralEnergy ?? 0))[0];
