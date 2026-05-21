import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculateOscillationAnalysis,
  buildOscillationEvents,
  validatePmuSelection,
} from '../src/features/oscillation/utils/oscillationMetrics.ts';
import { rawYtbsRowsToPmuSamples } from '../src/features/oscillation/utils/pmuSamples.ts';
import { fetchSequentialPmuRawData } from '../src/features/oscillation/utils/sequentialQuery.ts';
import { DEFAULT_AMPLITUDE_THRESHOLDS, OSCILLATION_BANDS } from '../src/features/oscillation/utils/bands.ts';
import { buildOscillationDemoSamples } from '../src/features/oscillation/utils/demoSamples.ts';
import {
  buildDecisionSupportSentences,
  buildOscillationEventDetails,
  humanizeClassification,
} from '../src/features/oscillation/utils/reportBuilder.ts';
import { estimateDampingRatio, estimatePeakAmplitude } from '../src/features/oscillation/utils/signalProcessing.ts';
import { buildCoherenceMatrix } from '../src/features/oscillation/utils/coherence.ts';
import { runAnalysisInWorker } from '../src/features/oscillation/utils/runAnalysisWorker.ts';
import {
  buildPrintDampingScatterSeries,
  buildPrintReportSections,
  describePrintEventRisk,
  PRINT_REPORT_CHART_SLOTS,
  PRINT_REPORT_SIGNALS,
  PRINT_REPORT_TITLE,
} from '../src/features/oscillation/utils/printReport.ts';
import { useOscillationStore } from '../src/features/oscillation/store/oscillationStore.ts';
import {
  calculatePmuDataZoomStart,
  buildDampingTooltipPayload,
  buildDampingScatterData,
  buildFilteredLineSegments,
  convertRawSignalValue,
  formatPmuAxisTime,
  formatPmuDisplayName,
  formatPmuTooltipTime,
  extractAxisPointerTimestamp,
  getFilteredLineColor,
  getNominalVoltageKv,
  movingAverageTimeSeries,
  selectDominantWindowMetric,
} from '../src/features/oscillation/components/chartHelpers.ts';
import { formatGkcHealthLabel } from '../src/utils/gkcHealth.ts';
import type {
  OscillationAnalysisResult,
  OscillationEvent,
  OscillationWindowMetric,
  PmuFider,
  PmuSample,
  PmuSignalKey,
  SignalBandMetric,
} from '../src/features/oscillation/types/oscillationTypes.ts';

const fixtureText = readFileSync('../../ytbs_gkc/gkcpmu/gkc1.txt', 'utf8');
const fixtureMatch = fixtureText.match(/var grafik_verisi_json = (\[[\s\S]*?\]);/);
assert.ok(fixtureMatch, 'YTBS PMU fixture should include grafik_verisi_json');

const realPowerRows = JSON.parse(fixtureMatch[1]) as Array<Record<string, string | number>>;
assert.ok(realPowerRows.length > 100, 'fixture should contain a real PMU power time series');

const temelli: PmuFider = {
  id: '285',
  name: 'TEMELLİ, 400 kV YUNUS EMRE TES',
  substationName: 'TEMELLİ',
  voltageLevel: '400 kV',
  bayName: '400 kV YUNUS EMRE TES',
  isPmu: true,
  source: 'YTBS_GKC',
};

assert.equal(validatePmuSelection('single', ['285']).valid, true);
assert.equal(validatePmuSelection('single', ['285', '704']).valid, false);
assert.equal(validatePmuSelection('multi', ['285']).valid, false);
assert.equal(validatePmuSelection('multi', ['1', '2', '3', '4', '5', '6']).valid, true);
assert.equal(validatePmuSelection('multi', ['1', '2', '3', '4', '5', '6', '7']).valid, false);

assert.deepEqual(OSCILLATION_BANDS.map(band => band.id), ['INTERAREA', 'LOCAL', 'FORCED', 'TORSION_PASSIVE']);
assert.deepEqual(OSCILLATION_BANDS.map(band => band.modeValue), [1, 2, 3, 4]);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'INTERAREA')?.fMin, 0.1);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'INTERAREA')?.fMax, 0.4);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'TORSION_PASSIVE')?.passive, true);
assert.deepEqual(DEFAULT_AMPLITUDE_THRESHOLDS, {
  frequencyMhz: 10,
  voltagePercent: 5,
  activePowerPercent: 5,
  reactivePowerPercent: 5,
});
assert.equal(useOscillationStore.getState().activeSignalTab, 'frequency');
useOscillationStore.getState().setActiveSignalTab('activePower');
assert.equal(useOscillationStore.getState().activeSignalTab, 'activePower');
useOscillationStore.getState().setSelectedSignals(['frequency']);
assert.deepEqual(useOscillationStore.getState().selectedSignals, ['frequency'], 'signal filter should keep only selected metrics');
assert.equal(useOscillationStore.getState().activeSignalTab, 'frequency', 'active signal tab should fall back to the first selected signal');
useOscillationStore.getState().setSelectedSignals(['frequency', 'voltage', 'activePower', 'reactivePower']);
useOscillationStore.getState().setActiveSignalTab('frequency');
assert.equal(useOscillationStore.getState().smoothingSettings.enabled, true);
assert.equal(useOscillationStore.getState().smoothingSettings.windowSize, 7);

