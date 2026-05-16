import ReactECharts from 'echarts-for-react';
import type { SignalBandMetric } from '../types/oscillationTypes.ts';
import { chartBase, formatMetricNumber, SIGNAL_LABELS, type OscillationThemeMode } from './chartHelpers.ts';

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

  const option = {
    ...chartBase(themeMode),
    dataZoom: [],
    title: { text: 'Damping Ratio Bulguları', textStyle: { color: 'var(--text-primary)', fontSize: 13 } },
    tooltip: {
      formatter: (params: { name: string; value: number }) => `${params.name}<br/>Damping: ${formatMetricNumber(params.value, 2)}%`,
    },
    xAxis: { type: 'category', data: dampingMetrics.map(metric => `${metric.pmuId} ${SIGNAL_LABELS[metric.signal]} ${metric.bandId}`), axisLabel: { color: 'var(--text-muted)', rotate: 20, fontSize: 9 } },
    yAxis: { type: 'value', name: '%', axisLabel: { color: 'var(--text-muted)' }, splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } } },
    series: [{ type: 'bar', data: dampingMetrics.map(metric => metric.dampingRatioPercent), itemStyle: { color: '#a78bfa' } }],
  };

  return <ReactECharts option={option} style={{ height: 280, width: '100%' }} notMerge={true} lazyUpdate={true} />;
}
