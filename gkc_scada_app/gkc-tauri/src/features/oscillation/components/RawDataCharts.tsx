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
import { OscillationEmptyState } from './OscillationEmptyState.tsx';

export function RawDataCharts({
  samplesByPmu,
  selectedPmuIds,
  signal,
  themeMode,
  onLoadDemo,
  onFetchData,
}: {
  samplesByPmu: Record<string, PmuSample[]>;
  selectedPmuIds: string[];
  signal: PmuSignalKey;
  themeMode: OscillationThemeMode;
  onLoadDemo: () => void;
  onFetchData: () => void;
}) {
  const selectedSamples = selectedPmuIds.flatMap(pmuId => samplesByPmu[pmuId] ?? []);
  if (!selectedSamples.length) {
    return (
      <div className="card">
        <div className="card-body">
          <OscillationEmptyState
            title={`${SIGNAL_LABELS[signal]} grafiği için PMU verisi bekleniyor`}
            message="YTBS masaüstü sorgusu çalıştırın veya sentetik demo verisini yükleyin."
            primaryActionLabel="Demo Verisi Yükle"
            onPrimaryAction={onLoadDemo}
            secondaryActionLabel="Veriyi Getir"
            onSecondaryAction={onFetchData}
          />
        </div>
      </div>
    );
  }

  const dataZoomStart = calculatePmuDataZoomStart(selectedSamples, 15);
  const option = {
    ...chartBase(themeMode),
    title: {
      text: `Grafik 1 - ${SIGNAL_LABELS[signal]} Ham PMU Verisi`,
      subtext: `${SIGNAL_LABELS[signal]} (${SIGNAL_UNITS[signal]}) ortak zaman ekseninde`,
      textStyle: { color: 'var(--text-primary)', fontSize: 13 },
      subtextStyle: { color: 'var(--text-muted)', fontSize: 10 },
    },
    legend: { type: 'scroll', top: 0, right: 58, width: '58%', textStyle: { color: 'var(--text-muted)', fontSize: 10 } },
    grid: { top: 46, left: 54, right: 72, bottom: 48 },
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
    yAxis: {
      type: 'value',
      name: `${SIGNAL_LABELS[signal]} (${SIGNAL_UNITS[signal]})`,
      scale: true,
      axisLabel: { color: 'var(--text-muted)', fontSize: 10 },
      axisLine: { show: true, lineStyle: { color: PMU_COLORS[0] } },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.18)' } },
    },
    series: selectedPmuIds.map((pmuId, pmuIndex) => {
      const pmu = PMU_FIDERS.find(item => item.id === pmuId);
      const color = PMU_COLORS[pmuIndex % PMU_COLORS.length];
      return {
        name: `${pmu?.substationName ?? pmuId} ${SIGNAL_LABELS[signal]} (${SIGNAL_UNITS[signal]})`,
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        progressive: 5000,
        data: toTimeSeries(samplesByPmu[pmuId] ?? [], signal),
        lineStyle: { width: 1.15, color },
        itemStyle: { color },
        connectNulls: false,
      };
    }),
  };

  return (
    <div className="card">
      <div className="card-body" style={{ padding: 6, height: 330 }}>
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