const samples = rawYtbsRowsToPmuSamples(realPowerRows.slice(0, 600), temelli);
assert.equal(samples[0].pmuId, '285');
assert.equal(samples[0].activePower, -368.12);
assert.equal(samples[0].reactivePower, -66.01);
assert.equal(samples[0].apparentPower, 374.11);
assert.equal(samples[1].timestampMs - samples[0].timestampMs, 100);
assert.equal(formatPmuTooltipTime(samples[0].timestampMs).endsWith('.000'), true);
assert.equal(formatPmuAxisTime(samples[0].timestampMs + 100).endsWith('.100'), true);
assert.equal(formatPmuAxisTime(samples[0].timestampMs + 900).endsWith('.900'), true);
assert.equal(calculatePmuDataZoomStart(samples.slice(0, 100), 15), 0);
assert.ok(calculatePmuDataZoomStart(samples, 0.2) > 0);
assert.equal(formatPmuDisplayName(temelli), 'TEMELLİ, 400 kV YUNUS EMRE TES');
assert.equal(getNominalVoltageKv(temelli), 400);
assert.equal(convertRawSignalValue(50, 'frequency', 'pu', temelli), 1);
assert.equal(convertRawSignalValue(400, 'voltage', 'pu', temelli), 1);
assert.equal(convertRawSignalValue(399, 'voltage', 'value', temelli), 399);
assert.deepEqual(
  movingAverageTimeSeries([
    [0, 10],
    [100, 20],
    [200, 30],
    [300, 40],
    [400, 50],
  ], 3),
  [
    [0, 15],
    [100, 20],
    [200, 30],
    [300, 40],
    [400, 45],
  ],
);

const analysis = calculateOscillationAnalysis({
  selectionMode: 'single',
  samplesByPmu: new Map([['285', samples]]),
  pmuDevices: [temelli],
  referencePmuId: '285',
  startTime: '2026-05-16T22:00',
  endTime: '2026-05-16T22:10',
  selectedSignals: ['activePower', 'reactivePower'],
  amplitudeThresholds: DEFAULT_AMPLITUDE_THRESHOLDS,
  samplingRateHz: 10,
  windowSeconds: 120,
  stepSeconds: 30,
});

assert.equal(analysis.query.pmuIds[0], '285');
assert.equal(
  Object.hasOwn(analysis.query, 'selectedBands'),
  false,
  'fixed four-band model should not expose the old selectedBands query contract',
);
assert.equal(analysis.dataQuality.totalSamples, samples.length);
assert.ok(analysis.metrics.some(metric => metric.signal === 'activePower' && metric.bandId === 'INTERAREA'));
assert.ok(analysis.metrics.every(metric => metric.dominantFrequencyHz === null || metric.dominantFrequencyHz <= 4.5));
assert.deepEqual(analysis.query.amplitudeThresholds, DEFAULT_AMPLITUDE_THRESHOLDS);
assert.ok(Array.isArray(analysis.windowMetrics), 'analysis should include sliding window metrics');
assert.ok(Array.isArray(analysis.events), 'analysis should include grouped oscillation events');
assert.equal(analysis.commonModes.length >= 0, true);

const syntheticStartMs = new Date('2026-05-16T22:00:00.000Z').getTime();

const dampedSine = Array.from({ length: 1200 }, (_unused, index) => {
  const timeSeconds = index / 10;
  const dampingRatio = 0.05;
  const naturalFrequencyHz = 0.5;
  const omega = 2 * Math.PI * naturalFrequencyHz;
  return Math.exp(-dampingRatio * omega * timeSeconds) * Math.sin(omega * timeSeconds);
});
const dampedRatio = estimateDampingRatio(dampedSine, 10, 0.5);
assert.ok(
  dampedRatio.dampingRatioPercent !== null && Math.abs(dampedRatio.dampingRatioPercent - 5) < 0.6,
  `half-cycle log decrement should return about 5% damping for a 5% damped sine, got ${dampedRatio.dampingRatioPercent}`,
);
const stationaryPeak = estimatePeakAmplitude(
  Array.from({ length: 1800 }, (_unused, index) => 50 + 0.02 * Math.sin(2 * Math.PI * 0.2 * index / 10)),
  10,
  0.1,
  0.4,
);
assert.ok(
  stationaryPeak.dominantFrequencyHz !== null && Math.abs(stationaryPeak.dominantFrequencyHz - 0.2) < 0.01,
  `FFT should locate a stationary 0.2 Hz oscillation, got ${stationaryPeak.dominantFrequencyHz}`,
);
assert.ok(
  stationaryPeak.amplitude !== null && Math.abs(stationaryPeak.amplitude - 0.02) < 0.004,
  `FFT amplitude estimate should stay close to the injected 20 mHz oscillation, got ${stationaryPeak.amplitude}`,
);

