import ReactECharts from 'echarts-for-react';
import { PMU_FIDERS } from '../store/oscillationStore.ts';
import type { PmuSample, PmuSignalKey } from '../types/oscillationTypes.ts';
import {
  calculatePmuDataZoomStart,
  chartBase,
  connectOscillationTimeChart,
  formatPmuAxisTime,
  PMU_COLORS,
  SIGNAL_LABELS,
  SIGNAL_UNITS,
  toTimeSeries,
  type OscillationThemeMode,
} from './chartHelpers.ts';

export function RawDataCharts({
  samplesByPmu,
  selectedPmuIds,
  selectedSignals,
  themeMode,
}: {
  samplesByPmu: Record<string, PmuSample[]>;
  selectedPmuIds: string[];
  selectedSignals: PmuSignalKey[];
  themeMode: OscillationThemeMode;
}) {
  const selectedSamples = selectedPmuIds.flatMap(pmuId => samplesByPmu[pmuId] ?? []);
  if (!selectedSamples.length) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Gerçek YTBS PMU verisi bekleniyor. Veri yoksa analiz veya demo grafik üretilmez.
        </div>
      </div>
    );
  }

  const dataZoomStart = calculatePmuDataZoomStart(selectedSamples, 15);
  const option = {
    ...chartBase(themeMode),
    title: {
      text: 'Grafik 1 - Ham Veri',
      subtext: 'Frekans, Gerilim, Aktif Güç ve Reaktif Güç ortak zaman ekseninde',
      textStyle: { color: 'var(--text-primary)', fontSize: 13 },
      subtextStyle: { color: 'var(--text-muted)', fontSize: 10 },
    },
    legend: { type: 'scroll', top: 0, right: 58, width: '62%', textStyle: { color: 'var(--text-muted)', fontSize: 10 } },
    grid: { top: 46, left: 54, right: 118, bottom: 48 },
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
      axisLine: { lineStyle: { color: 'var(--border-color)' } },
    },
    yAxis: selectedSignals.map((signal, index) => ({
      type: 'value',
      name: `${SIGNAL_LABELS[signal]} (${SIGNAL_UNITS[signal]})`,
      scale: true,
      position: index % 2 === 0 ? 'left' : 'right',
      offset: Math.floor(index / 2) * 52,
      axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
      axisLine: { show: true, lineStyle: { color: PMU_COLORS[index % PMU_COLORS.length] } },
      splitLine: index === 0 ? { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } } : { show: false },
    })),
    series: selectedSignals.flatMap((signal, signalIndex) =>
      selectedPmuIds.map((pmuId, pmuIndex) => {
        const pmu = PMU_FIDERS.find(item => item.id === pmuId);
        return {
          name: `${pmu?.substationName ?? pmuId} ${SIGNAL_LABELS[signal]}`,
          type: 'line',
          yAxisIndex: signalIndex,
          showSymbol: false,
          sampling: 'lttb',
          progressive: 5000,
          data: toTimeSeries(samplesByPmu[pmuId] ?? [], signal),
          lineStyle: { width: 1.15 },
          itemStyle: { color: PMU_COLORS[(pmuIndex + signalIndex) % PMU_COLORS.length] },
          connectNulls: false,
        };
      })
    ),
  };

  return (
    <div className="card">
      <div className="card-body" style={{ padding: 6, height: 360 }}>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
          onChartReady={connectOscillationTimeChart}
        />
      </div>
    </div>
  );
}
