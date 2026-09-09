import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { zipSync } from 'fflate';
import { DEFAULT_AMPLITUDE_THRESHOLDS } from '../src/features/oscillation/utils/bands.ts';
import { calculateOscillationAnalysis } from '../src/features/oscillation/utils/oscillationMetrics.ts';
import { buildOscillationBenchmarkResult, compareSasAndGkcEvents } from '../src/features/oscillation/benchmark/benchmarkEngine.ts';
import { SasImportError, importSasEventZip } from '../src/features/oscillation/benchmark/sasEventImporter.ts';
import { resamplePmuToTenHz } from '../src/features/oscillation/benchmark/resamplePmu.ts';
import type { OscillationEvent, PmuFider, PmuSample } from '../src/features/oscillation/types/oscillationTypes.ts';

const referenceArchive = resolve(process.cwd(), '../../../SAS_Event_i_da_20260807_113342_17ee39d7_20260807.zip');
assert.ok(existsSync(referenceArchive), `reference SAS archive must exist at ${referenceArchive}`);

const imported = importSasEventZip(new Uint8Array(readFileSync(referenceArchive)), 'reference SAS archive');
assert.equal(imported.pmuSamples.length, 10_492, 'reference pmu.csv should be completely imported');
assert.equal(imported.externalEvents.length, 2, 'ACTIVE spans should become two external SAS events');
assert.ok(imported.externalEvents.every(event => Math.abs((event.targetFrequencyHz ?? 0) - 0.14) < 1e-8), 'f_tgt_hz should be preserved as the external target frequency');
assert.ok(imported.externalEvents.every(event => event.hasNegativeDamping), 'reference ACTIVE events should preserve negative damping');
assert.equal(imported.quality.pmu.medianIntervalMs, 20, 'reference pmu.csv should retain its 20 ms spacing');
assert.equal(imported.quality.pmu.sampleRateHz, 50, 'reference pmu.csv should be 50 Hz');
assert.ok(imported.quality.findings.some(finding => finding.code === 'CENTER_FREQUENCY_OFFSET_50HZ'), 'the +50 Hz centre frequency anomaly must be reported, not corrected');
assert.equal(imported.pmuSamples[0].frequency?.toFixed(6), '49.966087');
assert.ok((imported.pmuSamples[0].activePower ?? 0) > 100, 'three-phase PMU phasors should map to active MW');

const resampled = resamplePmuToTenHz(imported.pmuSamples);
assert.equal(resampled.decimationFactor, 5);
assert.equal(resampled.targetRateHz, 10);
assert.equal(resampled.samples.length, 2_099, '50 Hz input should become a 10 Hz sequence without dropping the tail');
assert.equal(resampled.samples[1].timestampMs - resampled.samples[0].timestampMs, 100, 'resample output must retain 100 ms timestamps');
assert.ok(resampled.firTapCount >= 21 && resampled.antiAliasCutoffHz < 5, 'an explicit anti-alias FIR must precede decimation');

const highFrequencySource: PmuSample[] = Array.from({ length: 500 }, (_unused, index) => {
  const timestampMs = 1_700_000_000_000 + index * 20;
  return {
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    pmuId: 'synthetic-50hz',
    frequency: 50 + Math.sin(2 * Math.PI * 8 * index / 50 + Math.PI / 4),
  };
});
const highFrequencyResample = resamplePmuToTenHz(highFrequencySource);
const highFrequencyOutputPeak = Math.max(...highFrequencyResample.samples.map(sample => Math.abs((sample.frequency ?? 50) - 50)));
assert.ok(highFrequencyOutputPeak < 0.25, '8 Hz content should be attenuated before the 10 Hz output; this must not be blind every-fifth selection');

const benchmarkPmu: PmuFider = { id: 'SAS-PMU', name: 'SAS Benchmark PMU', isPmu: true };
const gkcAnalysis = calculateOscillationAnalysis({
  selectionMode: 'single',
  samplesByPmu: new Map([[benchmarkPmu.id, resampled.samples]]),
  pmuDevices: [benchmarkPmu],
  referencePmuId: benchmarkPmu.id,
  startTime: new Date(resampled.samples[0].timestampMs).toISOString(),
  endTime: new Date(resampled.samples[resampled.samples.length - 1].timestampMs).toISOString(),
  selectedSignals: ['frequency'],
  amplitudeThresholds: DEFAULT_AMPLITUDE_THRESHOLDS,
  samplingRateHz: 10,
  windowSeconds: 120,
  stepSeconds: 30,
});
assert.ok(gkcAnalysis.metrics.some(metric => metric.bandId === 'INTERAREA' && metric.dominantFrequencyHz !== null && Math.abs(metric.dominantFrequencyHz - 0.14) <= 0.03), '0.14 Hz should remain inside the GKÇ Interarea band after resampling');
const benchmark = buildOscillationBenchmarkResult({ imported, resample: resampled, gkcAnalysis });
assert.equal(benchmark.comparisons.length, benchmark.matchedCount + benchmark.missedCount + benchmark.extraCount);

const at = 1_700_100_000_000;
const gkcEvent = (id: string, startMs: number, endMs: number): OscillationEvent => ({
  id, pmuId: 'SAS-PMU', signal: 'frequency', mode: 1, bandId: 'INTERAREA', startMs, endMs,
  durationSeconds: (endMs - startMs) / 1000, dominantFrequencyHz: 0.14, maxAmplitude: 0.012, maxEnergyRms: 0.01,
  minDampingRatioPercent: -1, averageDampingRatioPercent: -0.5, hasNegativeDamping: true, passiveTorsion: false, windowCount: 1,
});
const matchRows = compareSasAndGkcEvents([
  { ...imported.externalEvents[0], id: 'match-sas', startMs: at, endMs: at + 10_000 },
  { ...imported.externalEvents[1], id: 'miss-sas', startMs: at + 40_000, endMs: at + 50_000 },
], [gkcEvent('match-gkc', at + 1_000, at + 11_000), gkcEvent('extra-gkc', at + 100_000, at + 110_000)]);
assert.deepEqual(matchRows.map(row => row.status).sort(), ['extra', 'match', 'missed'], 'event matcher must distinguish Match, Missed and Extra rows');
assert.equal(matchRows.find(row => row.status === 'match')?.negativeDampingDirectionMatches, true);

const unsafeZip = zipSync({
  '../algo.csv': new TextEncoder().encode('timestamp\n2026-01-01T00:00:00Z\n'),
});
assert.throws(() => importSasEventZip(unsafeZip), (error: unknown) => error instanceof SasImportError && error.code === 'ZIP_SLIP_REJECTED');

console.log(JSON.stringify({
  sasEvents: imported.externalEvents.length,
  gkcInterareaEvents: gkcAnalysis.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA').length,
  matched: benchmark.matchedCount,
  missed: benchmark.missedCount,
  extra: benchmark.extraCount,
  gkcDominantInterareaHz: gkcAnalysis.metrics.find(metric => metric.bandId === 'INTERAREA')?.dominantFrequencyHz,
}, null, 2));