const demoPmus: PmuFider[] = [
  temelli,
  {
    ...temelli,
    id: '704',
    name: 'SINCAN, 400 kV DEMO PMU',
    substationName: 'SINCAN',
    bayName: '400 kV DEMO PMU',
  },
];
const demoSamplesByPmu = buildOscillationDemoSamples(demoPmus, syntheticStartMs, 180, 10);
assert.deepEqual(Object.keys(demoSamplesByPmu), ['285', '704']);
assert.equal(demoSamplesByPmu['285'].length, 1800);
assert.equal(demoSamplesByPmu['285'][1].timestampMs - demoSamplesByPmu['285'][0].timestampMs, 100);
(['frequency', 'voltage', 'activePower', 'reactivePower'] as PmuSignalKey[]).forEach(signal => {
  assert.equal(
    demoSamplesByPmu['285'].every(sample => Number.isFinite(sample[signal])),
    true,
    `demo samples should include finite ${signal} values`,
  );
});
const demoAnalysis = calculateOscillationAnalysis({
  selectionMode: 'multi',
  samplesByPmu: new Map(Object.entries(demoSamplesByPmu)),
  pmuDevices: demoPmus,
  referencePmuId: '285',
  startTime: new Date(syntheticStartMs).toISOString(),
  endTime: new Date(syntheticStartMs + 180_000).toISOString(),
  selectedSignals: ['frequency', 'voltage', 'activePower', 'reactivePower'],
  amplitudeThresholds: DEFAULT_AMPLITUDE_THRESHOLDS,
  samplingRateHz: 10,
  windowSeconds: 120,
  stepSeconds: 30,
});
assert.ok(demoAnalysis.windowMetrics.length > 0, 'demo data should produce sliding window metrics');
assert.ok(demoAnalysis.events.some(event => event.signal === 'frequency' && event.mode === 1), 'demo analysis should group frequency interarea windows into an event');
assert.ok(demoAnalysis.events.every(event => event.durationSeconds > 0), 'oscillation events should include positive event duration');
assert.ok(demoAnalysis.windowMetrics.some(metric => metric.mode === 1 && metric.signal === 'frequency'), 'demo data should include interarea frequency mode');
assert.ok(demoAnalysis.windowMetrics.some(metric => metric.mode === 2 && metric.signal === 'activePower'), 'demo data should include local MW mode');
assert.ok(demoAnalysis.windowMetrics.some(metric => metric.mode === 3 && metric.signal === 'reactivePower'), 'demo data should include forced MVAr mode');
assert.ok(demoAnalysis.windowMetrics.some(metric => metric.mode === 4 && metric.passiveTorsion), 'demo data should include passive torsion diagnostics');
assert.equal(PRINT_REPORT_TITLE, 'Salınım Algılayıcı - PMU Modal Analiz ve Raporlama');
assert.deepEqual(PRINT_REPORT_SIGNALS, ['frequency', 'voltage', 'activePower', 'reactivePower']);
assert.deepEqual(PRINT_REPORT_CHART_SLOTS.map(slot => slot.id), ['raw', 'modeDamping', 'energyAmplitude']);
const printSections = buildPrintReportSections(demoAnalysis, demoPmus);
assert.ok(printSections.length > 0, 'PDF report should create detail pages only for detected PMU/signal intervals');
assert.ok(printSections.every(section => section.chartSlots.length === 3), 'each metric PDF page should include raw, mode/DR and energy/amplitude charts');
assert.ok(printSections.every(section => section.pmuId && section.pmuName && section.intervalStartMs < section.intervalEndMs), 'each PDF detail page should identify one PMU and one 30-minute interval');
assert.ok(printSections.every(section => section.events.length > 0), 'PDF detail pages should not be generated for PMU/signal intervals without oscillation events');
assert.ok(printSections.some(section => section.signal === 'frequency' && section.events.some(event => event.mode === 1)), 'frequency PDF page should include interarea oscillation events');

