import ReactECharts from 'echarts-for-react';
import type { SignalBandMetric } from '../types/oscillationTypes.ts';
import { chartBase, formatMetricNumber, formatPmuDisplayName, paletteFor, SIGNAL_LABELS, type OscillationThemeMode } from './chartHelpers.ts';

export function DampingChart({
  metrics,
  themeMode,
}: {
  metrics: SignalBandMetric[];
  themeMode: OscillationThemeMode;
}) {
  const dampingMetrics = metrics.filter(metric => metric.dampingRatioPercent !== null);
  if (!dampingMetrics.length) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Damping tahmini için yeterli metrik yok.</div>;
  }

  const palette = paletteFor(themeMode);
  const option = {
    ...chartBase(themeMode),
    dataZoom: [],
    title: { text: 'Damping Ratio Bulguları', textStyle: { color: palette.text, fontSize: 13 } },
    tooltip: {
      formatter: (params: { name: string; value: number }) => `${params.name}<br/>Damping: ${formatMetricNumber(params.value, 2)}%`,
    },
    xAxis: { type: 'category', data: dampingMetrics.map(metric => `${formatPmuDisplayName(metric.pmuId)} ${SIGNAL_LABELS[metric.signal]} ${metric.bandId}`), axisLabel: { color: palette.muted, rotate: 20, fontSize: 9 }, axisLine: { lineStyle: { color: palette.axisLine } } },
    yAxis: { type: 'value', name: '%', axisLabel: { color: palette.muted }, axisLine: { lineStyle: { color: palette.axisLine } }, splitLine: { lineStyle: { color: palette.splitLine } } },
    series: [{ type: 'bar', data: dampingMetrics.map(metric => metric.dampingRatioPercent), itemStyle: { color: '#a78bfa' } }],
  };

  return <ReactECharts option={option} style={{ height: 280, width: '100%' }} notMerge={true} lazyUpdate={true} />;
}
