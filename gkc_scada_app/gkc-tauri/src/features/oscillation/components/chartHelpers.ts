import type { PmuSample, PmuSignalKey, SignalBandMetric } from '../types/oscillationTypes.ts';
import { getSignalValue } from '../utils/pmuSamples.ts';

export type OscillationThemeMode = 'dark' | 'light';

export const paletteFor = (themeMode: OscillationThemeMode) => themeMode === 'light'
  ? {
    text: '#0f172a',
    muted: '#475569',
    axis: '#64748b',
    grid: 'rgba(148, 163, 184, 0.3)',
    tooltipBg: 'rgba(255,255,255,0.98)',
    tooltipBorder: '#cbd5e1',
  }
  : {
    text: '#f8fafc',
    muted: '#94a3b8',
    axis: '#94a3b8',
    grid: 'rgba(148, 163, 184, 0.18)',
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

export const formatMetricNumber = (value: number | null | undefined, digits = 3): string =>
  Number.isFinite(value) ? Number(value).toLocaleString('tr-TR', { maximumFractionDigits: digits }) : '-';

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
    },
    grid: { top: 34, left: 42, right: 18, bottom: 48 },
    toolbox: {
      right: 4,
      top: 0,
      feature: { saveAsImage: { title: 'PNG' } },
      iconStyle: { borderColor: palette.axis },
    },
    dataZoom: [
      { type: 'inside' },
      { type: 'slider', bottom: 8, height: 18, borderColor: palette.tooltipBorder, textStyle: { color: palette.muted } },
    ],
  };
};

export const dominantMetric = (metrics: SignalBandMetric[]): SignalBandMetric | undefined =>
  [...metrics]
    .filter(metric => metric.spectralEnergy !== null)
    .sort((left, right) => (right.spectralEnergy ?? 0) - (left.spectralEnergy ?? 0))[0];
