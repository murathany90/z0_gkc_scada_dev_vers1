import assert from 'node:assert/strict';
import { zipSync } from 'fflate';
import { createBenchmarkFixtureArchive } from './fixtures/benchmarkFixture.ts';
import { buildEpisodeComparisons, buildOscillationBenchmarkResult, compareSasAndGkcEvents, nearestPmuSample, sasRawMatchToleranceMs, sortPmuSamplesByTimestamp } from '../src/features/oscillation/benchmark/benchmarkEngine.ts';
import { formatBenchmarkTimestamp } from '../src/features/oscillation/benchmark/benchmarkTime.ts';
import { SasImportError, importSasEventZip } from '../src/features/oscillation/benchmark/sasEventImporter.ts';
import { resamplePmuToTenHz } from '../src/features/oscillation/benchmark/resamplePmu.ts';
import { calculateOscillationAnalysis } from '../src/features/oscillation/utils/oscillationMetrics.ts';
import type { OscillationAmplitudeThresholds, OscillationEvent, PmuFider, PmuSample } from '../src/features/oscillation/types/oscillationTypes.ts';

// Kept fully inside the repository: a clean clone does not require the optional reference ZIP.
const imported = importSasEventZip(createBenchmarkFixtureArchive(), 'benchmark-fixture.zip');
assert.equal(imported.pmuSamples.length, 1_000);
assert.equal(imported.externalEvents.length, 2, 'ACTIVE spans must be imported as two SAS events');
assert.equal(imported.quality.pmu.medianIntervalMs, 20, 'SAS PMU timestamps remain 20 ms / 50 Hz');
assert.equal(imported.quality.pmu.sampleRateHz, 50);
assert.ok(imported.quality.findings.some(finding => finding.code === 'CENTER_FREQUENCY_OFFSET_50HZ'), '+50 Hz centre anomaly must be reported, never silently corrected');

const resampled = resamplePmuToTenHz(imported.pmuSamples);
assert.equal(resampled.decimationFactor, 5);
assert.equal(resampled.targetRateHz, 10);
assert.equal(resampled.samples[1].timestampMs - resampled.samples[0].timestampMs, 100, 'FIR output must retain 100 ms timestamps');
assert.ok(resampled.firTapCount >= 21 && resampled.antiAliasCutoffHz < 5, 'an explicit anti-alias FIR must precede downsampling');

const highFrequencySource: PmuSample[] = Array.from({ length: 500 }, (_unused, index) => {
  const timestampMs = 1_700_000_000_000 + index * 20;
  return { timestamp: new Date(timestampMs).toISOString(), timestampMs, pmuId: 'synthetic-50hz', frequency: 50 + Math.sin(2 * Math.PI * 8 * index / 50 + Math.PI / 4) };
});
const highFrequencyOutputPeak = Math.max(...resamplePmuToTenHz(highFrequencySource).samples.map(sample => Math.abs((sample.frequency ?? 50) - 50)));
assert.ok(highFrequencyOutputPeak < 0.25, '8 Hz content must be attenuated; blind every-fifth sampling is rejected');

assert.equal(formatBenchmarkTimestamp(Date.UTC(2026, 7, 7, 8, 33, 43, 800), 'local'), '07.08.2026 11:33:43.800');
assert.equal(formatBenchmarkTimestamp(Date.UTC(2026, 7, 7, 8, 33, 43, 800), 'utc'), '07.08.2026 08:33:43.800');
const matched = nearestPmuSample(imported.pmuSamples, imported.pmuSamples[10].timestampMs, sasRawMatchToleranceMs(imported.pmuSamples));
assert.equal(matched.exact, true, 'exact PMU timestamps must match exactly');
assert.equal(nearestPmuSample([imported.pmuSamples[0], imported.pmuSamples[2]], imported.pmuSamples[1].timestampMs, sasRawMatchToleranceMs(imported.pmuSamples)).sample, null, 'a timestamp inside a PMU gap must not be filled by a row-index match');

