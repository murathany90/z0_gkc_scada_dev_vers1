import ReactECharts from 'echarts-for-react';
import type { SignalBandMetric } from '../types/oscillationTypes.ts';
import { chartBase, formatMetricNumber, type OscillationThemeMode } from './chartHelpers.ts';

export function BandEnergyHeatmap({
  metrics,
  themeMode,
}: {
  metrics: SignalBandMetric[];
  themeMode: OscillationThemeMode;
}) {
  const pmus = [...new Set(metrics.map(metric => metric.pmuId))];
  const bands = [...new Set(metrics.map(metric => metric.bandId))];
  const values = metrics.map(metric => metric.spectralEnergy ?? 0);
  const maxValue = values.length ? Math.max(...values) : 1;

  const option = {
    ...chartBase(themeMode),
    dataZoom: [],
    title: { text: 'PMU x Bant Enerji', textStyle: { color: 'var(--text-primary)', fontSize: 13 } },
    tooltip: {
      formatter: (params: { value: [number, number, number] }) => {
        const [x, y, value] = params.value;
        return `${pmus[y]} / ${bands[x]}<br/>Enerji: ${formatMetricNumber(value)}`;
      },
    },
    grid: { top: 42, left: 64, right: 28, bottom: 36 },
    xAxis: { type: 'category', data: bands, axisLabel: { color: 'var(--text-muted)' } },
    yAxis: { type: 'category', data: pmus, axisLabel: { color: 'var(--text-muted)' } },
    visualMap: {
      min: 0,
      max: maxValue || 1,
      calculable: true,
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: { color: 'var(--text-muted)' },
      inRange: { color: ['#0f172a', '#2563eb', '#22c55e', '#f59e0b'] },
    },
    series: [{
      type: 'heatmap',
      data: metrics.map(metric => [bands.indexOf(metric.bandId), pmus.indexOf(metric.pmuId), metric.spectralEnergy ?? 0]),
      label: { show: false },
      emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
    }],
  };

  return <ReactECharts option={option} style={{ height: 280, width: '100%' }} notMerge={true} lazyUpdate={true} />;
}
