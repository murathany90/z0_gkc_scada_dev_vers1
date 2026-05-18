import ReactECharts from 'echarts-for-react';
import type { OscillationWindowMetric, PmuSignalKey } from '../types/oscillationTypes.ts';
import {
  buildDampingScatterData,
  buildDampingTooltipPayload,
  chartBase,
  connectOscillationTimeChart,
  formatMetricNumber,
  formatPmuAxisTime,
  formatPmuDisplayName,
  paletteFor,
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
const seriesName = (metric: OscillationWindowMetric): string => `${formatPmuDisplayName(metric.pmuId)} ${SIGNAL_LABELS[metric.signal]}`;

const dampingStatusText = (dampingRatioPercent: number): string =>
  dampingRatioPercent < 0 ? 'Büyüyen salınım' : 'Sönümlenen salınım';

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
  windowSeconds,
  stepSeconds,
}: {
  metrics: OscillationWindowMetric[];
  signal: PmuSignalKey;
  themeMode: OscillationThemeMode;
  hasSamples: boolean;
  onLoadDemo: () => void;
  onRunAnalysis: () => void;
  windowSeconds: number;
  stepSeconds: number;
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
  const palette = paletteFor(themeMode);
  const metricLookup = new Map<string, OscillationWindowMetric>();
  groups.forEach(group => {
    signalMetrics
      .filter(metric => seriesKey(metric) === seriesKey(group))
      .forEach(metric => {
        metricLookup.set(`${seriesName(group)} Mod__${metric.timestampMs}`, metric);
        metricLookup.set(`${seriesName(group)} DR (%)__${metric.timestampMs}`, metric);
      });
  });
  const hiddenDampingLines = groups.reduce<Record<string, boolean>>((selected, group) => {
    selected[`${seriesName(group)} DR (%)`] = false;
    return selected;
  }, {});
  const option = {
    ...chartBase(themeMode),
    title: { text: `Grafik 2 - ${SIGNAL_LABELS[signal]} Mod + DR`, textStyle: { color: palette.text, fontSize: 13 } },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        const first = items[0] as { value?: [number, number] } | undefined;
        const timestampMs = first?.value?.[0];
        if (!Number.isFinite(timestampMs)) return '';
        const rows = [`<div style="margin-bottom:6px;font-weight:700;color:${palette.muted};">${formatPmuAxisTime(timestampMs as number)}</div>`];
        items.forEach(item => {
          const point = item as { marker?: string; seriesName?: string; value?: [number, number] };
          if (!point.seriesName || !point.value) return;
          const metric = metricLookup.get(`${point.seriesName}__${point.value[0]}`);
          const damping = metric?.dampingRatioPercent;
          const payload = metric
            ? buildDampingTooltipPayload({
              metric,
              pmuName: formatPmuDisplayName(metric.pmuId),
              modeLabel: MODE_LABELS[metric.mode] ?? String(metric.mode),
              windowSeconds,
              stepSeconds,
            })
            : null;
          const statusColor = payload?.statusColor ?? palette.success;
          const statusSymbol = damping !== null && damping !== undefined && damping < 0 ? '&#9650;' : '&#9660;';
          if (point.seriesName.endsWith('DR (%)')) {
            rows.push(`<div style="display:flex;justify-content:space-between;gap:16px;">
              <span>${point.marker ?? ''}${point.seriesName}</span>
              <strong>${formatMetricNumber(point.value[1], 2)}%</strong>
            </div>`);
          } else {
            rows.push(`<div style="display:flex;justify-content:space-between;gap:16px;">
              <span>${point.marker ?? ''}${point.seriesName}</span>
              <strong>${MODE_LABELS[point.value[1]] ?? point.value[1]}</strong>
            </div>`);
          }
          if (damping !== null && damping !== undefined) {
            rows.push(`<div style="display:flex;justify-content:space-between;gap:16px;color:${statusColor};">
              <span>${statusSymbol} ${dampingStatusText(damping)}</span>
              <strong>DR ${formatMetricNumber(damping, 2)}%</strong>
            </div>`);
            if (payload) {
              rows.push(`<div style="color:${palette.muted};">${payload.frequencyText}</div>`);
              rows.push(`<div style="color:${palette.muted};">${payload.timeRangeText}</div>`);
              rows.push(`<div style="color:${palette.muted};">${payload.durationText} · ${payload.windowText} · ${payload.stepText}</div>`);
            }
          }
        });
        return rows.join('');
      },
    },
    legend: { type: 'scroll', top: 0, right: 58, width: '58%', textStyle: { color: palette.muted, fontSize: 10 }, selected: hiddenDampingLines },
    grid: { top: 44, left: 46, right: 58, bottom: 48 },
    dataZoom: [
      { type: 'inside', start: dataZoomStart, end: 100, minSpan: 0.05, filterMode: 'none', xAxisIndex: [0] },
      { type: 'slider', start: dataZoomStart, end: 100, minSpan: 0.05, filterMode: 'none', bottom: 8, height: 18, borderColor: palette.tooltipBorder, textStyle: { color: palette.muted }, xAxisIndex: [0] },
    ],
    xAxis: {
      type: 'time',
      name: 'Zaman',
      nameTextStyle: { color: palette.muted, fontSize: 10 },
      axisLabel: {
        color: palette.muted,
        fontSize: 10,
        hideOverlap: true,
        formatter: (value: number) => formatPmuAxisTime(value),
      },
      axisLine: { lineStyle: { color: palette.axisLine } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Mod',
        min: 0,
        max: 4,
        interval: 1,
        axisLabel: {
          color: palette.muted,
          fontSize: 10,
          formatter: (value: number) => MODE_LABELS[value] ?? String(value),
        },
        axisLine: { lineStyle: { color: palette.axisLine } },
        splitLine: { lineStyle: { color: palette.splitLine } },
      },
      {
        type: 'value',
        name: 'DR (%)',
        scale: true,
        axisLabel: { color: palette.muted, fontSize: 10, formatter: (value: number) => `${value}%` },
        axisLine: { lineStyle: { color: palette.axisLine } },
        splitLine: { show: false },
      },
    ],
    series: groups.flatMap((group, index) => {
      const groupMetrics = signalMetrics.filter(metric => seriesKey(metric) === seriesKey(group));
      const color = PMU_COLORS[index % PMU_COLORS.length];
      return [
        {
          id: `mode-${group.pmuId}-${group.signal}`,
          name: `${seriesName(group)} Mod`,
          type: 'line',
          yAxisIndex: 0,
          step: 'end',
          showSymbol: false,
          data: groupMetrics.map(metric => [metric.timestampMs, metric.mode]),
          lineStyle: { width: 1.4, color },
          itemStyle: { color },
          markPoint: {
            symbolSize: 13,
            label: { show: false },
            tooltip: {
              formatter: (params: { data?: { metric?: OscillationWindowMetric; pmuName?: string; modeLabel?: string } }) => {
                const pointMetric = params.data?.metric;
                if (!pointMetric) return '';
                const payload = buildDampingTooltipPayload({
                  metric: pointMetric,
                  pmuName: params.data?.pmuName ?? formatPmuDisplayName(pointMetric.pmuId),
                  modeLabel: params.data?.modeLabel ?? (MODE_LABELS[pointMetric.mode] ?? String(pointMetric.mode)),
                  windowSeconds,
                  stepSeconds,
                });
                return [
                  `<strong>${payload.pmuName}</strong>`,
                  `Mod: ${payload.modeLabel}`,
                  `DR: ${formatMetricNumber(payload.dampingRatioPercent, 2)}%`,
                  payload.frequencyText,
                  payload.timeRangeText,
                  payload.durationText,
                  `${payload.windowText} · ${payload.stepText}`,
                  `<span style="color:${payload.statusColor};">${payload.statusText}</span>`,
                ].join('<br/>');
              },
            },
            data: groupMetrics
              .filter(metric => metric.dampingRatioPercent !== null)
              .map(metric => {
                const damping = metric.dampingRatioPercent as number;
                return {
                  coord: [metric.timestampMs, metric.mode],
                  name: dampingStatusText(damping),
                  value: formatMetricNumber(damping, 2),
                  symbol: 'triangle',
                  symbolRotate: damping < 0 ? 0 : 180,
                  itemStyle: { color: damping < 0 ? palette.danger : palette.success },
                  metric,
                  pmuName: formatPmuDisplayName(metric.pmuId),
                  modeLabel: MODE_LABELS[metric.mode] ?? String(metric.mode),
                };
              }),
          },
        },
        {
          id: `damping-${group.pmuId}-${group.signal}`,
          name: `${seriesName(group)} DR (%)`,
          type: 'scatter',
          yAxisIndex: 1,
          symbol: 'circle',
          symbolSize: 7,
          data: buildDampingScatterData(groupMetrics, {
            negative: palette.danger,
            nonNegative: palette.success,
          }),
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
  const palette = paletteFor(themeMode);
  const option = {
    ...chartBase(themeMode),
    title: {
      text: `Grafik 3 - ${SIGNAL_LABELS[signal]} Enerji + Genlik`,
      textStyle: { color: palette.text, fontSize: 13 },
    },
    legend: { type: 'scroll', top: 0, right: 58, width: '56%', textStyle: { color: palette.muted, fontSize: 10 } },
    grid: { top: 42, left: 54, right: 58, bottom: 44 },
    dataZoom: [
      { type: 'inside', start: dataZoomStart, end: 100, minSpan: 0.05, filterMode: 'none', xAxisIndex: [0] },
      { type: 'slider', start: dataZoomStart, end: 100, minSpan: 0.05, filterMode: 'none', bottom: 8, height: 18, borderColor: palette.tooltipBorder, textStyle: { color: palette.muted }, xAxisIndex: [0] },
    ],
    xAxis: {
      type: 'time',
      name: 'Zaman',
      nameTextStyle: { color: palette.muted, fontSize: 10 },
      axisLabel: {
        color: palette.muted,
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
        axisLabel: { color: palette.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: palette.axisLine } },
        splitLine: { lineStyle: { color: palette.splitLine } },
      },
      {
        type: 'value',
        name: `Enerji (${unit})`,
        scale: true,
        axisLabel: { color: palette.muted, fontSize: 10 },
        axisLine: { lineStyle: { color: palette.axisLine } },
        splitLine: { show: false },
      },
    ],
    series: groups.flatMap((group, index) => {
      const groupMetrics = signalMetrics.filter(metric => seriesKey(metric) === seriesKey(group));
      const color = PMU_COLORS[index % PMU_COLORS.length];
      return [
        {
          id: `amplitude-${group.pmuId}-${group.signal}`,
          name: `${formatPmuDisplayName(group.pmuId)} Genlik (${unit})`,
          type: 'line',
          yAxisIndex: 0,
          showSymbol: false,
          sampling: 'lttb',
          data: groupMetrics.map(metric => [metric.timestampMs, displayValue(signal, metric.amplitude)]),
          lineStyle: { width: 1.3, color },
          itemStyle: { color },
        },
        {
          id: `energy-${group.pmuId}-${group.signal}`,
          name: `${formatPmuDisplayName(group.pmuId)} Enerji (${unit})`,
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
