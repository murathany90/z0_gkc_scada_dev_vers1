import ReactECharts from 'echarts-for-react';
import type {
  OscillationAnalysisResult,
  OscillationSmoothingSettings,
  OscillationWindowMetric,
  PmuFider,
  PmuSample,
  PmuSignalKey,
} from '../types/oscillationTypes.ts';
import {
  buildDecisionSupportSentences,
  buildSummaryText,
  describeOscillationEvent,
  humanizeBand,
  humanizeClassification,
  signalLabel,
} from '../utils/reportBuilder.ts';
import {
  buildPrintReportSections,
  PRINT_REPORT_TITLE,
  summarizePrintSection,
} from '../utils/printReport.ts';
import {
  buildFilteredLineSegments,
  chartBase,
  formatMetricNumber,
  formatPmuAxisTime,
  formatPmuDisplayName,
  movingAverageTimeSeries,
  paletteFor,
  PMU_COLORS,
  SIGNAL_UNITS,
  toTimeSeries,
} from './chartHelpers.ts';

const MODE_LABELS: Record<number, string> = {
  0: 'Yok',
  1: 'Interarea',
  2: 'Local',
  3: 'Forced',
  4: 'Torsiyon',
};

const displayMetricValue = (signal: PmuSignalKey, value: number | null): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  return signal === 'frequency' ? value * 1000 : value;
};

const signalUnit = (signal: PmuSignalKey): string =>
  signal === 'frequency' ? 'mHz' : SIGNAL_UNITS[signal];

const pmuNameFrom = (pmuDevices: PmuFider[], pmuId: string): string =>
  formatPmuDisplayName(pmuDevices.find(device => device.id === pmuId) ?? pmuId);