const printIntervalStartMs = syntheticStartMs;
const printIntervalSecondMs = syntheticStartMs + 30 * 60 * 1000;
const makePrintWindowMetric = ({
  pmuId = '285',
  signal = 'frequency',
  timestampMs,
  amplitude,
  thresholdValue,
  dampingRatioPercent,
}: {
  pmuId?: string;
  signal?: PmuSignalKey;
  timestampMs: number;
  amplitude: number;
  thresholdValue: number;
  dampingRatioPercent: number;
}): OscillationWindowMetric => ({
  timestampMs,
  windowStartMs: timestampMs - 30_000,
  windowEndMs: timestampMs + 30_000,
  durationSeconds: 60,
  pmuId,
  signal,
  mode: 1,
  bandId: 'INTERAREA',
  dominantFrequencyHz: 0.2,
  amplitude,
  thresholdValue,
  energyRms: amplitude * 2,
  dampingRatioPercent,
  passiveTorsion: false,
});
const makePrintEvent = ({
  id,
  pmuId = '285',
  signal = 'frequency',
  startMs,
  endMs,
  maxAmplitude,
  minDampingRatioPercent,
}: {
  id: string;
  pmuId?: string;
  signal?: PmuSignalKey;
  startMs: number;
  endMs: number;
  maxAmplitude: number;
  minDampingRatioPercent: number;
}): OscillationEvent => ({
  id,
  pmuId,
  signal,
  mode: 1,
  bandId: 'INTERAREA',
  startMs,
  endMs,
  durationSeconds: Math.round((endMs - startMs) / 1000),
  dominantFrequencyHz: 0.2,
  maxAmplitude,
  maxEnergyRms: maxAmplitude * 2,
  minDampingRatioPercent,
  averageDampingRatioPercent: minDampingRatioPercent,
  hasNegativeDamping: minDampingRatioPercent < 0,
  passiveTorsion: false,
  windowCount: 1,
});
const makePrintBandMetric = (signal: PmuSignalKey, pmuId = '285'): SignalBandMetric => ({
  pmuId,
  signal,
  bandId: 'INTERAREA',
  dominantFrequencyHz: 0.2,
  bandRms: 1.5,
  peakAmplitude: signal === 'frequency' ? 0.025 : 60,
  peakToPeakAmplitude: signal === 'frequency' ? 0.05 : 120,
  spectralEnergy: 3,
  dampingRatioPercent: -1,
  dampingSigma: -0.01,
  classificationLabel: 'TR_INTERAREA_ADAY_MOD',
  dataQualityScore: 1,
});
const printModelResult: OscillationAnalysisResult = {
  ...demoAnalysis,
  query: {
    ...demoAnalysis.query,
    pmuIds: ['285', '704'],
    startTime: new Date(printIntervalStartMs).toISOString(),
    endTime: new Date(printIntervalStartMs + 60 * 60 * 1000).toISOString(),
    selectedSignals: ['frequency', 'activePower', 'reactivePower'],
  },
  metrics: [
    makePrintBandMetric('frequency'),
    makePrintBandMetric('activePower'),
    makePrintBandMetric('reactivePower'),
  ],
  windowMetrics: [
    makePrintWindowMetric({
      timestampMs: printIntervalStartMs + 5 * 60 * 1000,
      amplitude: 0.025,
      thresholdValue: 0.01,
      dampingRatioPercent: -1,
    }),
    makePrintWindowMetric({
      timestampMs: printIntervalSecondMs + 5 * 60 * 1000,
      amplitude: 0.024,
      thresholdValue: 0.01,
      dampingRatioPercent: -0.5,
    }),
    makePrintWindowMetric({
      signal: 'activePower',
      timestampMs: printIntervalStartMs + 10 * 60 * 1000,
      amplitude: 60,
      thresholdValue: 50,
      dampingRatioPercent: -1.5,
    }),
    makePrintWindowMetric({
      signal: 'reactivePower',
      timestampMs: printIntervalStartMs + 12 * 60 * 1000,
      amplitude: 8,
      thresholdValue: 5,
      dampingRatioPercent: 4,
    }),
  ],
  events: [
    makePrintEvent({
      id: 'freq-first',
      startMs: printIntervalStartMs + 3 * 60 * 1000,
      endMs: printIntervalStartMs + 6 * 60 * 1000,
      maxAmplitude: 0.025,
      minDampingRatioPercent: -1,
    }),
    makePrintEvent({
      id: 'freq-second',
      startMs: printIntervalSecondMs + 2 * 60 * 1000,
      endMs: printIntervalSecondMs + 6 * 60 * 1000,
      maxAmplitude: 0.024,
      minDampingRatioPercent: -0.5,
    }),
    makePrintEvent({
      id: 'active-first',
      signal: 'activePower',
      startMs: printIntervalStartMs + 8 * 60 * 1000,
      endMs: printIntervalStartMs + 13 * 60 * 1000,
      maxAmplitude: 60,
      minDampingRatioPercent: -1.5,
    }),
    makePrintEvent({
      id: 'reactive-first',
      signal: 'reactivePower',
      startMs: printIntervalStartMs + 10 * 60 * 1000,
      endMs: printIntervalStartMs + 14 * 60 * 1000,
      maxAmplitude: 8,
      minDampingRatioPercent: 4,
    }),
  ],
};
const intervalPrintSections = buildPrintReportSections(printModelResult, demoPmus);
assert.equal(
  intervalPrintSections.filter(section => section.pmuId === '285' && section.signal === 'frequency').length,
  2,
  '60-minute PDF report should create two 30-minute detail pages for the same oscillating PMU/signal',
);
assert.equal(
  intervalPrintSections.some(section => section.pmuId === '704' || section.signal === 'voltage'),
  false,
  'PDF report should not create detail pages for non-oscillating PMU/signal combinations',
);
assert.ok(intervalPrintSections.every(section => section.pmuName && section.title.includes(section.pmuName)), 'PDF page model should carry PMU name in page metadata');
assert.ok(intervalPrintSections.every(section => section.title.includes(section.signalLabel)), 'PDF page model should carry signal name in page metadata');
assert.ok(intervalPrintSections.some(section => section.signal === 'activePower' && section.thresholdLabel.includes('%5') && section.thresholdLabel.includes('10 MW')), 'active power PDF threshold should mention %5 and minimum 10 MW');
assert.ok(intervalPrintSections.some(section => section.signal === 'reactivePower' && section.thresholdLabel.includes('%5') && section.thresholdLabel.includes('5 MVAr')), 'reactive power PDF threshold should mention %5 and minimum 5 MVAr');
const riskyPrintSection = intervalPrintSections.find(section => section.signal === 'frequency' && section.pageKey.includes('freq')) ?? intervalPrintSections.find(section => section.signal === 'frequency');
assert.ok(riskyPrintSection, 'frequency print section should exist for risk phrase checks');
assert.equal(describePrintEventRisk(riskyPrintSection!, riskyPrintSection!.events[0]), 'kararsızlık riski bulunmaktadır');
const lowAmplitudeSection = intervalPrintSections.find(section => section.signal === 'reactivePower');
assert.ok(lowAmplitudeSection, 'reactive power print section should exist for low-risk phrase checks');
assert.equal(describePrintEventRisk(lowAmplitudeSection!, lowAmplitudeSection!.events[0]), 'küçük ölçekli salınım tespit edildi');
const dampingPrintSeries = buildPrintDampingScatterSeries(intervalPrintSections[0].windowMetrics, intervalPrintSections[0].signal, intervalPrintSections[0].pmuId);
assert.equal(dampingPrintSeries.type, 'scatter', 'Graph 2 print DR series should be rendered as scatter points');
assert.equal(dampingPrintSeries.name, 'DR (%)', 'Graph 2 print DR series name should not repeat the feeder name');
assert.equal(String(dampingPrintSeries.name).includes(intervalPrintSections[0].pmuName), false, 'print chart series names should not repeat feeder name');

useOscillationStore.setState({
  dataSourceMode: 'ytbs',
  rawSamples: samples,
  rawRowsByPmu: { '285': realPowerRows.slice(0, 2) as Array<Record<string, unknown>> },
  samplesByPmu: { '285': samples },
  pmuQueryResults: [{ pmuId: '285', status: 'ok', rawRows: [], completedChunks: 1, totalChunks: 1 }],
  analysisResult: analysis,
  reportMarkdown: 'rapor',
  queryNotice: 'sorgu tamamlandi',
  queryProgress: {
    totalPmus: 1,
    completedPmus: 1,
    currentPmuId: null,
    totalChunks: 1,
    completedChunks: 1,
    currentChunk: null,
  },
  error: 'analiz hatasi',
  activeTab: 'report',
});
useOscillationStore.getState().clearAnalysis();
assert.equal(useOscillationStore.getState().rawSamples.length, samples.length, 'clearAnalysis should keep raw PMU samples');
assert.equal(useOscillationStore.getState().samplesByPmu['285']?.length, samples.length, 'clearAnalysis should keep grouped PMU samples');
assert.equal(useOscillationStore.getState().analysisResult, null, 'clearAnalysis should clear analysis result');
assert.equal(useOscillationStore.getState().reportMarkdown, '', 'clearAnalysis should clear report markdown');
assert.equal(useOscillationStore.getState().error, null, 'clearAnalysis should clear active error');
assert.equal(useOscillationStore.getState().activeTab, 'summary', 'clearAnalysis should return detail tab to summary');