const at = 1_700_100_000_000;
const gkcEvent = (id: string, startMs: number, endMs: number): OscillationEvent => ({
  id, pmuId: 'SAS-PMU', signal: 'frequency', mode: 1, bandId: 'INTERAREA', startMs, endMs,
  durationSeconds: (endMs - startMs) / 1000, dominantFrequencyHz: 0.14, maxAmplitude: 0.012, maxEnergyRms: 0.01,
  minDampingRatioPercent: -1, averageDampingRatioPercent: -0.5, hasNegativeDamping: true, passiveTorsion: false, windowCount: 1,
});
const sasEvents = [
  { ...imported.externalEvents[0], id: 'match-sas', startMs: at, endMs: at + 10_000 },
  { ...imported.externalEvents[0], id: 'near-sas', startMs: at + 30_000, endMs: at + 40_000 },
  { ...imported.externalEvents[1], id: 'miss-sas', startMs: at + 70_000, endMs: at + 80_000 },
];
const eventRows = compareSasAndGkcEvents(sasEvents, [
  gkcEvent('match-gkc', at + 1_000, at + 11_000),
  gkcEvent('near-gkc', at + 45_000, at + 55_000),
  gkcEvent('extra-gkc', at + 200_000, at + 210_000),
]);
assert.deepEqual(eventRows.map(row => row.status).sort(), ['extra', 'match', 'missed', 'near-miss']);
assert.equal(eventRows.find(row => row.status === 'near-miss')?.overlapDurationSeconds, 0, 'zero overlap can only be NEAR-MISS');
assert.equal(eventRows.filter(row => row.status === 'match').length, 1, 'near misses never count as strict matches');
const episodes = buildEpisodeComparisons([sasEvents[0], sasEvents[1]], [gkcEvent('episode', at, at + 60_000)], 'SAS-PMU');
assert.equal(episodes[0]?.sasEvents.length, 2, 'one GKÇ detection episode may cover multiple SAS ACTIVE bursts');

const benchmarkPmu: PmuFider = { id: 'SAS-PMU', name: 'SAS Benchmark PMU', isPmu: true };
const syntheticTenHz: PmuSample[] = Array.from({ length: 1_800 }, (_unused, index) => {
  const timestampMs = at + index * 100;
  const seconds = index / 10;
  return { timestamp: new Date(timestampMs).toISOString(), timestampMs, pmuId: benchmarkPmu.id, frequency: 50 + 0.008 * Math.sin(2 * Math.PI * 0.1318359375 * seconds) };
});
const thresholds = (frequencyMhz: number): OscillationAmplitudeThresholds => ({ frequencyMhz, voltagePercent: 1, activePowerPercent: 1, reactivePowerPercent: 1 });
const analyse = (frequencyMhz: number) => calculateOscillationAnalysis({
  selectionMode: 'single', samplesByPmu: new Map([[benchmarkPmu.id, syntheticTenHz]]), pmuDevices: [benchmarkPmu], referencePmuId: benchmarkPmu.id,
  startTime: syntheticTenHz[0].timestamp, endTime: syntheticTenHz[syntheticTenHz.length - 1].timestamp,
  selectedSignals: ['frequency'], amplitudeThresholds: thresholds(frequencyMhz), samplingRateHz: 10, windowSeconds: 60, stepSeconds: 10,
});
const sixMhz = analyse(6);
const tenMhz = analyse(10);
const sixMhzFrequencyEvents = sixMhz.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA');
assert.ok(sixMhzFrequencyEvents.length > 0, '6 mHz store threshold must produce the expected benchmark detection');
assert.equal(tenMhz.events.filter(event => event.signal === 'frequency' && event.bandId === 'INTERAREA').length, 0, '10 mHz must not be silently substituted for a 6 mHz store setting');
const dominant = sixMhz.metrics.find(metric => metric.signal === 'frequency' && metric.bandId === 'INTERAREA')?.dominantFrequencyHz;
assert.ok(dominant !== null && dominant !== undefined && Math.abs(dominant - 0.1318359375) < 0.01, 'reference dominant frequency must remain approximately 0.131836 Hz');
const benchmark = buildOscillationBenchmarkResult({
  imported,
  resample: resampled,
  gkcAnalysis: sixMhz,
  gkcInputSamples: syntheticTenHz,
  mode: 'same-raw',
  analysisConfig: { samplingRateHz: 10, windowSeconds: 60, stepSeconds: 10, amplitudeThresholds: thresholds(6), selectedSignals: ['frequency'], pmuId: benchmarkPmu.id },
});
assert.equal(benchmark.analysisConfig.amplitudeThresholds.frequencyMhz, 6, 'benchmark result must retain user/store threshold');
assert.equal(sortPmuSamplesByTimestamp(syntheticTenHz).length, syntheticTenHz.length);

const unsafeZip = zipSync({ '../algo.csv': new TextEncoder().encode('timestamp\n2026-01-01T00:00:00Z\n') });
assert.throws(() => importSasEventZip(unsafeZip), (error: unknown) => error instanceof SasImportError && error.code === 'ZIP_SLIP_REJECTED');

console.log(JSON.stringify({ fixtureSasEvents: imported.externalEvents.length, sixMhzEvents: sixMhzFrequencyEvents.length, tenMhzEvents: tenMhz.events.length, dominantInterareaHz: dominant, strictMatched: benchmark.matchedCount, nearMiss: benchmark.nearMissCount }, null, 2));
