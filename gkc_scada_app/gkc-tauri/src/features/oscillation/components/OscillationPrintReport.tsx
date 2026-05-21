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
  humanizeBand,
  humanizeClassification,
  signalLabel,
} from '../utils/reportBuilder.ts';
import {
  buildPrintDampingScatterSeries,
  buildPrintReportSections,
  describePrintEvent,
  PRINT_REPORT_TITLE,
  summarizePrintSection,
  type PrintReportSection,
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

const filterTimeSeries = (
  series: Array<[number, number]>,
  intervalStartMs: number,
  intervalEndMs: number,
): Array<[number, number]> =>
  series.filter(([timestampMs]) => timestampMs >= intervalStartMs && timestampMs <= intervalEndMs);

const filterWindowMetrics = (
  metrics: OscillationWindowMetric[],
  intervalStartMs: number,
  intervalEndMs: number,
): OscillationWindowMetric[] =>
  metrics.filter(metric => metric.timestampMs >= intervalStartMs && metric.timestampMs <= intervalEndMs);

const printChartBase = () => {
  const palette = paletteFor('light');
  return {
    ...chartBase('light'),
    backgroundColor: '#ffffff',
    animation: false,
    toolbox: { show: false },
    dataZoom: [],
    legend: {
      type: 'plain',
      top: 0,
      right: 8,
      textStyle: { color: palette.muted, fontSize: 9 },
    },
  };
};

const buildPrintRawOption = ({
  samplesByPmu,
  section,
  smoothingSettings,
}: {
  samplesByPmu: Record<string, PmuSample[]>;
  section: PrintReportSection;
  smoothingSettings: OscillationSmoothingSettings;
}) => {
  const palette = paletteFor('light');
  const unit = SIGNAL_UNITS[section.signal];
  const rawData = filterTimeSeries(
    toTimeSeries(samplesByPmu[section.pmuId] ?? [], section.signal),
    section.intervalStartMs,
    section.intervalEndMs,
  );
  const color = PMU_COLORS[0];
  const rawSeries = [{
    id: `print-raw-${section.pageKey}`,
    name: 'Ham',
    type: 'line',
    showSymbol: false,
    sampling: 'lttb',
    data: rawData,
    lineStyle: { width: 1.1, color },
    itemStyle: { color },
    connectNulls: false,
  }];

  const overlaySeries = smoothingSettings.enabled
    ? buildFilteredLineSegments(
      filterTimeSeries(
        movingAverageTimeSeries(toTimeSeries(samplesByPmu[section.pmuId] ?? [], section.signal), smoothingSettings.windowSize),
        section.intervalStartMs,
        section.intervalEndMs,
      ),
      section.windowMetrics,
      section.signal,
      section.pmuId,
      'light',
    ).map((segment, segmentIndex) => ({
      id: `print-filtered-${section.pageKey}-${segment.kind}-${segmentIndex}`,
      name: segment.kind === 'base'
        ? 'Filtrelenmiş'
        : segment.kind === 'negativeDamping'
          ? 'Negatif DR'
          : 'Pozitif DR',
      type: 'line',
      showSymbol: false,
      data: segment.data,
      lineStyle: { ...segment.lineStyle, color: segment.color, opacity: segment.kind === 'base' ? 0.9 : 1 },
      itemStyle: { color: segment.color },
      connectNulls: false,
      z: segment.z,
    }))
    : [];

  return {
    ...printChartBase(),
    title: {
      text: `Grafik 1 - ${section.signalLabel} Ham PMU Verisi`,
      subtext: `${section.signalLabel} (${unit}) - ${section.intervalLabel}`,
      textStyle: { color: palette.text, fontSize: 12 },
      subtextStyle: { color: palette.muted, fontSize: 9 },
    },
    grid: { top: 42, left: 54, right: 26, bottom: 24 },
    xAxis: {
      type: 'time',
      name: 'Zaman',
      min: section.intervalStartMs,
      max: section.intervalEndMs,
      axisLabel: { color: palette.muted, fontSize: 9, hideOverlap: true, formatter: (value: number) => formatPmuAxisTime(value) },
      axisLine: { lineStyle: { color: palette.axisLine } },
    },
    yAxis: {
      type: 'value',
      name: `${section.signalLabel} (${unit})`,
      scale: true,
      axisLabel: { color: palette.muted, fontSize: 9 },
      axisLine: { show: true, lineStyle: { color } },
      splitLine: { lineStyle: { color: palette.splitLine } },
    },
    series: [...rawSeries, ...overlaySeries],
  };
};

const buildPrintModeOption = ({
  section,
  windowSeconds,
  stepSeconds,
}: {
  section: PrintReportSection;
  windowSeconds: number;
  stepSeconds: number;
}) => {
  const palette = paletteFor('light');
  const metrics = filterWindowMetrics(section.windowMetrics, section.intervalStartMs, section.intervalEndMs);
  const color = PMU_COLORS[0];
  const dampingSeries = buildPrintDampingScatterSeries(metrics, section.signal, section.pmuId);

  return {
    ...printChartBase(),
    title: {
      text: `Grafik 2 - ${section.signalLabel} Mod + DR`,
      subtext: `Pencere ${windowSeconds} sn / Adım ${stepSeconds} sn`,
      textStyle: { color: palette.text, fontSize: 11 },
      subtextStyle: { color: palette.muted, fontSize: 9 },
    },
    grid: { top: 40, left: 46, right: 48, bottom: 24 },
    xAxis: {
      type: 'time',
      name: 'Zaman',
      min: section.intervalStartMs,
      max: section.intervalEndMs,
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
    series: [
      {
        id: `print-mode-${section.pageKey}`,
        name: 'Mod',
        type: 'line',
        yAxisIndex: 0,
        step: 'end',
        showSymbol: false,
        data: metrics.map(metric => [metric.timestampMs, metric.mode]),
        lineStyle: { width: 1.35, color },
        itemStyle: { color },
        markPoint: {
          symbolSize: 12,
          label: { show: false },
          data: metrics
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
      dampingSeries,
    ],
  };
};

const buildPrintEnergyOption = ({ section }: { section: PrintReportSection }) => {
  const palette = paletteFor('light');
  const metrics = filterWindowMetrics(section.windowMetrics, section.intervalStartMs, section.intervalEndMs);
  const unit = signalUnit(section.signal);
  const color = PMU_COLORS[0];

  return {
    ...printChartBase(),
    title: {
      text: `Grafik 3 - ${section.signalLabel} Enerji + Genlik`,
      textStyle: { color: palette.text, fontSize: 11 },
    },
    grid: { top: 38, left: 54, right: 50, bottom: 24 },
    xAxis: {
      type: 'time',
      name: 'Zaman',
      min: section.intervalStartMs,
      max: section.intervalEndMs,
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
    series: [
      {
        id: `print-amplitude-${section.pageKey}`,
        name: `Genlik (${unit})`,
        type: 'line',
        yAxisIndex: 0,
        showSymbol: false,
        data: metrics.map(metric => [metric.timestampMs, displayMetricValue(section.signal, metric.amplitude)]),
        lineStyle: { width: 1.2, color },
        itemStyle: { color },
      },
      {
        id: `print-energy-${section.pageKey}`,
        name: `Enerji (${unit})`,
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        areaStyle: { opacity: 0.08 },
        data: metrics.map(metric => [metric.timestampMs, displayMetricValue(section.signal, metric.energyRms)]),
        lineStyle: { width: 1.05, type: 'dashed', color },
        itemStyle: { color },
      },
    ],
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
  const sections = buildPrintReportSections(result, pmuDevices)
    .filter(section => selectedPmuIds.length === 0 || selectedPmuIds.includes(section.pmuId));
  const thresholdSummary = [
    [signalLabel('frequency'), `${result.query.amplitudeThresholds.frequencyMhz} mHz`],
    [signalLabel('voltage'), `%${result.query.amplitudeThresholds.voltagePercent}`],
    [signalLabel('activePower'), `%${result.query.amplitudeThresholds.activePowerPercent} ve en az 10 MW`],
    [signalLabel('reactivePower'), `%${result.query.amplitudeThresholds.reactivePowerPercent} ve en az 5 MVAr`],
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
        <section key={section.pageKey} className="oscillation-print-page oscillation-print-metric-page">
          <header className="oscillation-print-page-header">
            <div>
              <h1>{section.pmuName}</h1>
              <div className="oscillation-print-page-meta">
                <span>{section.signalLabel} Ölçümü</span>
                <span>{section.intervalLabel}</span>
                <span>Eşik: {section.thresholdLabel}</span>
                <span>Birim: {section.unitLabel}</span>
              </div>
            </div>
          </header>

          <div className="oscillation-print-chart-stack">
            <div className="oscillation-print-chart-main" data-oscillation-print-chart={`${section.pageKey}-raw`}>
              <ReactECharts
                option={buildPrintRawOption({ samplesByPmu, section, smoothingSettings })}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
            <div className="oscillation-print-chart-main" data-oscillation-print-chart={`${section.pageKey}-mode-damping`}>
              <ReactECharts
                option={buildPrintModeOption({ section, windowSeconds, stepSeconds })}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
            <div className="oscillation-print-chart-main" data-oscillation-print-chart={`${section.pageKey}-energy-amplitude`}>
              <ReactECharts
                option={buildPrintEnergyOption({ section })}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            </div>
          </div>

          <div className="oscillation-print-info-grid">
            <section>
              <h2>Özet Bilgi</h2>
              <p>{summarizePrintSection(section)}</p>
              {section.events.slice(0, 4).map(event => <p key={event.id}>{describePrintEvent(section, event)}</p>)}
            </section>
            <section>
              <h2>Bant Metrikleri</h2>
              <table className="oscillation-table">
                <thead><tr><th>Bant</th><th>Frekans</th><th>RMS</th><th>Damping</th><th>Sınıflandırma</th></tr></thead>
                <tbody>
                  {section.metrics.map(metric => (
                    <tr key={`${metric.pmuId}-${metric.signal}-${metric.bandId}`} className={metric.classificationLabel !== 'MOD_YOK' ? 'oscillation-detected-row' : undefined}>
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