useOscillationStore.setState({
  dataSourceMode: 'ytbs',
  rawSamples: samples,
  rawRowsByPmu: { '285': realPowerRows.slice(0, 2) as Array<Record<string, unknown>> },
  samplesByPmu: { '285': samples },
  pmuQueryResults: [{ pmuId: '285', status: 'ok', rawRows: [], completedChunks: 1, totalChunks: 1 }],
  analysisResult: analysis,
  reportMarkdown: 'rapor',
  queryNotice: 'sorgu tamamlandi',
  queryProgress: {
    totalPmus: 1,
    completedPmus: 1,
    currentPmuId: null,
    totalChunks: 1,
    completedChunks: 1,
    currentChunk: null,
  },
  error: 'sorgu hatasi',
});
useOscillationStore.getState().clearRawData();
assert.equal(useOscillationStore.getState().dataSourceMode, 'none', 'clearRawData should reset data source mode');
assert.equal(useOscillationStore.getState().rawSamples.length, 0, 'clearRawData should clear raw PMU samples');
assert.deepEqual(useOscillationStore.getState().samplesByPmu, {}, 'clearRawData should clear grouped PMU samples');
assert.deepEqual(useOscillationStore.getState().rawRowsByPmu, {}, 'clearRawData should clear raw PMU rows');
assert.deepEqual(useOscillationStore.getState().pmuQueryResults, [], 'clearRawData should clear PMU query results');
assert.equal(useOscillationStore.getState().analysisResult, null, 'clearRawData should clear analysis result');
assert.equal(useOscillationStore.getState().queryNotice, null, 'clearRawData should clear query notice');
assert.equal(useOscillationStore.getState().queryProgress, null, 'clearRawData should clear query progress');
assert.equal(useOscillationStore.getState().error, null, 'clearRawData should clear active error');

useOscillationStore.setState({
  rawSamples: samples,
  samplesByPmu: { '285': samples },
  selectedPmuIds: ['285'],
  referencePmuId: '285',
  analysisResult: analysis,
  reportMarkdown: 'stale',
  activeTab: 'modal',
});
useOscillationStore.getState().setDateRange('2026-05-16T21:00', '2026-05-16T23:00');
assert.equal(useOscillationStore.getState().analysisResult, null, 'date changes should clear stale analysis');
assert.equal(useOscillationStore.getState().reportMarkdown, '', 'date changes should clear stale report');
assert.equal(useOscillationStore.getState().rawSamples.length, 0, 'date changes should clear stale raw data');
assert.deepEqual(useOscillationStore.getState().samplesByPmu, {}, 'date changes should clear grouped stale PMU samples');
assert.equal(useOscillationStore.getState().isRawDataStale, false, 'date changes should leave no stale raw data behind');

useOscillationStore.setState({
  rawSamples: samples,
  samplesByPmu: { '285': samples },
  selectedPmuIds: ['285'],
  referencePmuId: '285',
  analysisResult: analysis,
  reportMarkdown: 'stale',
});
useOscillationStore.getState().setSelectedPmuIds(['704']);
assert.equal(useOscillationStore.getState().analysisResult, null, 'PMU selection changes should clear stale analysis');
assert.equal(useOscillationStore.getState().reportMarkdown, '', 'PMU selection changes should clear stale report');
assert.equal(useOscillationStore.getState().rawSamples.length, 0, 'PMU selection changes should clear stale raw samples');

assert.equal(getFilteredLineColor('dark'), '#ffffff');
assert.equal(getFilteredLineColor('light'), '#000000');
const segmentMetrics: OscillationWindowMetric[] = [
  {
    timestampMs: syntheticStartMs,
    windowStartMs: syntheticStartMs,
    windowEndMs: syntheticStartMs + 100,
    durationSeconds: 0.1,
    pmuId: '285',
    signal: 'frequency',
    mode: 1,
    bandId: 'INTERAREA',
    dominantFrequencyHz: 0.2,
    amplitude: 0.02,
    thresholdValue: 0.01,
    energyRms: 1,
    dampingRatioPercent: -1.8,
    passiveTorsion: false,
  },
  {
    timestampMs: syntheticStartMs + 200,
    windowStartMs: syntheticStartMs + 200,
    windowEndMs: syntheticStartMs + 300,
    durationSeconds: 0.1,
    pmuId: '285',
    signal: 'frequency',
    mode: 1,
    bandId: 'INTERAREA',
    dominantFrequencyHz: 0.21,
    amplitude: 0.02,
    thresholdValue: 0.01,
    energyRms: 1,
    dampingRatioPercent: 2.4,
    passiveTorsion: false,
  },
];
const overlappingMetrics: OscillationWindowMetric[] = [
  {
    timestampMs: syntheticStartMs + 300,
    windowStartMs: syntheticStartMs,
    windowEndMs: syntheticStartMs + 1000,
    durationSeconds: 1,
    pmuId: '285',
    signal: 'frequency',
    mode: 1,
    bandId: 'INTERAREA',
    dominantFrequencyHz: 0.2,
    amplitude: 0.02,
    thresholdValue: 0.01,
    energyRms: 1,
    dampingRatioPercent: 3,
    passiveTorsion: false,
  },
  {
    timestampMs: syntheticStartMs + 700,
    windowStartMs: syntheticStartMs + 400,
    windowEndMs: syntheticStartMs + 1400,
    durationSeconds: 1,
    pmuId: '285',
    signal: 'frequency',
    mode: 1,
    bandId: 'INTERAREA',
    dominantFrequencyHz: 0.2,
    amplitude: 0.02,
    thresholdValue: 0.01,
    energyRms: 1,
    dampingRatioPercent: -2,
    passiveTorsion: false,
  },
];
assert.equal(
  selectDominantWindowMetric(overlappingMetrics, syntheticStartMs + 500, 'frequency', '285')?.dampingRatioPercent,
  -2,
  'overlapping positive/negative windows should prioritize negative damping for shared status',
);
const overlappingSegments = buildFilteredLineSegments(
  [
    [syntheticStartMs + 300, 1],
    [syntheticStartMs + 500, 1.1],
    [syntheticStartMs + 900, 1.2],
  ],
  overlappingMetrics,
  'frequency',
  '285',
  'dark',
);
assert.ok(
  overlappingSegments.some(segment => segment.color === '#ef4444' && segment.data.some(point => point[0] === syntheticStartMs + 500)),
  'filtered line coloring should use the negative damping status in overlapping windows',
);
const filteredSegments = buildFilteredLineSegments(
  [
    [syntheticStartMs, 1],
    [syntheticStartMs + 100, 1.1],
    [syntheticStartMs + 200, 1.2],
    [syntheticStartMs + 300, 1.3],
  ],
  segmentMetrics,
  'frequency',
  '285',
  'dark',
);
assert.ok(filteredSegments.some(segment => segment.color === '#ef4444' && segment.data.some(point => point[1] !== null)), 'negative DR segments should be red');
assert.ok(filteredSegments.some(segment => segment.color === '#22c55e' && segment.data.some(point => point[1] !== null)), 'positive DR segments should be green');
assert.ok(filteredSegments.some(segment => segment.color === '#ffffff' && segment.lineStyle.type === 'solid'), 'filtered base line should be a solid theme line');
assert.ok(filteredSegments
  .filter(segment => segment.kind !== 'base')
  .every(segment => segment.data.every(point => point[1] !== null)), 'colored overlay segments should be continuous so zoom does not drop sparse null-only series');
