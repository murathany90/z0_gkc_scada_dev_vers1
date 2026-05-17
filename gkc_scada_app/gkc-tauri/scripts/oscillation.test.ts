import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculateOscillationAnalysis,
  validatePmuSelection,
} from '../src/features/oscillation/utils/oscillationMetrics.ts';
import { rawYtbsRowsToPmuSamples } from '../src/features/oscillation/utils/pmuSamples.ts';
import { fetchSequentialPmuRawData } from '../src/features/oscillation/utils/sequentialQuery.ts';
import { DEFAULT_AMPLITUDE_THRESHOLDS, OSCILLATION_BANDS } from '../src/features/oscillation/utils/bands.ts';
import {
  calculatePmuDataZoomStart,
  formatPmuAxisTime,
  formatPmuTooltipTime,
} from '../src/features/oscillation/components/chartHelpers.ts';
import type { PmuFider, PmuSample, PmuSignalKey } from '../src/features/oscillation/types/oscillationTypes.ts';

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
assert.deepEqual(OSCILLATION_BANDS.map(band => band.modeValue), [2, 1, 3, 4]);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'INTERAREA')?.fMin, 0.1);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'INTERAREA')?.fMax, 0.4);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'TORSION_PASSIVE')?.passive, true);
assert.deepEqual(DEFAULT_AMPLITUDE_THRESHOLDS, {
  frequencyMhz: 10,
  voltagePercent: 2,
  activePowerPercent: 2,
  reactivePowerPercent: 2,
});

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
assert.equal(analysis.dataQuality.totalSamples, samples.length);
assert.ok(analysis.metrics.some(metric => metric.signal === 'activePower' && metric.bandId === 'INTERAREA'));
assert.ok(analysis.metrics.every(metric => metric.dominantFrequencyHz === null || metric.dominantFrequencyHz <= 4.5));
assert.deepEqual(analysis.query.amplitudeThresholds, DEFAULT_AMPLITUDE_THRESHOLDS);
assert.ok(Array.isArray(analysis.windowMetrics), 'analysis should include sliding window metrics');
assert.equal(analysis.commonModes.length >= 0, true);

const syntheticStartMs = new Date('2026-05-16T22:00:00.000Z').getTime();
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
  && metric.mode === 2
  && metric.bandId === 'INTERAREA'
  && metric.amplitude !== null
  && metric.amplitude > metric.thresholdValue
), '12 mHz frequency oscillation should exceed 10 mHz threshold as interarea mode');

const activePowerLocal = analyzeSynthetic(
  makeSyntheticSamples({ pmuId: 'MW', signal: 'activePower', base: 1000, amplitude: 25, oscillationHz: 1 }),
  'activePower',
);
assert.ok(activePowerLocal.windowMetrics.some(metric =>
  metric.signal === 'activePower'
  && metric.mode === 1
  && metric.bandId === 'LOCAL'
  && metric.thresholdValue >= 19.5
  && metric.thresholdValue <= 20.5
  && metric.amplitude !== null
  && metric.amplitude > metric.thresholdValue
), '25 MW local oscillation should exceed 2% of 1000 MW window mean');

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