const uniqueMetricGroups = (metrics: OscillationWindowMetric[]): OscillationWindowMetric[] => {
  const seen = new Set<string>();
  return metrics.filter(metric => {
    const key = `${metric.pmuId}-${metric.signal}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const printChartBase = () => {
  const palette = paletteFor('light');
  return {
    ...chartBase('light'),
    backgroundColor: '#ffffff',
    animation: false,
    toolbox: { show: false },
    dataZoom: [],
    legend: { type: 'scroll', top: 0, right: 8, width: '54%', textStyle: { color: palette.muted, fontSize: 9 } },
  };
};

const buildPrintRawOption = ({
  samplesByPmu,
  selectedPmuIds,
  pmuDevices,
  signal,
  metrics,
  smoothingSettings,
}: {
  samplesByPmu: Record<string, PmuSample[]>;
  selectedPmuIds: string[];
  pmuDevices: PmuFider[];
  signal: PmuSignalKey;
  metrics: OscillationWindowMetric[];
  smoothingSettings: OscillationSmoothingSettings;
}) => {
  const palette = paletteFor('light');
  const unit = SIGNAL_UNITS[signal];
  const rawSeries = selectedPmuIds.map((pmuId, pmuIndex) => {
    const pmu = pmuDevices.find(item => item.id === pmuId) ?? pmuId;
    const color = PMU_COLORS[pmuIndex % PMU_COLORS.length];
    return {
      id: `print-raw-${pmuId}-${signal}`,
      name: `${formatPmuDisplayName(pmu)} ${signalLabel(signal)} (${unit})`,
      type: 'line',
      showSymbol: false,
      sampling: 'lttb',
      data: toTimeSeries(samplesByPmu[pmuId] ?? [], signal),
      lineStyle: { width: 1.1, color },
      itemStyle: { color },
      connectNulls: false,
    };
  });

  const overlaySeries = smoothingSettings.enabled
    ? selectedPmuIds.flatMap((pmuId) => {
      const pmu = pmuDevices.find(item => item.id === pmuId) ?? pmuId;
      const filteredData = movingAverageTimeSeries(toTimeSeries(samplesByPmu[pmuId] ?? [], signal), smoothingSettings.windowSize);
      return buildFilteredLineSegments(filteredData, metrics, signal, pmuId, 'light').map((segment, segmentIndex) => ({
        id: `print-filtered-${pmuId}-${signal}-${segment.kind}-${segmentIndex}`,
        name: `${formatPmuDisplayName(pmu)} Filtrelenmiş ${signalLabel(signal)} (${unit})`,
        type: 'line',
        showSymbol: false,
        data: segment.data,
        lineStyle: { ...segment.lineStyle, color: segment.color, opacity: segment.kind === 'base' ? 0.9 : 1 },
        itemStyle: { color: segment.color },
        connectNulls: false,
        z: segment.z,
      }));
    })
    : [];

  return {
    ...printChartBase(),
    title: {
      text: `Grafik 1 - ${signalLabel(signal)} Ham PMU Verisi`,
      subtext: `${signalLabel(signal)} (${unit}) - ortak zaman ekseni`,
      textStyle: { color: palette.text, fontSize: 12 },
      subtextStyle: { color: palette.muted, fontSize: 9 },
    },
    grid: { top: 42, left: 54, right: 26, bottom: 30 },
    xAxis: {
      type: 'time',
      name: 'Zaman',
      axisLabel: { color: palette.muted, fontSize: 9, hideOverlap: true, formatter: (value: number) => formatPmuAxisTime(value) },
      axisLine: { lineStyle: { color: palette.axisLine } },
    },
    yAxis: {
      type: 'value',
      name: `${signalLabel(signal)} (${unit})`,
      scale: true,
      axisLabel: { color: palette.muted, fontSize: 9 },
      axisLine: { show: true, lineStyle: { color: PMU_COLORS[0] } },
      splitLine: { lineStyle: { color: palette.splitLine } },
    },
    series: [...rawSeries, ...overlaySeries],
  };
};

const buildPrintModeOption = ({
  metrics,
  signal,
  windowSeconds,
  stepSeconds,
}: {
  metrics: OscillationWindowMetric[];
  signal: PmuSignalKey;
  windowSeconds: number;
  stepSeconds: number;
}) => {
  const signalMetrics = metrics.filter(metric => metric.signal === signal);
  const groups = uniqueMetricGroups(signalMetrics);
  const palette = paletteFor('light');

  return {
    ...printChartBase(),
    title: {
      text: `Grafik 2 - ${signalLabel(signal)} Mod + DR`,
      subtext: `Pencere ${windowSeconds} sn / Adım ${stepSeconds} sn`,
      textStyle: { color: palette.text, fontSize: 11 },
      subtextStyle: { color: palette.muted, fontSize: 9 },
    },
    grid: { top: 40, left: 42, right: 46, bottom: 28 },
    xAxis: {
      type: 'time',
      name: 'Zaman',
      axisLabel: { color: palette.muted, fontSize: 9, hideOverlap: true, formatter: (value: number) => formatPmuAxisTime(value) },
      axisLine: { lineStyle: { color: palette.axisLine } },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Mod',
        min: 0,
        max: 4,
        interval: 1,
        axisLabel: { color: palette.muted, fontSize: 9, formatter: (value: number) => MODE_LABELS[value] ?? String(value) },
        splitLine: { lineStyle: { color: palette.splitLine } },
      },
      {
        type: 'value',
        name: 'DR (%)',
        scale: true,
        axisLabel: { color: palette.muted, fontSize: 9, formatter: (value: number) => `${value}%` },
        splitLine: { show: false },
      },
    ],
    series: groups.flatMap((group, index) => {
      const groupMetrics = signalMetrics.filter(metric => metric.pmuId === group.pmuId && metric.signal === group.signal);
      const color = PMU_COLORS[index % PMU_COLORS.length];
      const displayName = `${formatPmuDisplayName(group.pmuId)} ${signalLabel(group.signal)}`;
      return [
        {
          id: `print-mode-${group.pmuId}-${group.signal}`,
          name: `${displayName} Mod`,
          type: 'line',
          yAxisIndex: 0,
          step: 'end',
          showSymbol: false,
          data: groupMetrics.map(metric => [metric.timestampMs, metric.mode]),
          lineStyle: { width: 1.35, color },
          itemStyle: { color },
          markPoint: {
            symbolSize: 12,
            label: { show: false },
            data: groupMetrics
              .filter(metric => metric.dampingRatioPercent !== null)
              .map(metric => {
                const damping = metric.dampingRatioPercent as number;
                return {
                  coord: [metric.timestampMs, metric.mode],
                  symbol: 'triangle',
                  symbolRotate: damping < 0 ? 0 : 180,
                  itemStyle: { color: damping < 0 ? palette.danger : palette.success },
                };
              }),
          },
        },
        {
          id: `print-damping-${group.pmuId}-${group.signal}`,
          name: `${displayName} DR (%)`,
          type: 'line',
          yAxisIndex: 1,
          showSymbol: false,
          data: groupMetrics.map(metric => [metric.timestampMs, metric.dampingRatioPercent]),
          lineStyle: { width: 1.1, color, type: 'dashed' },
          itemStyle: { color },
          connectNulls: false,
        },
      ];
    }),
  };
};

const buildPrintEnergyOption = ({
  metrics,
  signal,
}: {
  metrics: OscillationWindowMetric[];
  signal: PmuSignalKey;
}) => {
  const signalMetrics = metrics.filter(metric => metric.signal === signal);
  const groups = uniqueMetricGroups(signalMetrics);
  const palette = paletteFor('light');
  const unit = signalUnit(signal);

  return {
    ...printChartBase(),
    title: {
      text: `Grafik 3 - ${signalLabel(signal)} Enerji + Genlik`,
      textStyle: { color: palette.text, fontSize: 11 },
    },
    grid: { top: 38, left: 52, right: 50, bottom: 28 },
    xAxis: {
      type: 'time',
      name: 'Zaman',
      axisLabel: { color: palette.muted, fontSize: 9, hideOverlap: true, formatter: (value: number) => formatPmuAxisTime(value) },
      axisLine: { lineStyle: { color: palette.axisLine } },
    },
    yAxis: [
      {
        type: 'value',
        name: `Genlik (${unit})`,
        scale: true,
        axisLabel: { color: palette.muted, fontSize: 9 },
        splitLine: { lineStyle: { color: palette.splitLine } },
      },
      {
        type: 'value',
        name: `Enerji (${unit})`,
        scale: true,
        axisLabel: { color: palette.muted, fontSize: 9 },
        splitLine: { show: false },
      },
    ],
    series: groups.flatMap((group, index) => {
      const groupMetrics = signalMetrics.filter(metric => metric.pmuId === group.pmuId && metric.signal === group.signal);
      const color = PMU_COLORS[index % PMU_COLORS.length];
      return [
        {
          id: `print-amplitude-${group.pmuId}-${group.signal}`,
          name: `${formatPmuDisplayName(group.pmuId)} Genlik (${unit})`,
          type: 'line',
          yAxisIndex: 0,
          showSymbol: false,
          data: groupMetrics.map(metric => [metric.timestampMs, displayMetricValue(signal, metric.amplitude)]),
          lineStyle: { width: 1.2, color },
          itemStyle: { color },
        },
        {
          id: `print-energy-${group.pmuId}-${group.signal}`,
          name: `${formatPmuDisplayName(group.pmuId)} Enerji (${unit})`,
          type: 'line',
          yAxisIndex: 1,
          showSymbol: false,
          areaStyle: { opacity: 0.08 },
          data: groupMetrics.map(metric => [metric.timestampMs, displayMetricValue(signal, metric.energyRms)]),
          lineStyle: { width: 1.05, type: 'dashed', color },
          itemStyle: { color },
        },
      ];
    }),
  };
};

export function OscillationPrintReport({
  result,
  pmuDevices,
  samplesByPmu,
  selectedPmuIds,
  smoothingSettings,
  windowSeconds,
  stepSeconds,
}: {
  result: OscillationAnalysisResult | null;
  pmuDevices: PmuFider[];
  samplesByPmu: Record<string, PmuSample[]>;
  selectedPmuIds: string[];
  smoothingSettings: OscillationSmoothingSettings;
  windowSeconds: number;
  stepSeconds: number;
}) {
  if (!result) return null;

  const decisionSentences = buildDecisionSupportSentences({ result, pmuDevices });
  const sections = buildPrintReportSections(result, pmuDevices);
  const thresholdSummary = [
    ['Frekans', `${result.query.amplitudeThresholds.frequencyMhz} mHz`],
    ['Gerilim', `%${result.query.amplitudeThresholds.voltagePercent}`],
    ['Aktif Güç', `%${result.query.amplitudeThresholds.activePowerPercent}`],
    ['Reaktif Güç', `%${result.query.amplitudeThresholds.reactivePowerPercent}`],
  ];

  return (
    <div className="oscillation-print-report" aria-hidden="true">
      <section className="oscillation-print-page oscillation-print-summary-page">
        <h1>{PRINT_REPORT_TITLE}</h1>
        <h2>Yönetici Özeti</h2>
        <p>{buildSummaryText(result, pmuDevices)}</p>
        <div className="oscillation-print-decision-list">
          {decisionSentences.map(sentence => <p key={sentence}>{sentence}</p>)}
        </div>
        <div className="oscillation-print-summary-grid">
          <section>
            <h2>Analiz Kapsamı</h2>
            <table className="oscillation-table">
              <tbody>
                <tr><th>PMU Sayısı</th><td>{result.query.pmuIds.length}</td></tr>
                <tr><th>PMU Fiderleri</th><td>{result.query.pmuIds.map(pmuId => pmuNameFrom(pmuDevices, pmuId)).join(', ')}</td></tr>
                <tr><th>Pencere / Adım</th><td>{windowSeconds} sn / {stepSeconds} sn</td></tr>
                <tr><th>Örnekleme</th><td>{result.query.samplingRateHz} Hz</td></tr>
              </tbody>
            </table>
          </section>
          <section>
            <h2>Salınım Eşikleri</h2>
            <table className="oscillation-table">
              <tbody>
                {thresholdSummary.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value}</td></tr>)}
              </tbody>
            </table>
          </section>
          <section>
            <h2>Veri Kalitesi</h2>
            <table className="oscillation-table">
              <thead><tr><th>PMU</th><th>Alınan</th><th>Beklenen</th><th>Eksik</th><th>Durum</th></tr></thead>
              <tbody>
                {result.dataQuality.pmuQuality.map(quality => (
                  <tr key={quality.pmuId}>
                    <td>{pmuNameFrom(pmuDevices, quality.pmuId)}</td>
                    <td>{quality.received}</td>
                    <td>{quality.expected}</td>
                    <td>%{formatMetricNumber(quality.missingRatio * 100, 2)}</td>
                    <td>{quality.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </section>

      {sections.map(section => (
        <section key={section.signal} className="oscillation-print-page oscillation-print-metric-page">
          <header className="oscillation-print-page-header">
            <h1>{section.title}</h1>
            <span>Eşik: {section.thresholdLabel} · Birim: {section.unitLabel}</span>
          </header>
          <div className="oscillation-print-chart-main" data-oscillation-print-chart={`${section.signal}-raw`}>
            <ReactECharts
              option={buildPrintRawOption({
                samplesByPmu,
                selectedPmuIds,
                pmuDevices,
                signal: section.signal,
                metrics: result.windowMetrics,
                smoothingSettings,
              })}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </div>
          <div className="oscillation-print-chart-row">
            <div className="oscillation-print-chart-secondary" data-oscillation-print-chart={`${section.signal}-mode-damping`}>
              <ReactECharts
                option={buildPrintModeOption({
                  metrics: result.windowMetrics,
                  signal: section.signal,
                  windowSeconds,
                  stepSeconds,
                })}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
            <div className="oscillation-print-chart-secondary" data-oscillation-print-chart={`${section.signal}-energy-amplitude`}>
              <ReactECharts
                option={buildPrintEnergyOption({ metrics: result.windowMetrics, signal: section.signal })}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>
          <div className="oscillation-print-metric-summary">
            <section>
              <h2>Özet Bilgi</h2>
              <p>{summarizePrintSection(section)}</p>
              {section.events.length
                ? section.events.slice(0, 3).map(event => <p key={event.id}>{describeOscillationEvent(event, pmuDevices)}</p>)
                : <p>Bu ölçüm metriği için raporlanan eşik üstü salınım olayı yoktur.</p>}
            </section>
            <section>
              <h2>Bant Metrikleri</h2>
              <table className="oscillation-table">
                <thead><tr><th>PMU</th><th>Bant</th><th>Frekans</th><th>RMS</th><th>Damping</th><th>Sınıflandırma</th></tr></thead>
                <tbody>
                  {section.metrics.map(metric => (
                    <tr key={`${metric.pmuId}-${metric.signal}-${metric.bandId}`} className={metric.classificationLabel !== 'MOD_YOK' ? 'oscillation-detected-row' : undefined}>
                      <td>{pmuNameFrom(pmuDevices, metric.pmuId)}</td>
                      <td>{humanizeBand(metric.bandId)}</td>
                      <td>{formatMetricNumber(metric.dominantFrequencyHz)} Hz</td>
                      <td>{formatMetricNumber(metric.bandRms)}</td>
                      <td>{formatMetricNumber(metric.dampingRatioPercent, 2)}%</td>
                      <td>{humanizeClassification(metric.classificationLabel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </section>
      ))}
    </div>
  );
}