const dampingScatterData = buildDampingScatterData(segmentMetrics, {
  negative: '#ef4444',
  nonNegative: '#22c55e',
});
assert.equal(dampingScatterData.length, 2, 'DR scatter should include only valid damping points');
assert.equal(dampingScatterData[0].symbol, 'circle', 'DR should be drawn as circle points, not a line');
assert.equal(dampingScatterData[0].value[1], -1.8);
assert.equal(dampingScatterData[0].itemStyle.color, '#ef4444');
assert.equal(dampingScatterData[1].itemStyle.color, '#22c55e');
assert.equal(formatGkcHealthLabel(formatPmuDisplayName(temelli), 'fail').startsWith('🔴 '), true, 'PMU selection labels should reuse GKÇ health dots');
const dampingTooltip = buildDampingTooltipPayload({
  metric: segmentMetrics[0],
  pmuName: 'TEMELLI, 400 kV YUNUS EMRE TES',
  modeLabel: 'Mod 1',
  windowSeconds: 120,
  stepSeconds: 30,
});
assert.equal(dampingTooltip.frequencyHz, 0.2);
assert.ok(dampingTooltip.frequencyText.includes('Hz'), 'DR tooltip payload should include oscillation frequency text');
assert.equal(dampingTooltip.frequencyText.includes('Salınım frekansı'), true, 'DR tooltip should use correct Turkish characters');
assert.ok(dampingTooltip.windowText.includes('120 sn'), 'DR tooltip should include analysis window size');
assert.ok(dampingTooltip.stepText.includes('30 sn'), 'DR tooltip should include analysis step size');
assert.ok(dampingTooltip.centerTimeText.includes('Merkez'), 'DR tooltip should include the analysis center time');
assert.ok(dampingTooltip.amplitudeText.includes('Genlik'), 'DR tooltip should include the measured amplitude');
assert.ok(dampingTooltip.thresholdText.includes('Eşik'), 'DR tooltip should include the threshold used for classification');
assert.ok(dampingTooltip.energyText.includes('RMS'), 'DR tooltip should include RMS/energy information');
assert.equal(
  extractAxisPointerTimestamp({ axesInfo: [{ axisDim: 'x', value: syntheticStartMs + 500 }] }),
  syntheticStartMs + 500,
  'mode chart hover should expose an x-axis timestamp that can synchronize the raw signal tooltip',
);
assert.equal(
  extractAxisPointerTimestamp({ axesInfo: [{ axisDim: 'y', value: 1 }] }),
  null,
  'tooltip synchronization should ignore non-time axis pointer events',
);

const groupedEvents = buildOscillationEvents(segmentMetrics, 120, 30);
assert.equal(groupedEvents.length, 1, 'adjacent active windows should be grouped into a single oscillation event');
assert.equal(groupedEvents[0].durationSeconds > 0, true, 'grouped event should report oscillation duration');
assert.equal(groupedEvents[0].hasNegativeDamping, true, 'grouped event should flag negative damping');
const eventDetails = buildOscillationEventDetails({
  event: groupedEvents[0],
  samples: demoSamplesByPmu['285'],
  windowMetrics: segmentMetrics,
});
assert.ok(eventDetails.rawRows.length > 0, 'event details should include raw rows for the selected event interval');
assert.equal(eventDetails.rawRows.every(row => row.timestampMs >= groupedEvents[0].startMs && row.timestampMs <= groupedEvents[0].endMs), true, 'event details should include only raw rows inside the selected event interval');
assert.equal(eventDetails.windowRows.length, 2, 'event details should include calculation windows for the selected event');
assert.equal(eventDetails.windowRows[0].signal, 'frequency', 'event details should keep the signal associated with the selected event');
assert.equal(humanizeClassification('MOD_YOK'), 'Salınım yok');
assert.equal(humanizeClassification('TR_INTERAREA_ADAY_MOD'), 'Bölgeler arası salınım adayı');
const decisionSentences = buildDecisionSupportSentences({
  result: { ...demoAnalysis, events: groupedEvents },
  pmuDevices: [temelli],
});
assert.ok(decisionSentences.some(sentence => sentence.includes('Bölgeler Arası') && sentence.includes('salınım aday bulgusu')), 'decision support should explain detected interarea oscillations in operator language');
assert.ok(decisionSentences.some(sentence => sentence.includes('Frekans ölçümünde')), 'decision support should name the signal where oscillation is detected');

