import ReactECharts from 'echarts-for-react';
import type { OscillationWindowMetric, PmuSignalKey } from '../types/oscillationTypes.ts';
import {
  chartBase,
  connectOscillationTimeChart,
  PMU_COLORS,
  SIGNAL_LABELS,
  SIGNAL_UNITS,
  type OscillationThemeMode,
} from './chartHelpers.ts';

const MODE_LABELS: Record<number, string> = {
  0: 'Yok',
  1: 'Local',
  2: 'Interarea',
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

export function ModeDampingChart({
  metrics,
  themeMode,
}: {
  metrics: OscillationWindowMetric[];
  themeMode: OscillationThemeMode;
}) {
  if (!metrics.length) {
    return <div className="card"><div className="card-body" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Mod ve DR grafiği için analiz sonucu yok.</div></div>;
  }

  const groups = uniqueSeries(metrics);
  const option = {
    ...chartBase(themeMode),
    title: { text: 'Grafik 2 - Mod ve Sönümleme Oranı', textStyle: { color: 'var(--text-primary)', fontSize: 13 } },
    legend: { type: 'scroll', top: 0, right: 58, width: '58%', textStyle: { color: 'var(--text-muted)', fontSize: 10 } },
    grid: { top: 44, left: 46, right: 58, bottom: 48 },
    xAxis: { type: 'time', axisLabel: { color: 'var(--text-muted)', fontSize: 10, hideOverlap: true } },
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
      const groupMetrics = metrics.filter(metric => seriesKey(metric) === seriesKey(group));
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
          name: `${seriesName(group)} DR`,
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
  selectedSignals,
  themeMode,
}: {
  metrics: OscillationWindowMetric[];
  selectedSignals: PmuSignalKey[];
  themeMode: OscillationThemeMode;
}) {
  if (!metrics.length) {
    return <div className="card"><div className="card-body" style={{ color: 'var(--text-muted)', fontSize: 12 }}>Enerji ve genlik grafiği için analiz sonucu yok.</div></div>;
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Grafik 3 - Enerji ve Genlik</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sinyal bazlı alt gridler</span>
      </div>
      <div className="card-body" style={{ display: 'grid', gap: 10, padding: 8 }}>
        {selectedSignals.map(signal => {
          const signalMetrics = metrics.filter(metric => metric.signal === signal);
          if (!signalMetrics.length) return null;
          const groups = uniqueSeries(signalMetrics);
          const option = {
            ...chartBase(themeMode),
            title: {
              text: `${SIGNAL_LABELS[signal]} - Genlik ve RMS Enerji`,
              textStyle: { color: 'var(--text-primary)', fontSize: 12 },
            },
            legend: { type: 'scroll', top: 0, right: 58, width: '56%', textStyle: { color: 'var(--text-muted)', fontSize: 10 } },
            grid: { top: 42, left: 54, right: 58, bottom: 44 },
            xAxis: { type: 'time', axisLabel: { color: 'var(--text-muted)', fontSize: 10, hideOverlap: true } },
            yAxis: [
              {
                type: 'value',
                name: `Genlik (${signalUnit(signal)})`,
                scale: true,
                axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
                splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
              },
              {
                type: 'value',
                name: `Enerji (${signalUnit(signal)})`,
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
                  name: `${group.pmuId} Genlik`,
                  type: 'line',
                  yAxisIndex: 0,
                  showSymbol: false,
                  sampling: 'lttb',
                  data: groupMetrics.map(metric => [metric.timestampMs, displayValue(signal, metric.amplitude)]),
                  lineStyle: { width: 1.3, color },
                  itemStyle: { color },
                },
                {
                  name: `${group.pmuId} Enerji`,
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
            <div key={signal} style={{ minHeight: 260 }}>
              <ReactECharts option={option} style={{ height: 260, width: '100%' }} notMerge={true} lazyUpdate={true} onChartReady={connectOscillationTimeChart} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
