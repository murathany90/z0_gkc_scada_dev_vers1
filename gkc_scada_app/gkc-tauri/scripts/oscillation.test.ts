import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculateOscillationAnalysis,
  validatePmuSelection,
} from '../src/features/oscillation/utils/oscillationMetrics.ts';
import { rawYtbsRowsToPmuSamples } from '../src/features/oscillation/utils/pmuSamples.ts';
import { fetchSequentialPmuRawData } from '../src/features/oscillation/utils/sequentialQuery.ts';
import { OSCILLATION_BANDS, validateCustomBand } from '../src/features/oscillation/utils/bands.ts';
import {
  calculatePmuDataZoomStart,
  formatPmuAxisTime,
  formatPmuTooltipTime,
} from '../src/features/oscillation/components/chartHelpers.ts';
import type { PmuFider } from '../src/features/oscillation/types/oscillationTypes.ts';

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

assert.equal(validateCustomBand(0.1, 4.5).valid, true);
assert.equal(validateCustomBand(0.1, 5).valid, false);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'B2')?.primary, true);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'B6')?.enabled, false);
assert.equal(OSCILLATION_BANDS.find(band => band.id === 'B7')?.enabled, false);

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
  selectedBandIds: ['B2', 'B3'],
  samplingRateHz: 10,
  windowSeconds: 120,
  stepSeconds: 30,
});

assert.equal(analysis.query.pmuIds[0], '285');
assert.equal(analysis.dataQuality.totalSamples, samples.length);
assert.ok(analysis.metrics.some(metric => metric.signal === 'activePower' && metric.bandId === 'B2'));
assert.ok(analysis.metrics.every(metric => metric.dominantFrequencyHz === null || metric.dominantFrequencyHz <= 4.5));
assert.equal(analysis.commonModes.length >= 0, true);

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