const progressMessages: number[] = [];
await runAnalysisInWorker({
  selectionMode: 'single',
  samplesByPmuEntries: [['285', demoSamplesByPmu['285']]],
  pmuDevices: [temelli],
  referencePmuId: '285',
  startTime: new Date(syntheticStartMs).toISOString(),
  endTime: new Date(syntheticStartMs + 180_000).toISOString(),
  selectedSignals: ['frequency'],
  amplitudeThresholds: DEFAULT_AMPLITUDE_THRESHOLDS,
  samplingRateHz: 10,
  windowSeconds: 120,
  stepSeconds: 30,
}, progress => progressMessages.push(progress.percent));
assert.ok(progressMessages[0] > 0, 'analysis worker should report initial progress');
assert.equal(progressMessages.at(-1), 100, 'analysis worker should report completion progress');

const makeSyntheticSamples = ({
  pmuId,
  signal,
  base,
  amplitude,
  oscillationHz,
  seconds = 180,
  samplingRateHz = 10,
}: {
  pmuId: string;
  signal: PmuSignalKey;
  base: number;
  amplitude: number;
  oscillationHz: number;
  seconds?: number;
  samplingRateHz?: number;
}): PmuSample[] => Array.from({ length: seconds * samplingRateHz }, (_unused, index) => {
  const timestampMs = syntheticStartMs + index * 1000 / samplingRateHz;
  const value = base + amplitude * Math.sin(2 * Math.PI * oscillationHz * index / samplingRateHz);
  return {
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    pmuId,
    frequency: signal === 'frequency' ? value : 50,
    voltage: signal === 'voltage' ? value : 400,
    activePower: signal === 'activePower' ? value : 1000,
    reactivePower: signal === 'reactivePower' ? value : 100,
  };
});

const makeIntermittentOscillationSamples = ({
  pmuId,
  signal,
  base,
  amplitude,
  oscillationHz,
  activeSeconds,
  seconds,
  samplingRateHz = 10,
}: {
  pmuId: string;
  signal: PmuSignalKey;
  base: number;
  amplitude: number;
  oscillationHz: number;
  activeSeconds: number;
  seconds: number;
  samplingRateHz?: number;
}): PmuSample[] => Array.from({ length: seconds * samplingRateHz }, (_unused, index) => {
  const timestampMs = syntheticStartMs + index * 1000 / samplingRateHz;
  const timeSeconds = index / samplingRateHz;
  const value = base + (timeSeconds <= activeSeconds ? amplitude * Math.sin(2 * Math.PI * oscillationHz * timeSeconds) : 0);
  return {
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    pmuId,
    frequency: signal === 'frequency' ? value : 50,
    voltage: signal === 'voltage' ? value : 400,
    activePower: signal === 'activePower' ? value : 1000,
    reactivePower: signal === 'reactivePower' ? value : 100,
  };
});

const analyzeSynthetic = (syntheticSamples: PmuSample[], signal: PmuSignalKey) => calculateOscillationAnalysis({
  selectionMode: 'single',
  samplesByPmu: new Map([[syntheticSamples[0].pmuId, syntheticSamples]]),
  pmuDevices: [{ ...temelli, id: syntheticSamples[0].pmuId }],
  referencePmuId: syntheticSamples[0].pmuId,
  startTime: new Date(syntheticStartMs).toISOString(),
  endTime: new Date(syntheticStartMs + syntheticSamples.length * 100).toISOString(),
  selectedSignals: [signal],
  amplitudeThresholds: DEFAULT_AMPLITUDE_THRESHOLDS,
  samplingRateHz: 10,
  windowSeconds: 120,
  stepSeconds: 30,
});

const coherenceSamples = (pmuId: string, phaseRadians: number, noise = false): PmuSample[] => {
  let seed = 17;
  return Array.from({ length: 600 }, (_unused, index) => {
    const timestampMs = syntheticStartMs + index * 100;
    seed = (seed * 48271) % 0x7fffffff;
    const noiseValue = ((seed / 0x7fffffff) - 0.5) * 0.08;
    const value = noise
      ? 50 + noiseValue
      : 50 + 0.02 * Math.sin(2 * Math.PI * 0.2 * index / 10 + phaseRadians);
    return {
      timestamp: new Date(timestampMs).toISOString(),
      timestampMs,
      pmuId,
      frequency: value,
      voltage: 400,
      activePower: 1000,
      reactivePower: 100,
    };
  });
};
const coherenceMatrix = buildCoherenceMatrix(
  new Map([
    ['A', coherenceSamples('A', 0)],
    ['B', coherenceSamples('B', Math.PI / 2)],
    ['C', coherenceSamples('C', 0, true)],
  ]),
  ['A', 'B', 'C'],
  'frequency',
  0.2,
  10,
);
assert.ok((coherenceMatrix.find(cell => cell.sourcePmuId === 'A' && cell.targetPmuId === 'B')?.value ?? 0) > 0.8, 'magnitude-squared coherence should stay high for phase-shifted same-frequency signals');
assert.ok((coherenceMatrix.find(cell => cell.sourcePmuId === 'A' && cell.targetPmuId === 'C')?.value ?? 1) < 0.6, 'magnitude-squared coherence should stay low for unrelated signals at the dominant frequency');

