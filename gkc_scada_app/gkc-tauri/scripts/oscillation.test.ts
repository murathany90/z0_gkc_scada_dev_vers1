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
  humanizeClassification,
} from '../src/features/oscillation/utils/reportBuilder.ts';
import { runAnalysisInWorker } from '../src/features/oscillation/utils/runAnalysisWorker.ts';
import { useOscillationStore } from '../src/features/oscillation/store/oscillationStore.ts';
import {
  calculatePmuDataZoomStart,
  buildDampingTooltipPayload,
  buildFilteredLineSegments,
  convertRawSignalValue,
  formatPmuAxisTime,
  formatPmuDisplayName,
  formatPmuTooltipTime,
  getFilteredLineColor,
  getNominalVoltageKv,
  movingAverageTimeSeries,
} from '../src/features/oscillation/components/chartHelpers.ts';
import type { OscillationWindowMetric, PmuFider, PmuSample, PmuSignalKey } from '../src/features/oscillation/types/oscillationTypes.ts';

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

const groupedEvents = buildOscillationEvents(segmentMetrics, 120, 30);
assert.equal(groupedEvents.length, 1, 'adjacent active windows should be grouped into a single oscillation event');
assert.equal(groupedEvents[0].durationSeconds > 0, true, 'grouped event should report oscillation duration');
assert.equal(groupedEvents[0].hasNegativeDamping, true, 'grouped event should flag negative damping');
assert.equal(humanizeClassification('MOD_YOK'), 'Salınım yok');
assert.equal(humanizeClassification('TR_INTERAREA_ADAY_MOD'), 'Bölgeler arası salınım adayı');
const decisionSentences = buildDecisionSupportSentences({
  result: { ...demoAnalysis, events: groupedEvents },
  pmuDevices: [temelli],
});
assert.ok(decisionSentences.some(sentence => sentence.includes('Bölgeler Arası') && sentence.includes('salınım tespit edilmiştir')), 'decision support should explain detected interarea oscillations in operator language');

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
