import ReactECharts from 'echarts-for-react';
import type { OscillationWindowMetric, PmuSignalKey } from '../types/oscillationTypes.ts';
import {
  chartBase,
  connectOscillationTimeChart,
  formatPmuAxisTime,
  PMU_COLORS,
  SIGNAL_LABELS,
  SIGNAL_UNITS,
  type OscillationThemeMode,
} from './chartHelpers.ts';
import { OscillationEmptyState } from './OscillationEmptyState.tsx';

const MODE_LABELS: Record<number, string> = {
  0: 'Yok',
  1: 'Interarea',
  2: 'Local',
  3: 'Forced',
  4: 'Torsiyon',
};

const displayValue = (signal: PmuSignalKey, value: number | null): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  return signal === 'frequency' ? value * 1000 : value;
};

const signalUnit = (signal: PmuSignalKey): string =>
  signal === 'frequency' ? 'mHz' : SIGNAL_UNITS[signal];

const seriesKey = (metric: OscillationWindowMetric): string => `${metric.pmuId}__${metric.signal}`;
const seriesName = (metric: OscillationWindowMetric): string => `${metric.pmuId} ${SIGNAL_LABELS[metric.signal]}`;

const uniqueSeries = (metrics: OscillationWindowMetric[]): OscillationWindowMetric[] => {
  const seen = new Set<string>();
  return metrics.filter(metric => {
    const key = seriesKey(metric);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const calculateMetricDataZoomStart = (metrics: OscillationWindowMetric[], initialWindowMinutes = 15): number => {
  if (metrics.length < 2) return 0;
  const timestamps = metrics
    .map(metric => metric.timestampMs)
    .filter(Number.isFinite);
  if (timestamps.length < 2) return 0;

  const first = Math.min(...timestamps);
  const last = Math.max(...timestamps);
  const durationMs = last - first;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;

  const windowMs = initialWindowMinutes * 60_000;
  if (durationMs <= windowMs) return 0;
  return Math.max(0, Math.min(100, ((durationMs - windowMs) / durationMs) * 100));
};

const emptyAction = ({
  signal,
  hasSamples,
  onLoadDemo,
  onRunAnalysis,
}: {
  signal: PmuSignalKey;
  hasSamples: boolean;
  onLoadDemo: () => void;
  onRunAnalysis: () => void;
}) => hasSamples
  ? {
    title: `${SIGNAL_LABELS[signal]} için analiz çalıştırılmadı`,
    message: 'Yüklenen PMU verisi için kayan pencere analizi çalıştırıldığında grafikler dolacaktır.',
    primaryActionLabel: 'Analizi Çalıştır',
    onPrimaryAction: onRunAnalysis,
  }
  : {
    title: `${SIGNAL_LABELS[signal]} analiz sonucu yok`,
    message: 'Önce YTBS PMU verisi alın veya demo verisini yükleyin.',
    primaryActionLabel: 'Demo Verisi Yükle',
    onPrimaryAction: onLoadDemo,
  };

export function ModeDampingChart({
  metrics,
  signal,
  themeMode,
  hasSamples,
  onLoadDemo,
  onRunAnalysis,
}: {
  metrics: OscillationWindowMetric[];
  signal: PmuSignalKey;
  themeMode: OscillationThemeMode;
  hasSamples: boolean;
  onLoadDemo: () => void;
  onRunAnalysis: () => void;
}) {
  const signalMetrics = metrics.filter(metric => metric.signal === signal);
  if (!signalMetrics.length) {
    const empty = emptyAction({ signal, hasSamples, onLoadDemo, onRunAnalysis });
    return (
      <div className="card">
        <div className="card-body">
          <OscillationEmptyState {...empty} />
        </div>
      </div>
    );
  }

  const groups = uniqueSeries(signalMetrics);
  const dataZoomStart = calculateMetricDataZoomStart(signalMetrics, 15);
  const option = {
    ...chartBase(themeMode),
    title: { text: `Grafik 2 - ${SIGNAL_LABELS[signal]} Mod + DR`, textStyle: { color: 'var(--text-primary)', fontSize: 13 } },
    legend: { type: 'scroll', top: 0, right: 58, width: '58%', textStyle: { color: 'var(--text-muted)', fontSize: 10 } },
    grid: { top: 44, left: 46, right: 58, bottom: 48 },
    dataZoom: [
      { type: 'inside', start: dataZoomStart, end: 100, minSpan: 0.05, xAxisIndex: [0] },
      { type: 'slider', start: dataZoomStart, end: 100, bottom: 8, height: 18, borderColor: 'var(--border-color)', textStyle: { color: 'var(--text-muted)' }, xAxisIndex: [0] },
    ],
    xAxis: {
      type: 'time',
      axisLabel: {
        color: 'var(--text-muted)',
        fontSize: 10,
        hideOverlap: true,
        formatter: (value: number) => formatPmuAxisTime(value),
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Mod',
        min: 0,
        max: 4,
        interval: 1,
        axisLabel: {
          color: 'var(--text-muted)',
          fontSize: 10,
          formatter: (value: number) => MODE_LABELS[value] ?? String(value),
        },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
      },
      {
        type: 'value',
        name: 'DR %',
        scale: true,
        axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: groups.flatMap((group, index) => {
      const groupMetrics = signalMetrics.filter(metric => seriesKey(metric) === seriesKey(group));
      const color = PMU_COLORS[index % PMU_COLORS.length];
      return [
        {
          name: `${seriesName(group)} Mod`,
          type: 'line',
          step: 'end',
          yAxisIndex: 0,
          showSymbol: false,
          data: groupMetrics.map(metric => [metric.timestampMs, metric.mode]),
          lineStyle: { width: 1.4, color },
          itemStyle: { color },
        },
        {
          name: `${seriesName(group)} DR (%)`,
          type: 'line',
          yAxisIndex: 1,
          showSymbol: false,
          data: groupMetrics
            .filter(metric => metric.dampingRatioPercent !== null)
            .map(metric => [metric.timestampMs, metric.dampingRatioPercent as number]),
          lineStyle: { width: 1.1, type: 'dashed', color },
          itemStyle: { color },
        },
      ];
    }),
  };

  return (
    <div className="card">
      <div className="card-body" style={{ padding: 6, height: 300 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} onChartReady={connectOscillationTimeChart} />
      </div>
    </div>
  );
}

export function EnergyAmplitudeCharts({
  metrics,
  signal,
  themeMode,
  hasSamples,
  onLoadDemo,
  onRunAnalysis,
}: {
  metrics: OscillationWindowMetric[];
  signal: PmuSignalKey;
  themeMode: OscillationThemeMode;
  hasSamples: boolean;
  onLoadDemo: () => void;
  onRunAnalysis: () => void;
}) {
  const signalMetrics = metrics.filter(metric => metric.signal === signal);
  if (!signalMetrics.length) {
    const empty = emptyAction({ signal, hasSamples, onLoadDemo, onRunAnalysis });
    return (
      <div className="card">
        <div className="card-body">
          <OscillationEmptyState {...empty} />
        </div>
      </div>
    );
  }

  const groups = uniqueSeries(signalMetrics);
  const dataZoomStart = calculateMetricDataZoomStart(signalMetrics, 15);
  const unit = signalUnit(signal);
  const option = {
    ...chartBase(themeMode),
    title: {
      text: `Grafik 3 - ${SIGNAL_LABELS[signal]} Enerji + Genlik`,
      textStyle: { color: 'var(--text-primary)', fontSize: 13 },
    },
    legend: { type: 'scroll', top: 0, right: 58, width: '56%', textStyle: { color: 'var(--text-muted)', fontSize: 10 } },
    grid: { top: 42, left: 54, right: 58, bottom: 44 },
    dataZoom: [
      { type: 'inside', start: dataZoomStart, end: 100, minSpan: 0.05, xAxisIndex: [0] },
      { type: 'slider', start: dataZoomStart, end: 100, bottom: 8, height: 18, borderColor: 'var(--border-color)', textStyle: { color: 'var(--text-muted)' }, xAxisIndex: [0] },
    ],
    xAxis: {
      type: 'time',
      axisLabel: {
        color: 'var(--text-muted)',
        fontSize: 10,
        hideOverlap: true,
        formatter: (value: number) => formatPmuAxisTime(value),
      },
    },
    yAxis: [
      {
        type: 'value',
        name: `Genlik (${unit})`,
        scale: true,
        axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
      },
      {
        type: 'value',
        name: `Enerji (${unit})`,
        scale: true,
        axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: groups.flatMap((group, index) => {
      const groupMetrics = signalMetrics.filter(metric => seriesKey(metric) === seriesKey(group));
      const color = PMU_COLORS[index % PMU_COLORS.length];
      return [
        {
          name: `${group.pmuId} Genlik (${unit})`,
          type: 'line',
          yAxisIndex: 0,
          showSymbol: false,
          sampling: 'lttb',
          data: groupMetrics.map(metric => [metric.timestampMs, displayValue(signal, metric.amplitude)]),
          lineStyle: { width: 1.3, color },
          itemStyle: { color },
        },
        {
          name: `${group.pmuId} Enerji (${unit})`,
          type: 'line',
          yAxisIndex: 1,
          showSymbol: false,
          sampling: 'lttb',
          areaStyle: { opacity: 0.08 },
          data: groupMetrics.map(metric => [metric.timestampMs, displayValue(signal, metric.energyRms)]),
          lineStyle: { width: 1.1, type: 'dashed', color },
          itemStyle: { color },
        },
      ];
    }),
  };

  return (
    <div className="card">
      <div className="card-body" style={{ padding: 6, height: 300 }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge={true} lazyUpdate={true} onChartReady={connectOscillationTimeChart} />
      </div>
    </div>
  );
}