const frequencyInterarea = analyzeSynthetic(
  makeSyntheticSamples({ pmuId: 'FREQ', signal: 'frequency', base: 50, amplitude: 0.012, oscillationHz: 0.2 }),
  'frequency',
);
assert.ok(frequencyInterarea.windowMetrics.some(metric =>
  metric.signal === 'frequency'
  && metric.mode === 1
  && metric.bandId === 'INTERAREA'
  && metric.amplitude !== null
  && metric.amplitude > metric.thresholdValue
), '12 mHz frequency oscillation should exceed 10 mHz threshold as interarea mode');
assert.equal(frequencyInterarea.metrics.every(metric => metric.signal === 'frequency'), true, 'analysis should only produce metrics for selected signals');
assert.equal(frequencyInterarea.windowMetrics.every(metric => metric.signal === 'frequency'), true, 'window analysis should only produce selected signal metrics');

const intermittentFrequencyInterarea = analyzeSynthetic(
  makeIntermittentOscillationSamples({
    pmuId: 'FREQ_INTERMITTENT',
    signal: 'frequency',
    base: 50,
    amplitude: 0.025,
    oscillationHz: 0.2,
    activeSeconds: 360,
    seconds: 1800,
  }),
  'frequency',
);
assert.ok(intermittentFrequencyInterarea.windowMetrics.some(metric =>
  metric.signal === 'frequency'
  && metric.mode === 1
  && metric.amplitude !== null
  && metric.amplitude > metric.thresholdValue
), 'intermittent 25 mHz frequency oscillation should be detected by sliding-window FFT');
assert.ok(intermittentFrequencyInterarea.metrics.some(metric =>
  metric.signal === 'frequency'
  && metric.bandId === 'INTERAREA'
  && metric.classificationLabel !== 'MOD_YOK'
), 'signal-based analysis should promote a band to mode when sliding-window FFT finds sustained oscillation in that band');
assert.ok(intermittentFrequencyInterarea.commonModes.some(mode =>
  mode.bandId === 'INTERAREA'
  && mode.dominantSignal === 'frequency'
), 'modal analysis should receive signal-based modes promoted from active windows');

const activePowerLocal = analyzeSynthetic(
  makeSyntheticSamples({ pmuId: 'MW', signal: 'activePower', base: 1000, amplitude: 60, oscillationHz: 1 }),
  'activePower',
);
assert.ok(activePowerLocal.windowMetrics.some(metric =>
  metric.signal === 'activePower'
  && metric.mode === 2
  && metric.bandId === 'LOCAL'
  && metric.thresholdValue >= 49.5
  && metric.thresholdValue <= 50.5
  && metric.amplitude !== null
  && metric.amplitude > metric.thresholdValue
), '60 MW local oscillation should exceed 5% of 1000 MW window mean');

const activePowerNearZero = analyzeSynthetic(
  makeSyntheticSamples({ pmuId: 'MW_ZERO', signal: 'activePower', base: 0, amplitude: 12, oscillationHz: 1 }),
  'activePower',
);
assert.ok(activePowerNearZero.windowMetrics.some(metric =>
  metric.signal === 'activePower'
  && metric.thresholdValue >= 10
  && metric.thresholdValue <= 10.1
), 'active power threshold should be floored at 10 MW when mean is near zero');

const reactivePowerNearZero = analyzeSynthetic(
  makeSyntheticSamples({ pmuId: 'MVAR_ZERO', signal: 'reactivePower', base: 0, amplitude: 7, oscillationHz: 1 }),
  'reactivePower',
);
assert.ok(reactivePowerNearZero.windowMetrics.some(metric =>
  metric.signal === 'reactivePower'
  && metric.thresholdValue >= 5
  && metric.thresholdValue <= 5.1
), 'reactive power threshold should be floored at 5 MVAr when mean is near zero');

const belowThreshold = analyzeSynthetic(
  makeSyntheticSamples({ pmuId: 'QUIET', signal: 'frequency', base: 50, amplitude: 0.005, oscillationHz: 0.2 }),
  'frequency',
);
assert.ok(belowThreshold.windowMetrics.some(metric =>
  metric.signal === 'frequency'
  && metric.mode === 0
  && metric.bandId === null
  && metric.amplitude !== null
  && metric.amplitude < metric.thresholdValue
), '5 mHz frequency oscillation should stay below 10 mHz threshold');

const passiveTorsion = analyzeSynthetic(
  makeSyntheticSamples({ pmuId: 'TORSION', signal: 'frequency', base: 50, amplitude: 0.02, oscillationHz: 4.7 }),
  'frequency',
);
assert.ok(passiveTorsion.windowMetrics.some(metric =>
  metric.signal === 'frequency'
  && metric.mode === 4
  && metric.bandId === 'TORSION_PASSIVE'
  && metric.passiveTorsion
), '4.5-5.0 Hz peak should be rendered as passive torsion diagnostic');

const calls: string[] = [];
const sequential = await fetchSequentialPmuRawData({
  pmuIds: ['285', '704'],
  startIso: '2026-05-16T22:00',
  endIso: '2026-05-16T23:01',
  gerilimByPmuId: new Map([
    ['285', '380'],
    ['704', '380'],
  ]),
  fazId: '',
  invokeRange: async request => {
    calls.push(`${request.deviceId}:${request.startTime}-${request.endTime}`);
    return {
      data: [],
      raw_json: JSON.stringify(request.deviceId === '285' ? realPowerRows.slice(0, 3) : []),
    };
  },
});

assert.deepEqual(calls.map(call => call.split(':')[0]), ['285', '285', '285', '704', '704', '704']);
assert.equal(sequential.pmuResults.find(result => result.pmuId === '285')?.rawRows.length, 3);
assert.equal(sequential.pmuResults.find(result => result.pmuId === '704')?.status, 'empty');
