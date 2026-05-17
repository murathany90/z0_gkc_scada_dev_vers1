import ReactECharts from 'echarts-for-react';
import type { SignalBandMetric } from '../types/oscillationTypes.ts';
import { chartBase, SIGNAL_LABELS, type OscillationThemeMode } from './chartHelpers.ts';

export function SpectrumChart({
  metrics,
  themeMode,
}: {
  metrics: SignalBandMetric[];
  themeMode: OscillationThemeMode;
}) {
  const spectrumMetrics = metrics.filter(metric => metric.spectrum?.length);
  if (!spectrumMetrics.length) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Spektrum için analiz sonucu yok.</div>;
  }

  const option = {
    ...chartBase(themeMode),
    title: { text: 'PMU Spektrum Karşılaştırması', textStyle: { color: 'var(--text-primary)', fontSize: 13 } },
    legend: { top: 0, right: 58, textStyle: { color: 'var(--text-muted)', fontSize: 10 } },
    xAxis: {
      type: 'value',
      name: 'Hz',
      min: 0,
      max: 4.5,
      axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'Spektral güç',
      scale: true,
      axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
    },
    visualMap: undefined,
    series: spectrumMetrics.slice(0, 12).map(metric => ({
      name: `${metric.pmuId} ${SIGNAL_LABELS[metric.signal]} ${metric.bandId}`,
      type: 'line',
      showSymbol: false,
      sampling: 'lttb',
      markArea: metric.bandId === 'INTERAREA'
        ? { silent: true, itemStyle: { color: 'rgba(34,197,94,0.09)' }, data: [[{ xAxis: 0.1 }, { xAxis: 0.4 }]] }
        : undefined,
      data: (metric.spectrum ?? []).map(point => [point.frequencyHz, point.power]),
    })),
  };

  return <ReactECharts option={option} style={{ height: 320, width: '100%' }} notMerge={true} lazyUpdate={true} />;
}
