import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { PMU_FIDERS } from '../store/oscillationStore.ts';
import type {
  OscillationSmoothingSettings,
  OscillationWindowMetric,
  PmuFider,
  PmuSample,
  PmuSignalKey,
  RawSignalDisplayMode,
} from '../types/oscillationTypes.ts';
import {
  buildFilteredLineSegments,
  calculatePmuDataZoomStart,
  chartBase,
  connectOscillationTimeChart,
  convertRawSignalValue,
  formatPmuAxisTime,
  formatPmuDisplayName,
  getFilteredSignalName,
  getRawSignalUnit,
  movingAverageTimeSeries,
  paletteFor,
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
  metrics = [],
  smoothingSettings,
  rawSignalDisplayModes,
  onRawSignalDisplayModeChange,
  onLoadDemo,
  onFetchData,
}: {
  samplesByPmu: Record<string, PmuSample[]>;
  selectedPmuIds: string[];
  signal: PmuSignalKey;
  themeMode: OscillationThemeMode;
  metrics?: OscillationWindowMetric[];
  smoothingSettings: OscillationSmoothingSettings;
  rawSignalDisplayModes: Record<'frequency' | 'voltage', RawSignalDisplayMode>;
  onRawSignalDisplayModeChange: (signal: 'frequency' | 'voltage', mode: RawSignalDisplayMode) => void;
  onLoadDemo: () => void;
  onFetchData: () => void;
}) {
  const selectedSamples = selectedPmuIds.flatMap(pmuId => samplesByPmu[pmuId] ?? []);
  const supportsPu = signal === 'frequency' || signal === 'voltage';
  const displayMode = supportsPu ? rawSignalDisplayModes[signal] : 'value';
  const unit = getRawSignalUnit(signal, displayMode, SIGNAL_UNITS[signal]);
  const dataZoomStart = calculatePmuDataZoomStart(selectedSamples, 15);
  const filteredSignalName = getFilteredSignalName(signal);
  const palette = paletteFor(themeMode);
  const series = useMemo(() => {
    const rawSeries = selectedPmuIds.map((pmuId, pmuIndex) => {
      const pmu = PMU_FIDERS.find(item => item.id === pmuId);
      const color = PMU_COLORS[pmuIndex % PMU_COLORS.length];
      const displayName = formatPmuDisplayName(pmu ?? pmuId);
      const data = toDisplaySeries(samplesByPmu[pmuId] ?? [], signal, displayMode, pmu ?? pmuId);
      return {
        id: `raw-${pmuId}-${signal}`,
        name: `${displayName} ${SIGNAL_LABELS[signal]} (${unit})`,
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        progressive: 5000,
        data,
        lineStyle: { width: 1.15, color },
        itemStyle: { color },
        connectNulls: false,
      };
    });

    if (!smoothingSettings.enabled) return rawSeries;

    const filteredSeries = selectedPmuIds.flatMap((pmuId) => {
      const pmu = PMU_FIDERS.find(item => item.id === pmuId);
      const displayName = formatPmuDisplayName(pmu ?? pmuId);
      const rawData = toDisplaySeries(samplesByPmu[pmuId] ?? [], signal, displayMode, pmu ?? pmuId);
      const filteredData = movingAverageTimeSeries(rawData, smoothingSettings.windowSize);
      const filteredName = `${displayName} ${filteredSignalName} (${unit})`;
      return buildFilteredLineSegments(filteredData, metrics, signal, pmuId, themeMode).map((segment, segmentIndex) => ({
        id: `filtered-${pmuId}-${signal}-${segment.kind}-${segmentIndex}`,
        name: filteredName,
        type: 'line',
        showSymbol: false,
        sampling: segment.kind === 'base' ? 'lttb' : undefined,
        progressive: 5000,
        data: segment.data,
        lineStyle: { ...segment.lineStyle, color: segment.color, opacity: segment.kind === 'base' ? 0.92 : 0.98 },
        itemStyle: { color: segment.color },
        connectNulls: false,
        z: segment.z,
        tooltip: { show: segment.kind === 'base' },
      }));
    });

    return [...rawSeries, ...filteredSeries];
  }, [
    displayMode,
    filteredSignalName,
    metrics,
    samplesByPmu,
    selectedPmuIds,
    signal,
    smoothingSettings.enabled,
    smoothingSettings.windowSize,
    themeMode,
    unit,
  ]);
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

  const option = {
    ...chartBase(themeMode),
    title: {
      text: `Grafik 1 - ${SIGNAL_LABELS[signal]} Ham PMU Verisi`,
      subtext: `${SIGNAL_LABELS[signal]} (${unit}) ortak zaman ekseninde`,
      textStyle: { color: palette.text, fontSize: 13 },
      subtextStyle: { color: palette.muted, fontSize: 10 },
    },
    legend: {
      type: 'scroll',
      top: 0,
      right: 58,
      width: '58%',
      textStyle: { color: palette.muted, fontSize: 10 },
    },
    grid: { top: 46, left: 54, right: 72, bottom: 48 },
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
    yAxis: {
      type: 'value',
      name: `${SIGNAL_LABELS[signal]} (${unit})`,
      nameLocation: 'end',
      scale: true,
      axisLabel: { color: palette.muted, fontSize: 10 },
      axisLine: { show: true, lineStyle: { color: PMU_COLORS[0] } },
      splitLine: { lineStyle: { color: palette.splitLine } },
    },
    series,
  };

  return (
    <div className="card">
      {supportsPu && (
        <div className="oscillation-chart-toolbar">
          <div className="oscillation-chart-toolbar-title">{SIGNAL_LABELS[signal]} ölçeği</div>
          <div className="oscillation-segmented-control" role="group" aria-label={`${SIGNAL_LABELS[signal]} ölçeği`}>
            <button
              type="button"
              className={displayMode === 'value' ? 'active' : ''}
              onClick={() => onRawSignalDisplayModeChange(signal, 'value')}
            >
              Değer
            </button>
            <button
              type="button"
              className={displayMode === 'pu' ? 'active' : ''}
              onClick={() => onRawSignalDisplayModeChange(signal, 'pu')}
            >
              p.u.
            </button>
          </div>
        </div>
      )}
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

const toDisplaySeries = (
  samples: PmuSample[],
  signal: PmuSignalKey,
  displayMode: RawSignalDisplayMode,
  pmu: PmuFider | string,
): Array<[number, number]> =>
  toTimeSeries(samples, signal).map(([timestampMs, value]) => [
    timestampMs,
    convertRawSignalValue(value, signal, displayMode, pmu),
  ]);
